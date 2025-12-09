
module.exports = (sequelize, DataTypes) => {
    const MenuTypes = sequelize.define('menu_types', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        name: DataTypes.STRING,
    }, {
        freezeTableName: true,
        timestamps: false,
    });
    MenuTypes.associate = function (models) {
        MenuTypes.hasMany(models.categories, { foreignKey: 'menu_type_id', onDelete: 'CASCADE' });
    };
    return MenuTypes;
}
