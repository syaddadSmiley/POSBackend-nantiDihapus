
module.exports = (sequelize, DataTypes) => {
    const ItemOptions = sequelize.define('item_options', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        item_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        name: {
            type:DataTypes.STRING,
            allowNull: false
        },
        add_price: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        timestamps: false,
    });
    ItemOptions.associate = function (models) {
        ItemOptions.belongsTo(models.items, { foreignKey: 'item_id', onDelete: 'CASCADE' });
    };
    
    return ItemOptions;
}
