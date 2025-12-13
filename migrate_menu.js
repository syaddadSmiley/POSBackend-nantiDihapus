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
// 2. DEFINISI MODEL MANUAL (INLINE)
// ==============================================================================
try {
    // --- MODEL: MENU TYPES (Unit Bisnis: F&B, Carwash) ---
    db.menu_types = sequelizeLocal.define('menu_types', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING }
    }, { freezeTableName: true, timestamps: true });

    // --- MODEL: CATEGORIES (Kelompok: Makanan, Minuman, Detailing) ---
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
// 3. KONFIGURASI TARGET MIGRASI
// ==============================================================================
// Karena CSV ini berisi menu makanan, kita targetkan ke F&B
const TARGET_MENU_TYPE_ID = 1; // ID 1 = F&B

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
        // Gunakan { alter: true } agar aman
        await sequelizeLocal.sync({ alter: true }); 

        // --- SEED MASTER DATA (MENU TYPES) ---
        console.log('🌱 Seeding Menu Types (Business Units)...');
        
        // 1. F&B
        const fnb = await db.menu_types.findByPk(1);
        if (!fnb) {
            await db.menu_types.create({ id: 1, name: 'F&B' });
            console.log('   ✅ Created: F&B (ID 1)');
        }

        // 2. Carwash
        const carwash = await db.menu_types.findByPk(2);
        if (!carwash) {
            await db.menu_types.create({ id: 2, name: 'Carwash' });
            console.log('   ✅ Created: Carwash (ID 2)');
        }
        
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

        console.log(`📦 Memproses ${Object.keys(groupedItems).length} Produk ke Menu Type: F&B...`);

        for (const itemName in groupedItems) {
            const rows = groupedItems[itemName];
            const firstRow = rows[0];

            // 1. CATEGORY (Contoh: "MAKANAN", "MINUMAN")
            let categoryName = firstRow[CSV_HEADERS.CATEGORY];
            if (!categoryName || categoryName.trim() === '') categoryName = 'Uncategorized';
            categoryName = categoryName.trim().toUpperCase(); // Rapikan jadi uppercase
            
            // Cari kategori di DB. Jika belum ada, buat baru dan kaitkan ke F&B (ID 1)
            let category = await db.categories.findOne({ where: { name: categoryName }, transaction });
            
            if (!category) {
                console.log(`   ➕ New Category: ${categoryName} -> F&B`);
                category = await db.categories.create({ 
                    name: categoryName,
                    menu_type_id: TARGET_MENU_TYPE_ID // Selalu ID 1 (F&B) untuk file ini
                }, { transaction });
            }

            // 2. ITEM
            const newItem = await db.items.create({
                name: itemName,
                category_id: category.id,
                is_active: true
            }, { transaction });

            // 3. VARIATIONS
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
        console.log('\n🎉 SUKSES! Data berhasil dimigrasi.');
        process.exit(0);

    } catch (error) {
        await transaction.rollback();
        console.error('\n❌ ERROR SAAT MIGRASI:', error);
        process.exit(1);
    }
}

migrateData();