// file: src/db/models/OrderItemModifiers.js

module.exports = (sequelize, DataTypes) => {
    const OrderItemModifiers = sequelize.define('order_item_modifiers', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        order_item_id: { // Foreign key ke order_items.id
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        modifier_id: { // Foreign key BARU ke modifiers.id
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        component_name: DataTypes.STRING,
        component_price: DataTypes.INTEGER,
    }, {
        timestamps: false,
        freezeTableName: true,
    });

    OrderItemModifiers.associate = function(models) {
        // Satu Modifier Pesanan dimiliki oleh SATU Item Pesanan
        OrderItemModifiers.belongsTo(models.order_items, {
            foreignKey: 'order_item_id',
            as: 'item'
        });

        // Satu Modifier Pesanan merujuk ke SATU Modifier
        OrderItemModifiers.belongsTo(models.modifiers, {
            foreignKey: 'modifier_id',
            as: 'modifier'
        });
    };

    return OrderItemModifiers;
};