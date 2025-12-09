

module.exports = (sequelize, DataTypes) => {
    const MembershipPackage = sequelize.define('membership_packages', {
        package_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        package_name: {
            type: DataTypes.ENUM('Silver', 'Gold', 'Platinum'),
            allowNull: false,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        total_services: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        discount_rate: DataTypes.DECIMAL(5, 2),
    }, {
        freezeTableName: true,
    });

    return MembershipPackage;
};
