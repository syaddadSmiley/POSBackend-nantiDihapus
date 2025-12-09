// file: src/db/models/Shifts.js

module.exports = (sequelize, DataTypes) => {
    const Shifts = sequelize.define('shifts', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        user_id: { 
            type: DataTypes.STRING, // <-- UBAH KE STRING (sesuai id_user)
            allowNull: false,
            references: {
                model: 'users',
                key: 'id_user'
            }
        },
        start_cash: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        end_cash: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        expected_cash: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        end_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'open'
        }
    }, {
        freezeTableName: true,
        timestamps: true, 
    });

    Shifts.associate = function (models) {
        // Sesuaikan foreignKey di sini juga jika perlu, 
        // tapi biasanya Sequelize cukup pintar mendeteksi dari definisi di atas.
        Shifts.belongsTo(models.users, { 
            foreignKey: 'user_id',  as: 'user' 
        });
    };

    return Shifts;
}