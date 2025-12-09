// file: models/Modifier.js

module.exports = (sequelize, DataTypes) => {
    const Modifier = sequelize.define('modifiers', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        modifier_list_id: { // Foreign key ke 'modifier_lists'
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'modifier_lists',
                key: 'id'
            }
        },
        name: { // Misal: "Hot", "Ice", "Ayam", "Extra Keju"
            type: DataTypes.STRING,
            allowNull: false
        },
        add_price: { // Harga TAMBAHAN (bisa 0, 3000, -5000)
            type: DataTypes.INTEGER, // Sesuai refaktor kita sebelumnya
            allowNull: false,
            defaultValue: 0
        },
        // (Opsional) Tambahkan pelacakan stok untuk opsi
        track_inventory: DataTypes.BOOLEAN,
        stock_level: DataTypes.INTEGER,
    }, {
        freezeTableName: true,
        timestamps: false,
    });

    Modifier.associate = function (models) {
        // Satu Opsi (Hot) dimiliki oleh SATU Grup (Pilihan Suhu)
        Modifier.belongsTo(models.modifier_lists, { foreignKey: 'modifier_list_id', onDelete: 'CASCADE' });
    };

    return Modifier;
}