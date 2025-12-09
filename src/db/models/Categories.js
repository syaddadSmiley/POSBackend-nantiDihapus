
module.exports = (sequelize, DataTypes) => {
    const Categories = sequelize.define('categories', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        menu_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        name: DataTypes.STRING,
    }, {
        freezeTableName: true,
        timestamps: false,
    });
    Categories.associate = function (models) {
        // associations can be defined here
        // setTimeout(()=>{
        Categories.belongsTo(models.menu_types, { foreignKey: 'menu_type_id', onDelete: 'CASCADE' });
        Categories.hasMany(models.items, { foreignKey: 'category_id', onDelete: 'CASCADE' });
        // }, 100)
        
    };
    return Categories;
}
