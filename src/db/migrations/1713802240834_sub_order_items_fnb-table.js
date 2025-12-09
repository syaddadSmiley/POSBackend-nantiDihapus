module.exports = {
    "up": `
        CREATE TABLE IF NOT EXISTS sub_order_items_fnb (
            id INT NOT NULL AUTO_INCREMENT,
            item_id VARCHAR(255) NOT NULL,
            component_name varchar(255) NOT NULL,
            component_price INT NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY (item_id) REFERENCES order_items_fnb(id_primary_key)
        );`,
    "down": ""
}