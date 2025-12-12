const fs = require('fs');
const csv = require('csv-parser');
const Sequelize = require('sequelize');

// ==============================================================================
// 1. KONEKSI DATABASE LOKAL
// ==============================================================================
console.log('🔄 Menghubungkan ke database lokal: pos_production...');

const sequelizeLocal = new Sequelize('pos_production', 'root', '123123', {
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00'
});

const db = {};
const DataTypes = Sequelize.DataTypes;

// ==============================================================================
// 2. DEFINISI MODEL & RELASI
// ==============================================================================
try {
    // --- MODEL: MENU TYPES ---
    db.menu_types = sequelizeLocal.define('menu_types', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING }
    }, { freezeTableName: true, timestamps: true });

    // --- MODEL: CATEGORIES ---
    db.categories = sequelizeLocal.define('categories', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING },
        menu_type_id: { type: DataTypes.INTEGER }
    }, { freezeTableName: true, timestamps: true });

    // --- MODEL: ITEMS ---
    db.items = sequelizeLocal.define('items', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        category_id: { type: DataTypes.INTEGER },
        name: { type: DataTypes.STRING },
        description: { type: DataTypes.TEXT },
        image_url: { type: DataTypes.STRING },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, { freezeTableName: true, timestamps: true });

    // --- MODEL: ITEM VARIATIONS ---
    db.item_variations = sequelizeLocal.define('item_variations', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        item_id: { type: DataTypes.INTEGER },
        name: { type: DataTypes.STRING },
        price: { type: DataTypes.INTEGER },
        sku: { type: DataTypes.STRING },
        track_inventory: { type: DataTypes.BOOLEAN, defaultValue: true },
        stock_level: { type: DataTypes.INTEGER, defaultValue: 0 }
    }, { freezeTableName: true, timestamps: true });

    // --- RELASI ---
    db.categories.belongsTo(db.menu_types, { foreignKey: 'menu_type_id' });
    db.items.belongsTo(db.categories, { foreignKey: 'category_id' });
    db.item_variations.belongsTo(db.items, { foreignKey: 'item_id' });

    db.sequelize = sequelizeLocal;
    db.Sequelize = Sequelize;

} catch (error) {
    console.error('❌ Gagal setup model:', error);
    process.exit(1);
}

// ==============================================================================
// 3. LOGIKA PEMETAAN TIPE MENU (LOGIKA BARU ANDA)
// ==============================================================================
// Kita definisikan ID manual agar konsisten
const TYPE_MAP = {
    FOOD: 1,      // Untuk MAKANAN
    BEVERAGE: 2,  // Untuk MINUMAN
    PROMO: 3,     // Untuk PROMO / BUNDLING
    RETAIL: 4,    // Untuk IQOS / Barang Retail
    OTHER: 5      // Default
};

function determineMenuTypeId(csvCategoryName) {
    if (!csvCategoryName) return TYPE_MAP.OTHER;
    
    const cat = csvCategoryName.toUpperCase().trim();

    if (cat.includes('MAKANAN') || cat.includes('FOOD') || cat.includes('ROTI') || cat.includes('NASI')) {
        return TYPE_MAP.FOOD;
    }
    if (cat.includes('MINUMAN') || cat.includes('COFFEE') || cat.includes('DRINK') || cat.includes('TEH') || cat.includes('KOPI')) {
        return TYPE_MAP.BEVERAGE;
    }
    if (cat.includes('PROMO') || cat.includes('PAKET')) {
        return TYPE_MAP.PROMO;
    }
    if (cat.includes('IQOS') || cat.includes('VAPE') || cat.includes('DEVICE')) {
        return TYPE_MAP.RETAIL;
    }

    return TYPE_MAP.OTHER;
}

// ==============================================================================
// 4. EKSEKUSI MIGRASI
// ==============================================================================
const CSV_HEADERS = {
    ITEM_NAME: 'Items Name (Do Not Edit)', 
    CATEGORY: 'Category',                  
    VARIATION: 'Variant name',             
    PRICE: 'Basic - Price',                
    SKU: 'SKU',                            
    STOCK: 'In Stock'                      
};

