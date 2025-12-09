

module.exports = (sequelize, DataTypes) => {
    const Benefit = sequelize.define('benefits', {
        benefit_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        member_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'members',
                key: 'member_id',
            }
        },
        benefit_type: {
            type: DataTypes.ENUM('birthday_voucher', 'discount', 'promotion'),
            allowNull: false,
        },
        benefit_value: DataTypes.DECIMAL(10, 2),
        expiry_date: DataTypes.DATE,
        status: {
            type: DataTypes.ENUM('used', 'unused'),
            defaultValue: 'unused',
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

    return Benefit;
};
