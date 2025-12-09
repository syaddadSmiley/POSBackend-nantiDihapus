// file: src/db/models/OrderPayments.js

module.exports = (sequelize, DataTypes) => {
    const OrderPayments = sequelize.define('order_payments', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        order_id: { // Foreign Key ke orders
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'order_id'
            }
        },
        amount: { // Nominal yang dibayar (misal: 50000)
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1 // Tidak boleh bayar 0 atau negatif
            }
        },
        payment_method: { // 'cash', 'qris', 'bca', dll
            type: DataTypes.STRING,
            allowNull: false
        },
        reference_id: { // No Ref EDC atau Catatan transfer
            type: DataTypes.STRING,
            allowNull: true
        },
        change_amount: { // Uang kembalian (khusus cash)
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        note: { // Catatan tambahan (misal: "Dibayar oleh A")
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        freezeTableName: true,
        timestamps: true, // Kita butuh createdAt untuk laporan shift
    });

    OrderPayments.associate = function(models) {
        // Setiap Pembayaran milik Satu Order
        OrderPayments.belongsTo(models.orders, {
            foreignKey: 'order_id',
            targetKey: 'order_id', // Pastikan ini sesuai dengan PK/Unique key di tabel orders
            as: 'order'
        });
    };

    return OrderPayments;
};