async function migrateData() {
    try {
        console.log('📦 Sinkronisasi Tabel...');
        // Gunakan { force: true } jika ingin RESET TOTAL dan data bersih dari awal
        await sequelizeLocal.sync({ alter: true }); 

        // --- SEED MENU TYPES (Master Data) ---
        console.log('🌱 Seeding Menu Types...');
        const types = [
            { id: TYPE_MAP.FOOD, name: 'Makanan' },
            { id: TYPE_MAP.BEVERAGE, name: 'Minuman' },
            { id: TYPE_MAP.PROMO, name: 'Promo & Paket' },
            { id: TYPE_MAP.RETAIL, name: 'Retail / IQOS' },
            { id: TYPE_MAP.OTHER, name: 'Lainnya' }
        ];

        for (const t of types) {
            const exists = await db.menu_types.findByPk(t.id);
            if (!exists) await db.menu_types.create(t);
        }
        console.log('✅ Menu Types Ready.');

    } catch (err) {
        console.error('⚠️ Gagal Sync DB:', err.message);
        process.exit(1);
    }

    const results = [];
    console.log('📖 Membaca file CSV: menu_import.csv ...');

    if (!fs.existsSync('menu_import.csv')) {
        console.error("❌ ERROR: File 'menu_import.csv' tidak ditemukan!");
        process.exit(1);
    }

    fs.createReadStream('menu_import.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`✅ Ditemukan ${results.length} baris data.`);
            await processImport(results);
        });
}

async function processImport(dataRows) {
    const transaction = await db.sequelize.transaction();
    
    try {
        const groupedItems = {};

        dataRows.forEach(row => {
            const rawName = row[CSV_HEADERS.ITEM_NAME];
            if (!rawName) return; 
            const itemName = rawName.trim();
            if (!groupedItems[itemName]) groupedItems[itemName] = [];
            groupedItems[itemName].push(row);
        });

        console.log(`📦 Memproses ${Object.keys(groupedItems).length} Produk...`);

        for (const itemName in groupedItems) {
            const rows = groupedItems[itemName];
            const firstRow = rows[0];

            // 1. TENTUKAN KATEGORI & MENU TYPE ID
            let categoryName = firstRow[CSV_HEADERS.CATEGORY];
            if (!categoryName || categoryName.trim() === '') categoryName = 'Uncategorized';
            categoryName = categoryName.trim();

            // 🔥 LOGIKA PINTAR DI SINI 🔥
            const targetMenuTypeId = determineMenuTypeId(categoryName);
            
            // Find or Create Category
            let category = await db.categories.findOne({ where: { name: categoryName }, transaction });
            if (!category) {
                // Jika kategori baru dibuat, kita pasangkan dengan Menu Type hasil deteksi
                category = await db.categories.create({ 
                    name: categoryName,
                    menu_type_id: targetMenuTypeId 
                }, { transaction });
                console.log(`   ➕ Kat: ${categoryName} -> Type ID: ${targetMenuTypeId}`);
            }

            // 2. CREATE ITEM
            const newItem = await db.items.create({
                name: itemName,
                category_id: category.id,
                is_active: true
            }, { transaction });

            // 3. CREATE VARIATIONS
            for (const row of rows) {
                let priceRaw = row[CSV_HEADERS.PRICE];
                let priceClean = 0;
                if (priceRaw) {
                    priceClean = parseInt(priceRaw.toString().replace(/[^0-9]/g, '')) || 0;
                }

                let varName = row[CSV_HEADERS.VARIATION];
                if (!varName || varName.trim() === '') varName = 'Regular';

                let stockRaw = row[CSV_HEADERS.STOCK];
                let stockClean = parseInt(stockRaw) || 0;

                await db.item_variations.create({
                    item_id: newItem.id,
                    name: varName,
                    price: priceClean,
                    sku: row[CSV_HEADERS.SKU] || null,
                    stock_level: stockClean,
                    track_inventory: true
                }, { transaction });
            }
        }

        await transaction.commit();
        console.log('\n🎉 SUKSES! Data berhasil dipetakan sesuai Tipe Menu.');
        process.exit(0);

    } catch (error) {
        await transaction.rollback();
        console.error('\n❌ ERROR SAAT MIGRASI:', error);
        process.exit(1);
    }
}

migrateData();