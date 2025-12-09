

module.exports = (sequelize, DataTypes) => {
    const Transaction = sequelize.define('transactions', {
        transaction_id: {
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
        service_type: DataTypes.STRING,
        service_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        rfid_id: {
            type: DataTypes.STRING,
            references: {
                model: 'rfid_cards',
                key: 'rfid_id',
            }
        },
        amount: {
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

    return Transaction;
};
