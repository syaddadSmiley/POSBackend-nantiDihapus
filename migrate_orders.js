const fs = require('fs');
const csv = require('csv-parser');
const Sequelize = require('sequelize');

// ==============================================================================
// 1. KONEKSI DATABASE
// ==============================================================================
console.log('🔄 Menghubungkan ke database lokal: pos_production...');

const sequelizeLocal = new Sequelize('pos_production', 'root', '123123', {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false,
    timezone: '+07:00',
    dialectOptions: {
        dateStrings: true,
        typeCast: true
    }
});

const db = {};
const DataTypes = Sequelize.DataTypes;

// ==============================================================================
// 2. DEFINISI MODEL (MAPPING LENGKAP DENGAN TIMESTAMP)
// ==============================================================================
try {
    // --- Master Data (Tambahkan createdAt & updatedAt) ---
    db.categories = sequelizeLocal.define('categories', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING },
        menu_type_id: { type: DataTypes.INTEGER, defaultValue: 1 },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
    }, { freezeTableName: true, timestamps: true }); // Aktifkan timestamps

    db.items = sequelizeLocal.define('items', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING },
        category_id: { type: DataTypes.INTEGER },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
    }, { freezeTableName: true, timestamps: true }); // Aktifkan timestamps

    db.item_variations = sequelizeLocal.define('item_variations', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        item_id: { type: DataTypes.INTEGER },
        name: { type: DataTypes.STRING },
        price: { type: DataTypes.INTEGER },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
    }, { freezeTableName: true, timestamps: true }); // Aktifkan timestamps
    
    // --- Orders Data ---
    db.orders = sequelizeLocal.define('orders', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        order_id: { type: DataTypes.STRING, unique: true }, 
        order_num: { type: DataTypes.INTEGER },
        order_type: { type: DataTypes.ENUM('fnb', 'carwash'), defaultValue: 'fnb' },
        date: { type: DataTypes.DATE },
        status: { type: DataTypes.STRING }, 
        subtotal: { type: DataTypes.INTEGER },
        discount_amount: { type: DataTypes.INTEGER },
        total_tax: { type: DataTypes.INTEGER },
        total: { type: DataTypes.INTEGER },
        metode_pembayaran: { type: DataTypes.STRING },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
    }, { freezeTableName: true, timestamps: true });

    db.order_items = sequelizeLocal.define('order_items', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        order_id: { type: DataTypes.STRING },
        item_variation_id: { type: DataTypes.INTEGER, allowNull: false },
        item_name: { type: DataTypes.STRING },
        item_price: { type: DataTypes.INTEGER },
        sub_total_price: { type: DataTypes.INTEGER },
        quantity: { type: DataTypes.INTEGER },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
    }, { freezeTableName: true, timestamps: true });

    db.order_payments = sequelizeLocal.define('order_payments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        order_id: { type: DataTypes.STRING },
        amount: { type: DataTypes.INTEGER },
        payment_method: { type: DataTypes.STRING },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
    }, { freezeTableName: true, timestamps: true });

    db.sequelize = sequelizeLocal;
    db.Sequelize = Sequelize;

} catch (error) {
    console.error('❌ Gagal setup model:', error);
    process.exit(1);
}

// ==============================================================================
// 3. FUNGSI AUTO-CREATE (DENGAN TIMESTAMP FIX)
// ==============================================================================
async function getOrCreateVariation(itemName, variationName, transaction) {
    const now = new Date(); // Waktu saat ini untuk data baru

    // 1. Cari Item induk
    let item = await db.items.findOne({ where: { name: itemName }, transaction });
    
    // Jika Item tidak ada, BUAT BARU
    if (!item) {
        // Cari/Buat kategori default
        let category = await db.categories.findOne({ where: { name: 'Uncategorized' }, transaction });
        if (!category) {
            category = await db.categories.create({ 
                name: 'Uncategorized',
                createdAt: now, updatedAt: now 
            }, { transaction });
        }
        
        item = await db.items.create({
            name: itemName,
            category_id: category.id,
            createdAt: now, // FIX: Masukkan timestamp
            updatedAt: now  // FIX: Masukkan timestamp
        }, { transaction });
    }

    // 2. Cari Variasi
    let variation = await db.item_variations.findOne({
        where: { name: variationName, item_id: item.id },
        transaction
    });

    // Jika Variasi tidak ada, BUAT BARU
    if (!variation) {
        variation = await db.item_variations.create({
            item_id: item.id,
            name: variationName,
            price: 0,
            createdAt: now, // FIX: Masukkan timestamp
            updatedAt: now  // FIX: Masukkan timestamp
        }, { transaction });
    }

    return variation.id;
}

// ==============================================================================
// 4. PROSES MIGRASI
// ==============================================================================
const CSV_HEADERS = {
    RECEIPT_NO: 'Receipt Number',
    DATE: 'Date',               
    TIME: 'Time',               
    ITEM_NAME: 'Items',         
    VARIANT: 'Variant',         
    QTY: 'Quantity',
    GROSS_SALES: 'Gross Sales', 
    DISCOUNTS: 'Discounts',     
    TAX: 'Tax',
    PAYMENT_METHOD: 'Payment Method'
};

