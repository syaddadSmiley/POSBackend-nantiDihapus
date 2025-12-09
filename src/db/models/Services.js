

module.exports = (sequelize, DataTypes) => {
    const Service = sequelize.define('services', {
        service_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        service_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        service_description: DataTypes.TEXT,
        service_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        freezeTableName: true,
    });

    return Service;
};
