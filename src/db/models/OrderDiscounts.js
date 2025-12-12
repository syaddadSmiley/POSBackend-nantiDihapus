// src/db/models/OrderDiscounts.js
module.exports = (sequelize, DataTypes) => {
  const OrderDiscounts = sequelize.define('order_discounts', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    order_id: { // Link ke order yang relevan
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'orders', key: 'order_id' }
    },
    discount_id: { // Link ke aturan diskon mana yang dipakai
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'discounts', key: 'id' }
    },
    name: { // "Snapshot" nama diskon saat itu
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: { // Jumlah potongan dalam Rupiah
      type: DataTypes.INTEGER,
      allowNull: false
    },
  }, {
    freezeTableName: true,
    timestamps: true
  });

  OrderDiscounts.associate = function(models) {
    OrderDiscounts.belongsTo(models.orders, { foreignKey: 'order_id', targetKey: 'order_id', as: 'order' });
    OrderDiscounts.belongsTo(models.discounts, { foreignKey: 'discount_id', as: 'discount_rule' });
  };

  return OrderDiscounts;
};
