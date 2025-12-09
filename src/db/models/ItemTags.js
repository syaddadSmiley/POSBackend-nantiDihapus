
module.exports = (sequelize, DataTypes) => {
    const ItemTags = sequelize.define('item_tags', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        item_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        tag: {
            type:DataTypes.STRING,
            allowNull: false
        },
    }, {
        freezeTableName: true,
        timestamps: false,
    });
    ItemTags.associate = function (models) {
        ItemTags.belongsTo(models.items, { foreignKey: 'item_id', onDelete: 'CASCADE' });
    };
    return ItemTags;
}
