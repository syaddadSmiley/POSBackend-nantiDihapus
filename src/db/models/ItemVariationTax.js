module.exports = (sequelize, DataTypes) => {
    const ItemVariationTaxes = sequelize.define('item_variation_taxes', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        item_variation_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'item_variations',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        tax_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'taxes',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    }, {
        tableName: 'item_variation_taxes',
        timestamps: true
    });

    return ItemVariationTaxes;
};