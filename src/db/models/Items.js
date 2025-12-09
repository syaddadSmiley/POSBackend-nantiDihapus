module.exports = (sequelize, DataTypes) => {
    const Items = sequelize.define('items', {
        id: {
            // UBAH KE INTEGER AUTO INCREMENT
            // Agar saat create, ID otomatis terisi (1, 2, 3...)
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true, 
            allowNull: false
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Tambahan field boolean untuk status aktif/tidak
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        freezeTableName: true,
        timestamps: true, // Sebaiknya TRUE agar kita tahu kapan item dibuat (createdAt)
    });

    Items.associate = function (models) {
        // Relasi ke Kategori
        Items.belongsTo(models.categories, { foreignKey: 'category_id', onDelete: 'CASCADE' });
        
        // Relasi ke Variasi
        Items.hasMany(models.item_variations, { 
            foreignKey: 'item_id', 
            onDelete: 'CASCADE',
            as: 'item_variations'
        });
        
        // Relasi ke Tags (jika ada)
        Items.hasMany(models.item_tags, { foreignKey: 'item_id', onDelete: 'CASCADE' });

        // --- RELASI WAJIB UNTUK MODIFIER ---
        Items.belongsToMany(models.modifier_lists, {
            through: 'item_modifier_lists', // Nama tabel junction
            foreignKey: 'item_id',
            otherKey: 'modifier_list_id',
            as: 'modifierLists', // <--- ALIAS PENTING (CamelCase)
            // Dengan alias 'modifierLists', Sequelize membuat fungsi:
            // newItem.setModifierLists()
            // newItem.getModifierLists()
        });
    };

    return Items;
}