

module.exports = (sequelize, DataTypes) => {
    const Member = sequelize.define('members', {
        member_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: DataTypes.STRING,
        phone_number: {
            type: DataTypes.STRING,
            allowNull: false
        },
        plat_mobil: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,  // Enforce unique constraint in Sequelize
        },
        merk_mobil: {
            type: DataTypes.STRING,
            allowNull: false
        },
        warna_mobil: DataTypes.STRING,
        date_of_birth: DataTypes.DATE,
        registration_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active',
        },
    }, {
        freezeTableName: true,
    });

    return Member;
};
