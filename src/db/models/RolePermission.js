module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('roles', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        freezeTableName: true,
    });

    Role.associate = function(models) {
        // Satu Role punya banyak User
        Role.hasMany(models.users, {
            foreignKey: 'role_id',
            as: 'users'
        });
        // Satu Role punya banyak Permission
        Role.belongsToMany(models.permissions, {
            through: 'role_permissions',
            foreignKey: 'role_id',
            otherKey: 'permission_id',
            as: 'permissions'
        });
    };

    return Role;
};