// file: src/db/models/Orders.js

module.exports = (sequelize, DataTypes) => {
    const Orders = sequelize.define('orders', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        order_id: { // ID unik (misal: "fnb-order-01022025-1")
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        order_num: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        order_type: { // Kolom diskriminator
            type: DataTypes.ENUM('fnb', 'carwash'),
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        // dateclosebill: DataTypes.DATE,
        notes: DataTypes.STRING,
        status: DataTypes.STRING,
        subtotal: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        discount_amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        bill_name: {
            type: DataTypes.STRING,
            allowNull: true, // Boleh kosong untuk pelanggan anonim
            defaultValue: null,
        },
        void_reason: { 
            type: DataTypes.STRING,
            allowNull: true
        },
        voided_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        voided_by: { // ID User (Supervisor)
            type: DataTypes.INTEGER,
            allowNull: true
        },
        total_tax: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        total: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        metode_pembayaran: DataTypes.STRING,
        member_id: { // Dari OrderCarwash
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        voucher_id: { // Dari OrderFnb
            type: DataTypes.STRING,
            allowNull: true,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, {
        freezeTableName: true,
    });

    Orders.associate = function(models) {
        // Satu Pesanan memiliki BANYAK Item Pesanan
        Orders.hasMany(models.order_items, {
            foreignKey: 'order_id', // Menunjuk ke 'order_id' (string)
            sourceKey: 'order_id',  // Menautkan ke 'order_id' (string) di tabel ini
            as: 'order_items'
        });

        Orders.hasMany(models.order_payments, {
            foreignKey: 'order_id',
            sourceKey: 'order_id',
            as: 'payments' // Alias untuk include
        });

        Orders.belongsTo(models.users, {
            foreignKey: 'user_id',
            as: 'cashier' // Alias ini dipanggil di ReportService
        });

        Orders.hasMany(models.order_discounts, {
            foreignKey: 'order_id',
            sourceKey: 'order_id',
            as: 'applied_discounts' // Nama alias untuk include
        });
    };

    return Orders;
};