module.exports = (sequelize, DataTypes) => {
    const Discounts = sequelize.define('discounts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        code: { type: DataTypes.STRING, unique: true }, // Bisa NULL jika promo otomatis
        type: { 
            type: DataTypes.ENUM('PERCENTAGE', 'FIXED'), 
            allowNull: false 
        },
        value: { type: DataTypes.INTEGER, allowNull: false }, // Misal: 10 (%) atau 10000 (Rp)
        min_order_amount: { type: DataTypes.INTEGER, defaultValue: 0 },
        max_discount_amount: { type: DataTypes.INTEGER, defaultValue: 0 },
        
        // Timer
        start_date: DataTypes.DATE,
        end_date: DataTypes.DATE,
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

        // Limit
        usage_limit_total: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0 = Unlimited
        usage_limit_per_user: { type: DataTypes.INTEGER, defaultValue: 0 },
        current_usage: { type: DataTypes.INTEGER, defaultValue: 0 },

        // Scope (Diskon per Item atau Total)
        scope: { 
            type: DataTypes.ENUM('ORDER', 'ITEM', 'CATEGORY'), 
            defaultValue: 'ORDER' 
        },
        target_id: DataTypes.INTEGER, // ID Item/Category jika scope spesifik
    }, {
        tableName: 'discounts',
        timestamps: true
    });

    return Discounts;
};