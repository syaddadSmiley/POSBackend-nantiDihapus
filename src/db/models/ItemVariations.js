
module.exports = (sequelize, DataTypes) => {
    const ItemVariations = sequelize.define('item_variations', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        item_id: { 
            type: DataTypes.INTEGER, 
            allowNull: false,
            references: {
                model: 'items',
                key: 'id'
            }
        },
        name: { // Nama variasi, misal: "Small", "Medium", "Original", "Pedas"
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Regular' // Default jika hanya ada 1 variasi
        },
        price: { // Harga untuk variasi SPESIFIK ini
            type: DataTypes.INTEGER, // Sesuai refaktor kita sebelumnya
            allowNull: false
        },
        sku: { // (OPSIONAL) Stock Keeping Unit
            type: DataTypes.STRING,
            allowNull: true
        },
        // --- POIN 4 (Manajemen Stok) ---
        track_inventory: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        stock_level: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        }
    }, {
        freezeTableName: true,
        timestamps: false,
    });

    ItemVariations.associate = function (models) {
        // Satu Variasi (Small) dimiliki oleh SATU Item (Cuci Mobil)
        ItemVariations.belongsTo(models.items, { foreignKey: 'item_id', onDelete: 'CASCADE' });
        ItemVariations.belongsToMany(models.taxes, {
            through: 'item_variation_taxes', // Nama tabel junction
            foreignKey: 'item_variation_id',
            otherKey: 'tax_id',
            as: 'taxes',
            timestamps: false
        });
    };
    
    return ItemVariations;
}