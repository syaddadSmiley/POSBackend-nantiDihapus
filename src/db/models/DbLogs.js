

module.exports = (sequelize, DataTypes) => {
    const db_logs = sequelize.define('db_logs', {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        action_type: {
            type: DataTypes.ENUM('INSERT', 'UPDATE', 'DELETE'),
            allowNull: false,
        },
        table_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        record_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        old_values: {
            type: DataTypes.JSON,
            allowNull: true,  // Can be null for INSERT actions
        },
        new_values: {
            type: DataTypes.JSON,
            allowNull: true,  // Can be null for DELETE actions
        },
        changed_by: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        transaction_id: {
            type: DataTypes.STRING,
            allowNull: true,  // Optional: useful if you track transactions
        },
        ip_address: {
            type: DataTypes.STRING(45),  // For IPv4 and IPv6
            allowNull: true,
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,  // Optional: You can add context if needed
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        freezeTableName: true,
        timestamps: false,  // We are manually handling the timestamp with `created_at`
    });

    return db_logs;
};