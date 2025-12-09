module.exports = (sequelize, DataTypes) => {
    const ShiftCarwash = sequelize.define('shift_carwash', {
        shift_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        shift_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        shift_days: {
            type: DataTypes.STRING, // Store days as a comma-separated string (e.g., "Senin,Selasa,...")
            allowNull: false,
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        extra_fee: {
            type: DataTypes.INTEGER,
            defaultValue: 0, // Default to 0 if no extra fee
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        timestamps: true, // Automatically add createdAt and updatedAt fields
    });

    return ShiftCarwash;
};
