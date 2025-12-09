module.exports = (sequelize, DataTypes) => {
    const Permission = sequelize.define('permissions', {
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
        },
        description: DataTypes.STRING
    }, {
        freezeTableName: true,
    });

    Permission.associate = function(models) {
        Permission.belongsToMany(models.roles, {
            through: 'role_permissions',
            foreignKey: 'permission_id',
            otherKey: 'role_id',
            as: 'roles'
        });
    };

    return Permission;
};