async function migrateOrders() {
    try {
        console.log('📦 Menyiapkan Migrasi (AUTO-CREATE + TIMESTAMP FIX)...');
        await sequelizeLocal.sync({ alter: false, force: false }); 

        const results = [];
        const csvFilename = 'Report Item Details - 01-01-2025 - 13-12-2025 - Outlet_1 - 1024044 - 693c699e.csv'; 

        if (!fs.existsSync(csvFilename)) {
            console.error(`❌ ERROR: File '${csvFilename}' tidak ditemukan!`);
            process.exit(1);
        }

        console.log(`📖 Membaca file CSV: ${csvFilename}...`);
        fs.createReadStream(csvFilename)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`✅ CSV Terbaca: ${results.length} baris.`);
                await processBatch(results);
            });

    } catch (err) {
        console.error('⚠️ Error Utama:', err);
    }
}

async function processBatch(rows) {
    const transaction = await db.sequelize.transaction();
    const now = new Date(); 
    
    try {
        console.log('🔄 Mengelompokkan transaksi...');
        const ordersMap = new Map();

        rows.forEach(row => {
            const receiptNo = row[CSV_HEADERS.RECEIPT_NO];
            if (!receiptNo) return;
            if (!ordersMap.has(receiptNo)) ordersMap.set(receiptNo, []);
            ordersMap.get(receiptNo).push(row);
        });

        console.log(`📦 Terdeteksi ${ordersMap.size} Order Unik.`);
        let successCount = 0;
        let skippedCount = 0;

        for (const [receiptNo, items] of ordersMap) {
            
            // Cek Duplikasi
            const existingOrder = await db.orders.findOne({ 
                where: { order_id: receiptNo }, 
                transaction 
            });

            if (existingOrder) {
                skippedCount++;
                continue; 
            }

            // Header Data
            const firstItem = items[0];
            
            // Parse Date
            let transactionDate = now;
            try {
                const dRaw = firstItem[CSV_HEADERS.DATE]; 
                const tRaw = firstItem[CSV_HEADERS.TIME]; 
                if (dRaw && tRaw) {
                    const [d, m, y] = dRaw.split('-');
                    const [h, mn, s] = tRaw.split(':');
                    transactionDate = new Date(y, m - 1, d, h, mn, s || 0);
                }
            } catch (e) { }

            let paymentMethod = (firstItem[CSV_HEADERS.PAYMENT_METHOD] || 'cash').toLowerCase();

            // Totals
            let totalSubtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;

            items.forEach(item => {
                totalSubtotal += parseFloat(item[CSV_HEADERS.GROSS_SALES] || 0);
                totalDiscount += parseFloat(item[CSV_HEADERS.DISCOUNTS] || 0);
                totalTax += parseFloat(item[CSV_HEADERS.TAX] || 0);
            });
            const totalNet = (totalSubtotal - totalDiscount) + totalTax;

            // INSERT HEADER
            await db.orders.create({
                order_id: receiptNo,
                order_num: 0,
                order_type: 'fnb', 
                date: transactionDate,
                status: 'paid',
                subtotal: Math.round(totalSubtotal),
                discount_amount: Math.round(totalDiscount),
                total_tax: Math.round(totalTax),
                total: Math.round(totalNet),
                metode_pembayaran: paymentMethod, 
                user_id: null,
                createdAt: transactionDate,
                updatedAt: now
            }, { transaction });

            // INSERT ITEMS
            for (const itemRow of items) {
                const qty = parseFloat(itemRow[CSV_HEADERS.QTY] || 1);
                const itemName = itemRow[CSV_HEADERS.ITEM_NAME];
                let variantName = itemRow[CSV_HEADERS.VARIANT];
                if (!variantName || variantName.trim() === '') variantName = 'Regular';

                const itemGross = parseFloat(itemRow[CSV_HEADERS.GROSS_SALES] || 0);
                
                // 🔥 GET OR CREATE VARIATION (dengan Timestamp)
                const variationId = await getOrCreateVariation(itemName, variantName, transaction);

                await db.order_items.create({
                    order_id: receiptNo,
                    item_variation_id: variationId, 
                    item_name: `${itemName} (${variantName})`,
                    item_price: qty > 0 ? Math.round(itemGross / qty) : 0,
                    sub_total_price: Math.round(itemGross),
                    quantity: qty,
                    createdAt: transactionDate,
                    updatedAt: now
                }, { transaction });
            }

            // INSERT PAYMENT
            await db.order_payments.create({
                order_id: receiptNo,
                amount: Math.round(totalNet),
                payment_method: paymentMethod,
                createdAt: transactionDate,
                updatedAt: now
            }, { transaction });

            successCount++;
            if (successCount % 50 === 0) process.stdout.write('.');
        }

        await transaction.commit();
        console.log(`\n\n🎉 SELESAI!`);
        console.log(`   ✅ Berhasil Import: ${successCount} Transaksi`);
        console.log(`   ⏭️  Dilewati (Sudah Ada): ${skippedCount} Transaksi`);
        process.exit(0);

    } catch (error) {
        await transaction.rollback();
        console.error('\n❌ ERROR SAAT MIGRASI:', error);
        process.exit(1);
    }
}

migrateOrders();