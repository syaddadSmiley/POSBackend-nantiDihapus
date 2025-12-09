// file: models/ModifierList.js

module.exports = (sequelize, DataTypes) => {
    const ModifierList = sequelize.define('modifier_lists', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        name: { // Misal: "Pilihan Suhu", "Varian Dimsum", "Level Pedas"
            type: DataTypes.STRING,
            allowNull: false,
            unique: true // Sebaiknya nama grup unik
        },
        // (Opsional) Aturan untuk UI
        selection_type: { // 'SINGLE' atau 'MULTIPLE'
            type: DataTypes.STRING, 
            allowNull: false,
            defaultValue: 'SINGLE'
        },
        min_selection: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        max_selection: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        }
    }, {
        freezeTableName: true,
        timestamps: false,
    });

    ModifierList.associate = function (models) {
        // Satu Grup (Pilihan Suhu) memiliki BANYAK Opsi (Hot, Ice)
        ModifierList.hasMany(models.modifiers, { foreignKey: 'modifier_list_id', onDelete: 'CASCADE' });

        // Satu Grup bisa dimiliki BANYAK Item (via tabel junction)
        ModifierList.belongsToMany(models.items, {
            through: 'item_modifier_lists', // Nama tabel junction
            foreignKey: 'modifier_list_id',
            otherKey: 'item_id',
            timestamps: false
        });
    };

    return ModifierList;
}