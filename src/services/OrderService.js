// file: src/services/OrderService.js

const { BaseRepository } = require('../db');
const _ = require('lodash');
const { LogError, LogAny } = require('../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../db/models');
const moment = require('moment');

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
        const transaction = await sequelize.transaction();
        try {
            const db = req.app.get('db');
            
            if (_.isEmpty(data)) throw new Error('Data is empty');

            let userId = null;
            if (req.decoded && req.decoded.payloadToken) {
                userId = req.decoded.payloadToken.id;
            } else if (req.user) {
                userId = req.user.id;
            }

            const clientDate = new Date(data.date); 
            
            // 2. Format untuk 'order_id' (DDMMYYYY) - berdasarkan tanggal klien
            let mm_id = (clientDate.getMonth() + 1).toString().padStart(2, '0');
            let dd_id = clientDate.getDate().toString().padStart(2, '0');
            const dateFormat_id = `${dd_id}${mm_id}${clientDate.getFullYear()}`; // "15112025"
            
            // 3. Panggil 'generateUniqueOrderNum' DI DALAM transaksi
            //    Kirim string 'data.date' (misal: "2025-11-15T01:47:40")
            let orderNum = await this.generateUniqueOrderNum(req, data.date, data.order_type, transaction);
            data.order_num = orderNum;
            data.order_id = `${data.order_type}-${dateFormat_id}-${data.order_num}`;
            
            // 4. Gunakan 'data.date' dari klien. Sequelize akan mengonversinya ke UTC.
            data.date = clientDate;

            const orderData = {
                order_id: data.order_id,
                order_num: data.order_num,
                order_type: data.order_type,
                date: data.date,
                notes: data.notes,
                status: data.status,
                total: data.total,
                metode_pembayaran: data.metode_pembayaran,
                member_id: data.member_id,
                voucher_id: data.voucher_id,
                user_id: userId
            };

            // 5. Buat pesanan induk
            const createdOrder = await BaseRepository.create(req, orderData, 'orders', { transaction });
            
            // 3. Loop melalui item pesanan
            for (const item of data.order_items) {
                const variationId = item.variation_id;
                const quantity = item.quantity;
                const modifierIds = item.modifier_ids || [];

                // 4. LOGIKA MANAJEMEN STOK (VARIASI)
                const variation = await db.item_variations.findByPk(variationId, { transaction, lock: true });
                if (!variation) throw new Error(`Variation ${variationId} not found`);

                if (variation.track_inventory) {
                    if (variation.stock_level < quantity) {
                        throw new Error(`Stok ${variation.name} tidak mencukupi.`);
                    }
                    variation.stock_level -= quantity;
                    await variation.save({ transaction });
                }

                // 5. LOGIKA MANAJEMEN STOK (MODIFIER)
                for (const modId of modifierIds) {
                    const modifier = await db.modifiers.findByPk(modId, { transaction, lock: true });
                    if (!modifier) throw new Error(`Modifier ${modId} not found`);
                    
                    if (modifier.track_inventory) {
                        if (modifier.stock_level < quantity) {
                            throw new Error(`Stok modifier ${modifier.name} tidak mencukupi.`);
                        }
                        modifier.stock_level -= (quantity); // Kurangi stok
                        await modifier.save({ transaction });
                    }
                }

                // 6. Buat 'order_items'
                const createdOrderItem = await BaseRepository.create(req, {
                    order_id: createdOrder.dataValues.order_id,
                    item_variation_id: variationId,
                    item_name: item.item_name,
                    item_price: item.item_price,
                    sub_total_price: item.sub_total_price,
                    quantity: quantity,
                }, 'order_items', { transaction });

                // 7. Buat 'order_item_modifiers'
                for (const modId of modifierIds) {
                    const modifier = await db.modifiers.findByPk(modId, { transaction });
                    await BaseRepository.create(req, {
                        order_item_id: createdOrderItem.dataValues.id, // Tautkan ke PK 'order_items'
                        modifier_id: modId,
                        component_name: modifier.name,
                        component_price: modifier.add_price
                    }, 'order_item_modifiers', { transaction });
                }
            }

            await transaction.commit();
            return createdOrder;

        } catch (err) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'OrderService.createOrder', err.message);
            return Promise.reject(err);
        }
    }

    /**
     * FUNGSI GENERIK BARU: Update Order
     * Menerapkan transaksi DAN manajemen stok (mengembalikan stok lama, mengurangi stok baru).
     */
    static async updateOrder(req, data) {
        const transaction = await sequelize.transaction();
        try {
            const db = req.app.get('db');
            
            if (_.isEmpty(data)) throw new Error('Data is empty');

            const orderId = data.order_id;

            // 1. Cari Order di Database
            const findOptions = {
                where: { order_id: orderId }, 
                transaction
            };
            const getOrderDataArray = await BaseRepository.getDataByOptions(req, 'orders', findOptions);
            
            if (_.isEmpty(getOrderDataArray)) {
                throw new Error(`Order with order_id ${orderId} not found`);
            }

            const existingOrder = getOrderDataArray[0];

            // ============================================================
            // [BARU] VALIDASI STATUS & PEMBAYARAN (SISIPKAN DI SINI)
            // ============================================================
            
            // 1. Cek Status Lunas
            if (existingOrder.status === 'paid') {
                throw new Error('Pesanan yang sudah LUNAS tidak dapat diedit.');
            }
            
            // 2. Cek Total Baru vs Uang Masuk (Khusus status Partial)
            if (existingOrder.status === 'partial') {
                // Hitung total uang yang sudah masuk di tabel payments
                const totalPaid = await db.order_payments.sum('amount', {
                    where: { order_id: orderId },
                    transaction
                }) || 0;

                // Tolak jika Total Baru < Uang Masuk (karena bakal jadi minus)
                // data.total adalah total baru yang dikirim dari Frontend
                if (data.total < totalPaid) {
                    throw new Error(`Total baru (Rp ${data.total}) tidak boleh lebih kecil dari jumlah yang sudah dibayar (Rp ${totalPaid}).`);
                }
            }
            // ============================================================


            // --- PENTING: Kembalikan Stok Lama ---
            const oldItems = await db.order_items.findAll({ where: { order_id: orderId }, transaction });
            for (const item of oldItems) {
                // 1a. Kembalikan stok variasi
                const variation = await db.item_variations.findByPk(item.item_variation_id, { transaction, lock: true });
                if (variation && variation.track_inventory) {
                    variation.stock_level += item.quantity;
                    await variation.save({ transaction });
                }
                
                // 1b. Kembalikan stok modifier
                const oldModifiers = await db.order_item_modifiers.findAll({ where: { order_item_id: item.id }, transaction });
                for (const subItem of oldModifiers) {
                    const modifier = await db.modifiers.findByPk(subItem.modifier_id, { transaction, lock: true });
                    if (modifier && modifier.track_inventory) {
                        modifier.stock_level += item.quantity; 
                        await modifier.save({ transaction });
                    }
                }
            }
            
            // Hapus item/sub-item lama
            await BaseRepository.deleteOrderByOptions(req, 'order_items', { where: { order_id: orderId }, transaction });
            
            // --- Logika Penambahan Item Baru ---
            for (const item of data.order_items) {
                const variationId = item.variation_id;
                const quantity = item.quantity;
                const modifierIds = item.modifier_ids || [];

                // Cek & Kurangi Stok Variasi
                const variation = await db.item_variations.findByPk(variationId, { transaction, lock: true });
                if (!variation) throw new Error(`Variation ${variationId} not found`);
                if (variation.track_inventory) {
                    if (variation.stock_level < quantity) throw new Error(`Stok ${variation.name} tidak mencukupi.`);
                    variation.stock_level -= quantity;
                    await variation.save({ transaction });
                }

                // Cek & Kurangi Stok Modifier
                for (const modId of modifierIds) {
                    const modifier = await db.modifiers.findByPk(modId, { transaction, lock: true });
                    if (!modifier) throw new Error(`Modifier ${modId} not found`);
                    if (modifier.track_inventory) {
                        if (modifier.stock_level < quantity) throw new Error(`Stok modifier ${modifier.name} tidak mencukupi.`);
                        modifier.stock_level -= quantity;
                        await modifier.save({ transaction });
                    }
                }

                // Buat 'order_items'
                const createdOrderItem = await BaseRepository.create(req, {
                    order_id: orderId,
                    item_variation_id: variationId,
                    item_name: item.item_name,
                    item_price: item.item_price,
                    sub_total_price: item.sub_total_price,
                    quantity: quantity,
                }, 'order_items', { transaction });
                
                // Buat 'order_item_modifiers'
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
            
            // Terakhir, update pesanan induk
            const { order_items, ...orderData } = data; 
            const options = { where: { order_id: orderId }, transaction: transaction };
            const updatedOrder = await BaseRepository.updateOrderByOptions(req, orderData, 'orders', options);

            await transaction.commit();
            return updatedOrder;

        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'OrderService.updateOrder', error.message);
            return Promise.reject(error);
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
        const deleted = await BaseRepository.deleteOrderByOptions(req, 'orders', options);
        return deleted;
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