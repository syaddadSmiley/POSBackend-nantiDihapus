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

    // --- NEW MODEL: TAXES ---
    db.taxes = sequelizeLocal.define('taxes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING },
        rate: { type: DataTypes.DECIMAL(10, 2) },
        type: { type: DataTypes.ENUM('PERCENTAGE', 'FIXED'), defaultValue: 'PERCENTAGE' },
        is_inclusive: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, { freezeTableName: true, timestamps: true });

    // --- NEW MODEL: ITEM VARIATION TAXES (Junction Table) ---
    db.item_variation_taxes = sequelizeLocal.define('item_variation_taxes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        item_variation_id: { type: DataTypes.INTEGER },
        tax_id: { type: DataTypes.INTEGER }
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
const TARGET_MENU_TYPE_ID = 1; // ID 1 = F&B
const PB1_TAX_ID = 1;          // ID Pajak PB1 yang ingin di-assign

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
        await sequelizeLocal.sync({ alter: false }); 

        // --- SEED MENU TYPES ---
        const fnb = await db.menu_types.findByPk(1);
        if (!fnb) await db.menu_types.create({ id: 1, name: 'F&B' });
        
        const carwash = await db.menu_types.findByPk(2);
        if (!carwash) await db.menu_types.create({ id: 2, name: 'Carwash' });

        // --- CHECK PB1 TAX EXISTENCE ---
        let pb1 = await db.taxes.findByPk(PB1_TAX_ID);
        if (!pb1) {
            console.log('🌱 Creating Default PB1 Tax...');
            pb1 = await db.taxes.create({
                id: PB1_TAX_ID,
                name: 'PB1 Restoran',
                rate: 10.00,
                type: 'PERCENTAGE',
                is_inclusive: false
            });
        } else {
            console.log(`✅ Tax Found: ${pb1.name} (${pb1.rate}%)`);
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

            // 1. CATEGORY
            let categoryName = firstRow[CSV_HEADERS.CATEGORY];
            if (!categoryName || categoryName.trim() === '') categoryName = 'Uncategorized';
            categoryName = categoryName.trim().toUpperCase(); 
            
            let category = await db.categories.findOne({ where: { name: categoryName }, transaction });
            
            if (!category) {
                console.log(`   ➕ New Category: ${categoryName} -> F&B`);
                category = await db.categories.create({ 
                    name: categoryName,
                    menu_type_id: TARGET_MENU_TYPE_ID 
                }, { transaction });
            }

            // 2. ITEM
            const newItem = await db.items.create({
                name: itemName,
                category_id: category.id,
                is_active: true
            }, { transaction });

            // 3. VARIATIONS & TAX ASSIGNMENT
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

                // Create Variation
                const newVariation = await db.item_variations.create({
                    item_id: newItem.id,
                    name: varName,
                    price: priceClean,
                    sku: row[CSV_HEADERS.SKU] || null,
                    stock_level: stockClean,
                    track_inventory: true
                }, { transaction });

                // --- AUTO ASSIGN TAX---
                // Logic: Assign PB1 to items in "MAKANAN" or "MINUMAN" categories (or similar logic)
                // For now, let's assume ALL F&B items get PB1. 
                // If you want to filter, add: if (categoryName.includes('MAKANAN') || categoryName.includes('MINUMAN'))
                
                await db.item_variation_taxes.create({
                    item_variation_id: newVariation.id,
                    tax_id: PB1_TAX_ID
                }, { transaction });
            }
        }

        await transaction.commit();
        console.log('\n🎉 SUKSES! Data berhasil dimigrasi dan Pajak PB1 telah diterapkan.');
        process.exit(0);

    } catch (error) {
        await transaction.rollback();
        console.error('\n❌ ERROR SAAT MIGRASI:', error);
        process.exit(1);
    }
}

migrateData();