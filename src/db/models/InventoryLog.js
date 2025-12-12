module.exports = (sequelize, DataTypes) => {
    const InventoryLog = sequelize.define('inventory_logs', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        variation_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('IN', 'OUT', 'ADJUSTMENT'),
            allowNull: false
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        previous_stock: DataTypes.INTEGER,
        current_stock: DataTypes.INTEGER,
        notes: DataTypes.STRING
    }, {
        freezeTableName: true,
    });

    InventoryLog.associate = function(models) {
        InventoryLog.belongsTo(models.item_variations, { foreignKey: 'variation_id', as: 'variation' });
        InventoryLog.belongsTo(models.users, { foreignKey: 'user_id', as: 'actor' });
    };

    return InventoryLog;
};