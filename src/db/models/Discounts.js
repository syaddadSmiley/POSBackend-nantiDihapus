// src/db/models/Discounts.js
module.exports = (sequelize, DataTypes) => {
  const Discounts = sequelize.define('discounts', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: { // "Diskon Kemerdekaan", "Flash Sale 12.12"
      type: DataTypes.STRING,
      allowNull: false
    },
    code: { // "MERDEKA17", "HEMAT1212"
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    type: { // Potongan persentase atau nominal tetap
      type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
      allowNull: false
    },
    value: { // Nilai diskon: 10 (untuk 10%) atau 10000 (untuk Rp10.000)
      type: DataTypes.INTEGER,
      allowNull: false
    },
    min_order_amount: { // Syarat minimum belanja untuk bisa pakai diskon
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    max_discount_amount: { // Batas maksimal potongan (untuk tipe PERCENTAGE)
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // --- Bagian Timer ---
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // --- Bagian Limit/Kuota ---
    usage_limit_total: { // Kuota total untuk semua pengguna
      type: DataTypes.INTEGER,
      defaultValue: 0 // 0 = unlimited
    },
    usage_limit_per_user: { // Kuota per satu pengguna/member
      type: DataTypes.INTEGER,
      defaultValue: 0 // 0 = unlimited
    },
    current_usage: { // Penghitung berapa kali sudah terpakai
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
  }, {
    freezeTableName: true,
    timestamps: true
  });

  Discounts.associate = function(models) {
    Discounts.hasMany(models.order_discounts, {
      foreignKey: 'discount_id',
      as: 'usages'
    });
  };

  return Discounts;
};
