

module.exports = (sequelize, DataTypes) => {
    const RFIDCard = sequelize.define('rfid_cards', {
        rfid_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        member_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'members',
                key: 'member_id'
            }
        },
        card_issued_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        card_status: {
            type: DataTypes.ENUM('active', 'lost', 'replaced'),
            defaultValue: 'active',
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

    return RFIDCard;
};
