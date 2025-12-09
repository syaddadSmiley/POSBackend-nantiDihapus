module.exports = {
    "up": `
    CREATE TABLE IF NOT EXISTS order_fnb (
        order_id varchar(255) NOT NULL,
        order_num int NOT NULL,
        date timestamp NOT NULL,
        dateclosebill timestamp NULL DEFAULT NULL,
        notes varchar(255) DEFAULT NULL,
        status varchar(255) DEFAULT 'pending',
        total int NOT NULL,
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (order_id),
        UNIQUE KEY order_id (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
    "down": ""
}