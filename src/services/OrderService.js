// file: src/services/OrderService.js

const { BaseRepository } = require('../db');
const _ = require('lodash');
const { LogError, LogAny } = require('../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../db/models');
const moment = require('moment');
const InventoryService = require('./InventoryService');
const DiscountService = require('./DiscountService');

class OrderService {
    
    /**
     * Kueri 'MAX' generik untuk nomor pesanan, berdasarkan 'order_type'.
     */
    static async generateUniqueOrderNum(req, clientDateString, orderType, transaction) {
        try {
            // clientDateString adalah "2025-11-15T01:47:40"
            // Kita hanya butuh bagian tanggal: "2025-11-15"
            const clientDate_YYYY_MM_DD = clientDateString.split('T')[0];

            // Kueri ini mengonversi 'date' (disimpan di UTC, +00:00) ke 'WIB' (+07:00)
            // SEBELUM membandingkannya dengan tanggal dari klien.
            const query = `
                SELECT MAX(order_num) as maxOrder 
                FROM orders 
                WHERE 
                    DATE(CONVERT_TZ(date, '+00:00', '+07:00')) = ? 
                    AND order_type = ? 
                FOR UPDATE
            `;
            
            const result = await req.app.get('db').sequelize.query(query, { 
                replacements: [clientDate_YYYY_MM_DD, orderType], // Kirim string "2025-11-15"
                type: req.app.get('db').sequelize.QueryTypes.SELECT,
                transaction: transaction,
                lock: transaction.LOCK.UPDATE
            });
            
            if (result && result.length > 0 && result[0].maxOrder) {
                return result[0].maxOrder + 1;
            }
            return 1;
        } catch (err) {
            LogError(__dirname, 'OrderService.generateUniqueOrderNum', err.message);
            throw err;
        }
    }

