// file: src/db/models/OrderItems.js

module.exports = (sequelize, DataTypes) => {
    const OrderItems = sequelize.define('order_items', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        order_id: { // Foreign key ke orders.order_id
            type: DataTypes.STRING,
            allowNull: false,
        },
        item_variation_id: { // Foreign key BARU ke item_variations.id
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        item_name: DataTypes.STRING,
        item_price: DataTypes.INTEGER,
        sub_total_price: DataTypes.INTEGER,
        quantity: DataTypes.INTEGER,
    }, {
        timestamps: false,
        freezeTableName: true,
    });

    OrderItems.associate = function(models) {
        // Satu Item Pesanan dimiliki oleh SATU Pesanan
        OrderItems.belongsTo(models.orders, {
            foreignKey: 'order_id',
            targetKey: 'order_id',
            as: 'order'
        });

        // Satu Item Pesanan merujuk ke SATU Variasi Item
        OrderItems.belongsTo(models.item_variations, {
            foreignKey: 'item_variation_id',
            as: 'variation'
        });

        // Satu Item Pesanan memiliki BANYAK Modifier Pesanan
        OrderItems.hasMany(models.order_item_modifiers, {
            foreignKey: 'order_item_id', // Menunjuk ke 'id' (INT) di tabel ini
            as: 'modifiers'
        });
    };

    return OrderItems;
};