// file: models/Tax.js

module.exports = (sequelize, DataTypes) => {
    const Tax = sequelize.define('taxes', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        name: { // Misal: "PPN", "PB1 (Pajak Restoran)"
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        rate: { // Tarif dalam persentase, misal: 11 (untuk 11%)
            type: DataTypes.DECIMAL(5, 2), // Cukup untuk angka seperti 11.00
            allowNull: false
        },
        type: { // 'PERCENTAGE' atau 'FIXED'
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'PERCENTAGE'
        },
        is_inclusive: {
            // Menandakan apakah harga item SUDAH termasuk pajak ini?
            // false = Harga Exclusive (pajak ditambahkan di akhir)
            // true = Harga Inclusive (pajak sudah termasuk)
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false 
        }
    }, {
        freezeTableName: true,
        timestamps: false,
    });

    Tax.associate = function (models) {
        // Satu Pajak bisa diterapkan ke BANYAK Variasi (via tabel junction)
        Tax.belongsToMany(models.item_variations, {
            through: 'item_variation_taxes', // Nama tabel junction
            foreignKey: 'tax_id',
            otherKey: 'item_variation_id',
            timestamps: false
        });
    };

    return Tax;
}