    /**
     * FUNGSI GENERIK BARU: Create Order
     * Menerapkan transaksi DAN manajemen stok.
     * Payload 'data.order_items' diharapkan:
     * [ { variation_id: 132, quantity: 1, modifier_ids: [1, 2], item_name: "...", item_price: ..., sub_total_price: ... }, ... ]
     */
    static async createOrder(req, data) {
        // Use global sequelize if not passed in req, but prefer req.app.get('db') structure
        const transaction = await sequelize.transaction();
        
        try {
            const db = req.app.get('db');
            if (_.isEmpty(data)) throw new Error('Data is empty');

            // --- 1. SETUP & ORDER ID GENERATION (KEPT YOUR LOGIC) ---
            let userId = req.decoded?.payloadToken?.id || req.user?.id || null;
            const clientDate = new Date(data.date); 
            
            let mm_id = (clientDate.getMonth() + 1).toString().padStart(2, '0');
            let dd_id = clientDate.getDate().toString().padStart(2, '0');
            const dateFormat_id = `${dd_id}${mm_id}${clientDate.getFullYear()}`;
            
            let orderNum = await this.generateUniqueOrderNum(req, data.date, data.order_type, transaction);
            data.order_num = orderNum;
            data.order_id = `${data.order_type}-${dateFormat_id}-${data.order_num}`;
            data.date = clientDate;

            // --- 2. CALCULATION LOOP (KEPT YOUR LOGIC + OPTIMIZED) ---
            let calculatedSubtotal = 0;
            let calculatedTotalTax = 0;
            
            // We store detailed items here to avoid re-fetching DB during insertion phase
            const processedItems = []; 

            for (const item of data.order_items) {
                // A. Securely fetch Price & Tax
                const variation = await db.item_variations.findByPk(item.variation_id, {
                    include: [{
                        model: db.taxes,
                        as: 'taxes',
                        through: { attributes: [] } 
                    }],
                    transaction
                });

                if (!variation) throw new Error(`Variation ID ${item.variation_id} not found`);

                // B. Calc Subtotal
                const itemSubtotal = variation.price * item.quantity;
                calculatedSubtotal += itemSubtotal;

                // C. Calc Tax (Your existing logic)
                if (variation.taxes && variation.taxes.length > 0) {
                    for (const tax of variation.taxes) {
                        if (tax.type === 'PERCENTAGE') {
                            const taxAmount = Math.round(itemSubtotal * (parseFloat(tax.rate) / 100));
                            calculatedTotalTax += taxAmount;
                        } 
                        // Add FIXED logic here if needed in future
                    }
                }

                // Push to array for step 6 (Inventory)
                processedItems.push({
                    inputItem: item,
                    variationDB: variation,
                    subtotal: itemSubtotal
                });
            }

            // --- 3. DISCOUNT PROCESSING (UPGRADED) ---
            // Replaced your old "Section 4" with DiscountService
            
            let totalDiscountAmount = 0;
            const appliedDiscounts = []; // For order_discounts table

            // Check if frontend sent voucherCodes (Array)
            if (data.voucherCodes && Array.isArray(data.voucherCodes) && data.voucherCodes.length > 0) {
                const uniqueCodes = [...new Set(data.voucherCodes)]; // Remove duplicates

                for (const code of uniqueCodes) {
                    // A. Validate
                    const discount = await DiscountService.validateDiscount(req, code, calculatedSubtotal, userId);
                    
                    // B. Calculate
                    const amount = DiscountService.calculateAmount(discount, calculatedSubtotal);
                    
                    // C. Accumulate
                    totalDiscountAmount += amount;

                    // D. Prepare Snapshot
                    appliedDiscounts.push({
                        discount_id: discount.id,
                        name: discount.name,
                        amount: amount,
                        level: 'ORDER'
                    });

                    // E. Increment Usage
                    await DiscountService.incrementUsage(req, discount.id, transaction);
                }
            } 
            // FALLBACK: Keep support for your old single discount_type (Backward Compatibility)
            else if (data.discount_type && data.discount_value > 0) {
                 if (data.discount_type === 'percentage') {
                    totalDiscountAmount = Math.round(calculatedSubtotal * (data.discount_value / 100));
                } else if (data.discount_type === 'fixed') {
                    totalDiscountAmount = data.discount_value;
                }
                // Optional: You might want to log this as a "Manual Discount" in order_discounts table too
            }

            // Safety Cap
            if (totalDiscountAmount > calculatedSubtotal) totalDiscountAmount = calculatedSubtotal;

            // --- 4. FINAL TOTAL (KEPT YOUR FORMULA) ---
            // (Subtotal - Discount) + Tax
            // Note: This assumes Tax is calculated on Gross Sales (Pre-discount). 
            const finalTotal = (calculatedSubtotal - totalDiscountAmount) + calculatedTotalTax;

            // --- 5. INSERT ORDER HEADER (UPDATED FIELDS) ---
            const orderData = {
                order_id: data.order_id,
                order_num: data.order_num,
                order_type: data.order_type,
                date: data.date,
                notes: data.notes,
                status: data.status,
                
                // Financials
                subtotal: calculatedSubtotal,
                discount_amount: totalDiscountAmount, // Updated variable
                total_tax: calculatedTotalTax,
                total: finalTotal,
                
                // Meta
                metode_pembayaran: data.metode_pembayaran,
                member_id: data.member_id,
                user_id: userId
            };

            const createdOrder = await BaseRepository.create(req, orderData, 'orders', { transaction });

            // --- 6. INSERT ORDER DISCOUNTS (NEW) ---
            if (appliedDiscounts.length > 0) {
                const discountRecords = appliedDiscounts.map(d => ({
                    ...d,
                    order_id: createdOrder.dataValues.order_id
                }));
                await db.order_discounts.bulkCreate(discountRecords, { transaction });
            }
            
            // --- 7. INSERT ITEMS & INVENTORY (KEPT YOUR LOGIC) ---
            // Using processedItems array to allow cleaner loop
            for (const pItem of processedItems) {
                const item = pItem.inputItem;
                const quantity = item.quantity;
                const variationId = item.variation_id;
                const modifierIds = item.modifier_ids || [];

                // A. Inventory Service (Variations) - YOUR TRUSTED LOGIC
                await InventoryService.updateStock(req, {
                    variation_id: variationId,
                    type: 'OUT',
                    amount: quantity,
                    notes: `Order #${data.order_num}`
                }, transaction);

                // B. Modifier Stock Check - YOUR TRUSTED LOGIC
                for (const modId of modifierIds) {
                    const modifier = await db.modifiers.findByPk(modId, { transaction, lock: true });
                    if (!modifier) throw new Error(`Modifier ${modId} not found`);
                    
                    if (modifier.track_inventory) {
                        if (modifier.stock_level < quantity) {
                            throw new Error(`Stok modifier ${modifier.name} tidak mencukupi.`);
                        }
                        modifier.stock_level -= (quantity);
                        await modifier.save({ transaction });
                    }
                }

                // C. Insert Order Item
                const createdOrderItem = await BaseRepository.create(req, {
                    order_id: createdOrder.dataValues.order_id,
                    item_variation_id: variationId,
                    item_name: item.item_name, // Or use pItem.variationDB.name to be safer? Stick to input if you trust frontend names
                    item_price: pItem.variationDB.price, // Use DB price, not frontend price
                    sub_total_price: pItem.subtotal,
                    quantity: quantity,
                }, 'order_items', { transaction });

                // D. Insert Modifiers
                for (const modId of modifierIds) {
                    const modifier = await db.modifiers.findByPk(modId, { transaction });
                    await BaseRepository.create(req, {
                        order_item_id: createdOrderItem.dataValues.id,
                        modifier_id: modId,
                        component_name: modifier.name,
                        component_price: modifier.add_price // Or modifier.price depending on your DB column
                    }, 'order_item_modifiers', { transaction });
                }
            }

            await transaction.commit();
            return createdOrder;

        } catch (err) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'OrderService.createOrder', err.message);
            throw err;
        }
    }

    static async calculateOrder(req, data) {
        try {
            const db = req.app.get('db');
            if (_.isEmpty(data)) throw new Error('Data is empty');

            let tempItems = [];
            let grossSubtotal = 0; // Total Kotor sebelum diskon

            for (const item of data.order_items) {
                // A. Ambil Variasi & Pajak
                const variation = await db.item_variations.findByPk(item.variation_id, {
                    include: [{
                        model: db.taxes,
                        as: 'taxes',
                        through: { attributes: [] } 
                    }]
                });

                if (!variation) throw new Error(`Variation ID ${item.variation_id} not found`);

                // B. Hitung Harga Dasar (Variation + Modifiers)
                let unitPrice = variation.price; 

                if (item.modifier_ids && Array.isArray(item.modifier_ids) && item.modifier_ids.length > 0) {
                    const modifiers = await db.modifiers.findAll({
                        where: { id: { [Op.in]: item.modifier_ids } }
                    });
                    for (const mod of modifiers) unitPrice += mod.add_price;
                }

                const lineGross = unitPrice * item.quantity;
                grossSubtotal += lineGross;

                // Simpan ke memory untuk perhitungan pajak nanti
                tempItems.push({
                    name: item.item_name,
                    quantity: item.quantity,
                    gross: lineGross,
                    taxes: variation.taxes || [] // Array object pajak
                });
            }

            // --- STEP 2: CALCULATE GLOBAL DISCOUNT ---
            let totalDiscountAmount = 0;
            const voucherDetails = [];

            if (data.voucherCodes && Array.isArray(data.voucherCodes) && data.voucherCodes.length > 0) {
                // Pastikan unik dan TRIMMING
                const uniqueCodes = [...new Set(data.voucherCodes.map(c => c.trim()))];
                const userId = req.decoded?.payloadToken?.id || null;

                console.log("Processing Vouchers:", uniqueCodes); // DEBUG LOG 1

                for (const code of uniqueCodes) {
                    try {
                        console.log(`Validating Code: ${code}`); // DEBUG LOG 2
                        
                        // Validasi
                        const discount = await DiscountService.validateDiscount(req, code, grossSubtotal, userId);
                        
                        // Hitung
                        const amount = DiscountService.calculateAmount(discount, grossSubtotal);
                        
                        totalDiscountAmount += amount;
                        
                        voucherDetails.push({ 
                            code: code, 
                            amount: amount, 
                            valid: true, 
                            error: null 
                        });
                        console.log(`Code ${code} VALID. Amount: ${amount}`); // DEBUG LOG 3

                    } catch (err) {
                        console.error(`Code ${code} INVALID: ${err.message}`); // DEBUG LOG 4
                        
                        // PENTING: Push status error agar frontend tahu!
                        voucherDetails.push({ 
                            code: code, 
                            amount: 0, 
                            valid: false, 
                            error: err.message || "Voucher tidak valid"
                        });
                    }
                }
            } else {
                 console.log("No Voucher Codes received"); // DEBUG LOG 5
            }

            // Safety: Diskon tidak boleh melebihi subtotal
            if (totalDiscountAmount > grossSubtotal) totalDiscountAmount = grossSubtotal;


            // --- STEP 3: DISTRIBUTE DISCOUNT & CALCULATE TAX (THE ENTERPRISE WAY) ---
            let calculatedTotalTax = 0;
            
            // NOTE: Di Indonesia, Service Charge biasanya masuk sebagai "Tax" dengan nama berbeda di DB
            // atau kolom terpisah. Asumsi di sini: Service Charge adalah salah satu item di tabel `taxes`.
            // Jika Service Charge dan PB1 dipisah logic-nya, kita butuh flag khusus di tabel taxes (misal: is_service_charge).
            
            // Untuk keakuratan akuntansi, kita hitung pajak per item SETELAH diskon dipro-rata.
            
            for (const item of tempItems) {
                if (item.gross <= 0) continue;

                // 1. Hitung porsi diskon untuk item ini (Pro-rata)
                // Rumus: (ItemGross / TotalGross) * TotalDiscount
                const itemWeight = item.gross / grossSubtotal;
                const itemDiscountPortion = totalDiscountAmount * itemWeight;
                
                // 2. Tentukan Dasar Pengenaan Pajak (DPP) / Net Amount per item
                const itemNet = item.gross - itemDiscountPortion;

                // 3. Hitung Pajak dari nilai Net
                if (item.taxes.length > 0) {
                    // Logic Enterprise Indonesia:
                    // PB1 dikenakan atas (Harga Jual - Diskon + Service Charge)
                    // Jika user setup Service Charge sebagai Tax Type juga, maka urutannya:
                    // Kita asumsikan semua tax rate di DB dikalikan dengan ItemNet.
                    // (Ini mencakup SC % dan PB1 % yang berjalan paralel terhadap DPP).
                    
                    // *Advanced Note:* Jika SC kena pajak (tax on tax), logic di bawah perlu penyesuaian sedikit.
                    // Tapi standard umum POS SaaS: SC dan PB1 dihitung dari DPP yg sama, atau PB1 include SC.
                    // Kode ini menggunakan asumsi: Semua pajak dihitung dari (Harga - Diskon).
                    
                    for (const tax of item.taxes) {
                        if (tax.type === 'PERCENTAGE') {
                            const taxValue = itemNet * (parseFloat(tax.rate) / 100);
                            calculatedTotalTax += taxValue;
                        }
                    }
                }
            }

            // Pembulatan Pajak (Standard Accounting: Round Half Up per Document)
            calculatedTotalTax = Math.round(calculatedTotalTax);

            // --- STEP 4: FINAL TOTAL ---
            // Total = (Gross - Diskon) + Pajak
            const finalTotal = (grossSubtotal - totalDiscountAmount) + calculatedTotalTax;

            return {
                subtotal: grossSubtotal,         // Gross
                total_tax: calculatedTotalTax,   // Tax calculated on Net
                discount_amount: totalDiscountAmount,
                total: Math.round(finalTotal),   // Grand Total
                voucher_details: voucherDetails
            };

        } catch (err) {
            LogError(__dirname, 'OrderService.calculateOrder', err.message);
            throw err;
        }
    }

    static async updateOrder(req, data) {
        const transaction = await sequelize.transaction();
        try {
            const db = req.app.get('db');
            if (_.isEmpty(data)) throw new Error('Data is empty');

            const orderId = data.order_id;
            const findOptions = { where: { order_id: orderId }, transaction };
            const getOrderDataArray = await BaseRepository.getDataByOptions(req, 'orders', findOptions);
            
            if (_.isEmpty(getOrderDataArray)) throw new Error(`Order ${orderId} not found`);
            const existingOrder = getOrderDataArray[0];

            if (existingOrder.status === 'paid') throw new Error('Pesanan LUNAS tidak dapat diedit.');
            if (existingOrder.status === 'partial') {
                const totalPaid = await db.order_payments.sum('amount', { where: { order_id: orderId }, transaction }) || 0;
                if (data.total < totalPaid) throw new Error(`Total baru tidak boleh lebih kecil dari pembayaran masuk.`);
            }

            // =========================================================
            // A. KEMBALIKAN STOK LAMA (RESTORE)
            // =========================================================
            const oldItems = await db.order_items.findAll({ where: { order_id: orderId }, transaction });
            for (const item of oldItems) {
                // 1. Restore Variasi via Service (Log IN)
                await InventoryService.updateStock(req, {
                    variation_id: item.item_variation_id,
                    type: 'IN', // Masuk kembali
                    amount: item.quantity,
                    notes: `Revisi Order #${existingOrder.order_num} (Restore)`
                }, transaction);
                
                // 2. Restore Modifier (Manual)
                const oldModifiers = await db.order_item_modifiers.findAll({ where: { order_item_id: item.id }, transaction });
                for (const subItem of oldModifiers) {
                    const modifier = await db.modifiers.findByPk(subItem.modifier_id, { transaction, lock: true });
                    if (modifier && modifier.track_inventory) {
                        modifier.stock_level += item.quantity; 
                        await modifier.save({ transaction });
                    }
                }
            }
            
            await BaseRepository.deleteOrderByOptions(req, 'order_items', { where: { order_id: orderId }, transaction });
            
            // =========================================================
            // B. POTONG STOK BARU (DEDUCT)
            // =========================================================
            for (const item of data.order_items) {
                const variationId = item.variation_id;
                const quantity = item.quantity;
                const modifierIds = item.modifier_ids || [];

                // 1. Deduct Variasi via Service (Log OUT)
                await InventoryService.updateStock(req, {
                    variation_id: variationId,
                    type: 'OUT',
                    amount: quantity,
                    notes: `Revisi Order #${existingOrder.order_num} (Update)`
                }, transaction);

                // 2. Deduct Modifier (Manual)
                for (const modId of modifierIds) {
                    const modifier = await db.modifiers.findByPk(modId, { transaction, lock: true });
                    if (!modifier) throw new Error(`Modifier ${modId} not found`);
                    if (modifier.track_inventory) {
                        if (modifier.stock_level < quantity) throw new Error(`Stok modifier ${modifier.name} tidak mencukupi.`);
                        modifier.stock_level -= quantity;
                        await modifier.save({ transaction });
                    }
                }

                // ... (Create order_items & modifiers logic sama seperti createOrder) ...
                const createdOrderItem = await BaseRepository.create(req, {
                    order_id: orderId,
                    item_variation_id: variationId,
                    item_name: item.item_name,
                    item_price: item.item_price,
                    sub_total_price: item.sub_total_price,
                    quantity: quantity,
                }, 'order_items', { transaction });
                
                for (const modId of modifierIds) {
                    const modifier = await db.modifiers.findByPk(modId, { transaction });
                    await BaseRepository.create(req, {
                        order_item_id: createdOrderItem.dataValues.id,
                        modifier_id: modId,
                        component_name: modifier.name,
                        component_price: modifier.add_price
                    }, 'order_item_modifiers', { transaction });
                }
            }
            
            const { order_items, ...orderData } = data; 
            const options = { where: { order_id: orderId }, transaction: transaction };
            const updatedOrder = await BaseRepository.updateOrderByOptions(req, orderData, 'orders', options);

            await transaction.commit();
            return updatedOrder;

        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'OrderService.updateOrder', error.message);
            throw error;
        }
    }
    
    static async payOrder(req, orderId, paymentMethod) {
        const transaction = await sequelize.transaction();
        try {
            const db = req.app.get('db');
            
            // 1. Temukan pesanan
            const order = await db.orders.findOne({ where: { order_id: orderId }, transaction });
            if (!order) {
                throw new Error('Pesanan tidak ditemukan');
            }

            // 2. Cek apakah sudah dibayar
            if (order.status === 'paid') {
                throw new Error('Pesanan ini sudah dibayar');
            }
            
            // 3. Perbarui pesanan
            const updatedOrder = await BaseRepository.updateOrderByOptions(
                req,
                { 
                    status: 'paid', // Ubah status
                    metode_pembayaran: paymentMethod, // Catat metode bayar
                    dateclosebill: new Date() // Catat waktu lunas
                },
                'orders',
                { where: { order_id: orderId }, transaction }
            );

            await transaction.commit();
            return updatedOrder;

        } catch (err) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'OrderService.payOrder', err.message);
            throw err;
        }
    }
    
    /**
     * FUNGSI GENERIK BARU: Mengambil semua pesanan dengan Eager Loading
     */
    static async getAllOrders(req, options) {
        if(options){
            const db = req.app.get('db');
            
            // Tambahkan 'include' bertingkat DENGAN ALIAS YANG BENAR
            options.include = [
                {
                    model: db.users,
                    as: 'cashier', // Pastikan alias ini sesuai dengan models/Orders.js (biasanya 'user' atau 'cashier')
                    attributes: ['id', 'name'] // Ambil nama saja agar ringan
                },
                {
                    model: db.order_items,
                    as: 'order_items', // (Asosiasi 'Orders.hasMany(models.order_items, { as: "order_items" })')
                    include: [
                        {
                            model: db.order_item_modifiers,
                            as: 'modifiers', // (Asosiasi 'OrderItems.hasMany(models.order_item_modifiers, { as: "modifiers" })')
                            include: [{ 
                                model: db.modifiers,
                                as: 'modifier' // <-- PERBAIKAN: (Asosiasi 'OrderItemModifiers.belongsTo(models.modifiers, { as: "modifier" })')
                            }]
                        },
                        {
                            model: db.item_variations,
                            as: 'variation',
                            include: [
                                {
                                    model: db.taxes, // Use the model name from your definitions
                                    as: 'taxes',   // Default alias based on your 'ItemVariations.js'
                                    attributes: ['id', 'name', 'rate', 'type'],
                                    through: { attributes: [] } 
                                }
                            ]
                        }
                    ]
                },
                {
                    model: db.order_payments,
                    as: 'payments', // Alias sesuai definisi di models/Orders.js
                    attributes: ['id', 'amount', 'payment_method', 'createdAt'] // Ambil yg perlu saja
                }
            ];
            
            const getOrderData = await BaseRepository.getDataByOptions(req, 'orders', options);
            return getOrderData.map(model => model.toJSON());
        }
        LogError(__dirname, 'OrderService.getAllOrders', 'No Options Stated');
        return Promise.reject(new Error('No Options Stated'));
    }

    /**
     * FUNGSI PEMBAYARAN BARU (Mendukung Split Bill & Partial Payment)
     * Payload: { order_id, amount, payment_method, note, reference_id }
     */
    static async addPayment(req, payload) {
        const transaction = await sequelize.transaction();
        try {
            const db = req.app.get('db');
            const { order_id, amount, payment_method, note, reference_id } = payload;

            // 1. Validasi Input
            if (!order_id || !amount || amount <= 0) {
                throw new Error('Order ID dan Amount (positif) diperlukan.');
            }

            // 2. Ambil Data Order saat ini (Lock baris ini untuk mencegah race condition)
            const order = await db.orders.findOne({ 
                where: { order_id: order_id },
                transaction,
                lock: transaction.LOCK.UPDATE 
            });

            if (!order) {
                throw new Error('Pesanan tidak ditemukan.');
            }

            if (order.status === 'paid') {
                throw new Error('Pesanan ini sudah LUNAS sepenuhnya.');
            }

            // 3. Hitung total yang SUDAH dibayar sebelumnya (sebelum pembayaran ini)
            const previousPayments = await db.order_payments.sum('amount', {
                where: { order_id: order_id },
                transaction
            }) || 0;

            const totalTagihan = order.total;
            const sisaTagihan = totalTagihan - previousPayments;

            // 4. Validasi Kelebihan Bayar (Opsional: Bisa diubah jadi kembalian/change)
            // Di sini kita asumsikan 'amount' adalah uang yang DIINPUT kasir untuk memotong tagihan.
            // Jika amount > sisaTagihan, kita anggap itu kembalian, tapi yang dicatat sebagai 'amount'
            // pembayaran maksimal adalah sisa tagihan.
            
            let finalAmountToRecord = amount;
            let changeAmount = 0;

            if (amount > sisaTagihan) {
                // Kasus: Sisa 50rb, bayar pakai 100rb.
                // Rekord di payment: 50rb. Kembalian: 50rb.
                finalAmountToRecord = sisaTagihan;
                changeAmount = amount - sisaTagihan;
            }

            // 5. Buat Record Pembayaran Baru
            const newPayment = await BaseRepository.create(req, {
                order_id: order_id,
                amount: finalAmountToRecord, // Mencatat nominal yang mengurangi hutang
                payment_method: payment_method,
                reference_id: reference_id,
                change_amount: changeAmount, // Mencatat kembalian (jika ada)
                note: note
            }, 'order_payments', { transaction });

            // 6. Cek Status Akhir
            const totalPaidNow = previousPayments + finalAmountToRecord;
            let newStatus = 'partial'; // Default: Belum lunas
            let dateClose = null;

            // Jika (Total Bayar >= Total Tagihan) -> LUNAS
            // (Kita pakai toleransi kecil untuk floating point, meski integer aman)
            if (totalPaidNow >= totalTagihan) {
                newStatus = 'paid';
                dateClose = new Date();
            }

            // 7. Update Status Order Induk
            // Kita juga update 'metode_pembayaran' di order induk.
            // Jika status 'partial', bisa kita isi 'split'. Jika 'paid', isi metode terakhir.
            const updatedOrderData = {
                status: newStatus,
                dateclosebill: dateClose,
                // Opsional: Update metode pembayaran di induk untuk referensi cepat
                metode_pembayaran: (newStatus === 'partial') ? 'partial' : payment_method 
            };

            await BaseRepository.updateOrderByOptions(
                req, 
                updatedOrderData, 
                'orders', 
                { where: { order_id: order_id }, transaction }
            );

            await transaction.commit();

            return {
                payment: newPayment,
                order_status: newStatus,
                total_paid: totalPaidNow,
                remaining_due: totalTagihan - totalPaidNow,
                change: changeAmount
            };

        } catch (err) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'OrderService.addPayment', err.message);
            throw err;
        }
    }

    /**
     * FUNGSI GENERIK BARU: Hapus pesanan
     */
    static async deleteOrderByOptions(req, options){
        const db = req.app.get('db');
        const transaction = await db.sequelize.transaction();
        
        try {
            // 1. Cari Order dulu untuk ambil item-nya
            const ordersToDelete = await db.orders.findAll({ 
                where: options.where,
                include: [{ model: db.order_items, as: 'order_items' }],
                transaction 
            });

            // 2. Kembalikan Stok (Looping Orders -> Looping Items)
            for (const order of ordersToDelete) {
                
                // ❌ HAPUS BARIS INI: 
                // if (order.status === 'paid') continue; 
                // Kita ingin stok KEMBALI meskipun order sudah LUNAS (Refund/Void)

                for (const item of order.order_items) {
                    await InventoryService.updateStock(req, {
                        variation_id: item.item_variation_id,
                        type: 'IN', // Type IN = Stok Kembali
                        amount: item.quantity,
                        notes: `Void Order #${order.order_num} (${order.status})` // Catat status order di notes log
                    }, transaction);
                }
            }

            // 3. Hapus Order
            const deleted = await BaseRepository.deleteOrderByOptions(req, 'orders', { ...options, transaction });
            
            await transaction.commit();
            return deleted;

        } catch (err) {
            await transaction.rollback();
            LogError(__dirname, 'OrderService.deleteOrderByOptions', err.message);
            throw err;
        }
    }

    static async voidOrder(req, orderId, reason, userId) {
        const db = req.app.get('db');
        // Gunakan transaksi agar Inventory dan Order update bersifat atomik
        const transaction = await sequelize.transaction();
        
        try {
            // 1. Ambil Data Order Lengkap (Eager Loading Items & Modifiers)
            const order = await db.orders.findOne({ 
                where: { order_id: orderId },
                include: [
                    {
                        model: db.order_items,
                        as: 'order_items',
                        include: [
                            {
                                model: db.order_item_modifiers, // Pastikan alias sesuai model OrderItems.js
                                as: 'modifiers'
                            }
                        ]
                    }
                ],
                transaction,
                lock: transaction.LOCK.UPDATE // Kunci baris agar tidak ada yang edit saat proses void
            });

            if (!order) throw new Error('Pesanan tidak ditemukan.');

            // 2. Validasi Rules Bisnis
            if (order.status === 'cancelled') {
                throw new Error('Pesanan ini sudah dibatalkan sebelumnya.');
            }
            
            // (Opsional: Jika kebijakan perusahaan melarang void order yg sudah close bill/paid)
            // if (order.status === 'paid') throw new Error('Pesanan LUNAS tidak bisa di-void, lakukan Refund.');

            // 3. Proses Pengembalian Stok (Inventory Restoration)
            if (order.order_items && order.order_items.length > 0) {
                for (const item of order.order_items) {
                    
                    // A. Restore Stok Variasi Utama
                    await InventoryService.updateStock(req, {
                        variation_id: item.item_variation_id,
                        type: 'IN', // IN = Barang Masuk Kembali
                        amount: item.quantity,
                        notes: `Void Order #${order.order_num} (${reason})` // Audit Log di kartu stok
                    }, transaction);

                    // B. Restore Stok Modifier (Jika ada & track_inventory true)
                    if (item.modifiers && item.modifiers.length > 0) {
                        for (const modItem of item.modifiers) {
                            // Cek master modifier untuk status track_inventory
                            const masterModifier = await db.modifiers.findByPk(modItem.modifier_id, { transaction });
                            
                            if (masterModifier && masterModifier.track_inventory) {
                                masterModifier.stock_level += item.quantity; // Kembalikan sesuai qty item induk
                                await masterModifier.save({ transaction });
                            }
                        }
                    }
                }
            }

            // 4. Update Status Order (Soft Delete / Flagging)
            await order.update({
                status: 'cancelled', // Ubah status, JANGAN DIHAPUS
                void_reason: reason,
                voided_by: userId,
                voided_at: new Date()
            }, { transaction });

            await transaction.commit();
            return order;

        } catch (err) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'OrderService.voidOrder', err.message);
            throw err;
        }
    }

    /**
     * FUNGSI GENERIK BARU: Buat Laporan
     */
    static async generateReport(req, startDate, endDate, orderType) {
        try {
            const db = req.app.get('db');
            // ... (Logika 'moment' Anda) ...
            
            const options = {
                where: {
                    order_type: orderType, // Filter berdasarkan tipe
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [
                    {
                        model: db.order_items,
                        as: 'order_items',
                        include: [
                            {
                                model: db.order_item_modifiers,
                                as: 'modifiers'
                            }
                        ]
                    }
                ]
            };
            
            // (Logika 'shifts' khusus carwash perlu penanganan khusus)
            if (orderType === 'carwash') {
                const shifts = await BaseRepository.getDataByOptions(req, 'shift_carwash', { /* ... */ });
                // ... (Logika getShiftDetails Anda) ...
            }
    
            const orders = await BaseRepository.getDataByOptions(req, 'orders', options);
            
            // ... (Logika transformasi 'reportData' Anda) ...
            const reportData = orders.map(order => { /* ... */ });
            return reportData;

        } catch (error) {
            LogError(__dirname, `OrderService.generateReport (${orderType})`, error.message);
            return Promise.reject(error);
        }
    }
}

module.exports = OrderService;