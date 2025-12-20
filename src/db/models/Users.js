
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define('users', {
        id: {
            type: DataTypes.INTEGER, // Ubah jadi INTEGER
            primaryKey: true,
            autoIncrement: true,     // Tambahkan Auto Increment
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: DataTypes.STRING,
        pin: { 
            type: DataTypes.STRING, 
            allowNull: true,
            defaultValue: null
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'roles',
                key: 'id'
            }
        },
        loggedin: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        salary: {
             type: DataTypes.DECIMAL(10, 2),
             defaultValue: 0
        },
    }, {
        freezeTableName: true,
        hooks: {
            beforeCreate: async (user) => {
                // Enkripsi Password jika ada
                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
                // Enkripsi PIN jika ada
                if (user.pin) {
                    user.pin = await bcrypt.hash(user.pin, 10);
                }
            },
            beforeUpdate: async (user) => {
                // Hanya enkripsi jika field BERUBAH
                if (user.changed('password')) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
                if (user.changed('pin')) {
                    user.pin = await bcrypt.hash(user.pin, 10);
                }
            }
        }
    });
    Users.associate = function (models) {
        // associations can be defined here
        Users.hasMany(models.orders, {
            foreignKey: 'user_id',
            as: 'orders'
        });
        
        // Relasi ke Shifts (Jika ada)
        if(models.shifts) {
            Users.hasMany(models.shifts, {
                foreignKey: 'user_id',
                as: 'shifts'
            });
        }

        Users.belongsTo(models.roles, {
            foreignKey: 'role_id',
            as: 'role' // Kita akan panggil user.role.name nanti
        });
    };
    return Users;
}
