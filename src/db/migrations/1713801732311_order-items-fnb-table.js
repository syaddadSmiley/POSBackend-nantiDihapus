module.exports = {
    "up": `
        CREATE TABLE IF NOT EXISTS order_items_fnb (
            id_primary_key VARCHAR(255) NOT NULL,
            id VARCHAR(255) NOT NULL,
            order_id VARCHAR(255) NOT NULL,
            item_name VARCHAR(255) NOT NULL,
            item_price INT NOT NULL,
            sub_total_price INT NOT NULL,
            quantity INT NOT NULL,
            PRIMARY KEY (id_primary_key),
            FOREIGN KEY (order_id) REFERENCES order_fnb(order_id)
        );`,
    "down": ""
}