
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
        }
    }, {
        freezeTableName: true,
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
