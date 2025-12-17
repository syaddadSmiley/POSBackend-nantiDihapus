module.exports = (sequelize, DataTypes) => {
    const OrderDiscounts = sequelize.define('order_discounts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        order_id: { type: DataTypes.STRING, allowNull: false }, // Relasi ke orders.order_id (String)
        discount_id: { type: DataTypes.INTEGER, allowNull: true }, // Relasi ke master discounts
        
        // Snapshot Data (Penting agar history tidak berubah jika master diedit)
        name: { type: DataTypes.STRING, allowNull: false },
        amount: { type: DataTypes.INTEGER, allowNull: false }, // Nominal Rupiah yang dipotong
        
        level: { type: DataTypes.ENUM('ORDER', 'ITEM'), allowNull: false },
        order_item_id: { type: DataTypes.INTEGER, allowNull: true } // Jika level ITEM
    }, {
        tableName: 'order_discounts',
        timestamps: false
    });

    OrderDiscounts.associate = function(models) {
        OrderDiscounts.belongsTo(models.orders, { foreignKey: 'order_id', targetKey: 'order_id' });
        OrderDiscounts.belongsTo(models.discounts, { foreignKey: 'discount_id' });
    };

    return OrderDiscounts;
};