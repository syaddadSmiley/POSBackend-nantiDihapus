-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: localhost    Database: sakila
-- ------------------------------------------------------
-- Server version	8.0.36

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `menu_type_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `menu_type_id` (`menu_type_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`menu_type_id`) REFERENCES `menu_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,1,'Food'),(2,1,'Drinks'),(3,1,'Drink Add-ons'),(4,2,'Cuci Mobil'),(5,2,'Cuci Mobil Wex'),(6,2,'Cuci Motor'),(7,2,'Cuci Motor Wex'),(8,2,'Detailing Body and Kaca'),(9,2,'Full Detailing'),(10,2,'Paket Buang Jamur'),(11,2,'Interior'),(12,2,'Mesin Engine Detailing'),(13,2,'Primer Wash');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_options`
--

DROP TABLE IF EXISTS `item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` varchar(10) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `add_price` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_options_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_options`
--

LOCK TABLES `item_options` WRITE;
/*!40000 ALTER TABLE `item_options` DISABLE KEYS */;
INSERT INTO `item_options` VALUES (1,'f004','Ayam',0.00),(2,'f004','Kepiting',0.00),(3,'f004','Nori',0.00),(4,'f004','Lumpia',0.00),(5,'f004','Kulit Tahu',0.00),(6,'f005','Daging',0.00),(7,'f005','Coklat',0.00),(8,'f005','Keju',0.00),(9,'f005','Taro',0.00),(10,'f005','Pandan',0.00),(11,'f006','Rebus',0.00),(12,'f006','Goreng',0.00),(13,'d001','Hot',0.00),(14,'d001','Ice',3000.00),(15,'d002','Hot',0.00),(16,'d002','Ice',3000.00),(17,'d005','Hot',0.00),(18,'d005','Ice',3000.00),(19,'d006','Hot',0.00),(20,'d006','Ice',3000.00),(21,'d007','Hot',0.00),(22,'d007','Ice',3000.00),(23,'d009','Hot',0.00),(24,'d009','Ice',2000.00),(25,'d010','Hot',0.00),(26,'d010','Ice',3000.00),(27,'d013','Hot',0.00),(28,'d013','Ice',3000.00);
/*!40000 ALTER TABLE `item_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_tags`
--

DROP TABLE IF EXISTS `item_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` varchar(10) DEFAULT NULL,
  `tag` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_tags_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_tags`
--

LOCK TABLES `item_tags` WRITE;
/*!40000 ALTER TABLE `item_tags` DISABLE KEYS */;
INSERT INTO `item_tags` VALUES (1,'d003','Kopi'),(2,'d004','Kopi'),(3,'d013','Kopi');
/*!40000 ALTER TABLE `item_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` varchar(10) NOT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `price_string` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES ('c001',4,'Small',45000.00,'Rp 45,000'),('c002',4,'Medium',50000.00,'Rp 50,000'),('c003',4,'Large',55000.00,'Rp 55,000'),('c004',4,'Extra Large',60000.00,'Rp 60,000'),('cw001',5,'Small',85000.00,'Rp 85,000'),('cw002',5,'Medium',90000.00,'Rp 90,000'),('cw003',5,'Large',95000.00,'Rp 95,000'),('cw004',5,'Extra Large',100000.00,'Rp 100,000'),('d001',2,'Teh Tawar',5000.00,'Rp 5,000'),('d002',2,'Teh Manis',7000.00,'Rp 7,000'),('d003',2,'Vietnam Drip (Hot)',15000.00,'Rp 15,000'),('d004',2,'Kopi Susu Gula Aren (Ice)',20000.00,'Rp 20,000'),('d005',2,'Matcha',15000.00,'Rp 15,000'),('d006',2,'Chocolate',15000.00,'Rp 15,000'),('d007',2,'Taro',15000.00,'Rp 15,000'),('d008',2,'Air Mineral',5000.00,'Rp 5,000'),('d009',2,'Lemon Tea',13000.00,'Rp 13,000'),('d010',2,'Thai Tea',15000.00,'Rp 15,000'),('d011',2,'Dark Chocolate',15000.00,'Rp 15,000'),('d012',2,'Free Coffee',10000.00,'Rp 10,000'),('d013',2,'Kopi Americano',15000.00,'Rp 15,000'),('da001',3,'Mie',5000.00,'Rp 5,000'),('da002',3,'Telur',4000.00,'Rp 4,000'),('da003',3,'1 Shot Espresso',5000.00,'Rp 5,000'),('dbg001',8,'Small Exterior',600000.00,'Rp 600,000'),('dbg002',8,'Medium Ekterior',800000.00,'Rp 800,000'),('dbg003',8,'Large',1000000.00,'Rp 1,000,000'),('dbg004',8,'Extra Large',1200000.00,'Rp 1,200,000'),('ed001',12,'Small',300000.00,'Rp 300,000'),('ed002',12,'Medium',400000.00,'Rp 400,000'),('ed003',12,'Large',500000.00,'Rp 500,000'),('ed004',12,'Extra Large',600000.00,'Rp 600,000'),('f001',1,'Nasi Goreng Kampung',25000.00,'Rp 25,000'),('f002',1,'Baso Aci',20000.00,'Rp 20,000'),('f003',1,'Cuanki',20000.00,'Rp 20,000'),('f004',1,'Dimsum (3pcs)',15000.00,'Rp 15,000'),('f005',1,'Bapao (3 Pcs)',15000.00,'Rp 15,000'),('f006',1,'Mie',13000.00,'Rp 13,000'),('f007',1,'Voucher 25k',25000.00,'Rp 25,000'),('fd001',9,'Small',1200000.00,'Rp 1,200,000'),('fd002',9,'Medium',1600000.00,'Rp 1,600,000'),('fd003',9,'Large',1800000.00,'Rp 1,800,000'),('fd004',9,'Extra Large',2000000.00,'Rp 2,000,000'),('i001',11,'Small',450000.00,'Rp 450,000'),('i002',11,'Medium',550000.00,'Rp 550,000'),('i003',11,'Large',650000.00,'Rp 650,000'),('i004',11,'Extra Large',700000.00,'Rp 700,000'),('m001',6,'Small',15000.00,'Rp 15,000'),('m002',6,'Medium',20000.00,'Rp 20,000'),('m003',6,'Large',25000.00,'Rp 25,000'),('m004',6,'Moge 250 UP',100000.00,'Rp 100,000'),('mw001',7,'Small',45000.00,'Rp 45,000'),('mw002',7,'Medium',50000.00,'Rp 50,000'),('mw003',7,'Large',55000.00,'Rp 55,000'),('mw004',7,'Moge 250 UP',200000.00,'Rp 200,000'),('pbj001',10,'Small',300000.00,'Rp 300,000'),('pbj002',10,'Medium',350000.00,'Rp 350,000'),('pbj003',10,'Large',400000.00,'Rp 400,000'),('pbj004',10,'Extra Large',450000.00,'Rp 450,000'),('pw001',13,'All Unit',350000.00,'Rp 350,000');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_types`
--

DROP TABLE IF EXISTS `menu_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_types`
--

LOCK TABLES `menu_types` WRITE;
/*!40000 ALTER TABLE `menu_types` DISABLE KEYS */;
INSERT INTO `menu_types` VALUES (1,'Food & Drinks'),(2,'Car Services');
/*!40000 ALTER TABLE `menu_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_carwash`
--

DROP TABLE IF EXISTS `order_carwash`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_carwash` (
  `order_id` varchar(255) NOT NULL,
  `order_num` int NOT NULL,
  `date` timestamp NOT NULL,
  `dateclosebill` timestamp NULL DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `total` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_fnb`
--

DROP TABLE IF EXISTS `order_fnb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_fnb` (
  `order_id` varchar(255) NOT NULL,
  `order_num` int NOT NULL,
  `date` timestamp NOT NULL,
  `dateclosebill` timestamp NULL DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pending',
  `total` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_items_carwash`
--

DROP TABLE IF EXISTS `order_items_carwash`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items_carwash` (
  `id_primary_key` varchar(255) NOT NULL,
  `id` varchar(255) NOT NULL,
  `order_id` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_price` int NOT NULL,
  `sub_total_price` int NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id_primary_key`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_items_carwash_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `order_carwash` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_items_fnb`
--

DROP TABLE IF EXISTS `order_items_fnb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items_fnb` (
  `id_primary_key` varchar(255) NOT NULL,
  `id` varchar(255) NOT NULL,
  `order_id` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_price` int NOT NULL,
  `sub_total_price` int NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id_primary_key`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_items_fnb_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `order_fnb` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sub_order_items_carwash`
--

DROP TABLE IF EXISTS `sub_order_items_carwash`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_order_items_carwash` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` varchar(255) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_price` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `sub_order_items_carwash_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `order_items_carwash` (`id_primary_key`)
) ENGINE=InnoDB AUTO_INCREMENT=2264 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sub_order_items_fnb`
--

DROP TABLE IF EXISTS `sub_order_items_fnb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_order_items_fnb` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` varchar(255) NOT NULL,
  `component_name` varchar(255) NOT NULL,
  `component_price` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `sub_order_items_fnb_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `order_items_fnb` (`id_primary_key`)
) ENGINE=InnoDB AUTO_INCREMENT=545 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id_user` varchar(255) NOT NULL,
  `name` varchar(50) NOT NULL,
  `email` varchar(30) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('staff','supervisor','owner') NOT NULL DEFAULT 'staff',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

CREATE TABLE `db_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `action_type` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    `table_name` VARCHAR(255) NOT NULL,
    `record_id` VARCHAR(255) NOT NULL,
    `old_values` JSON DEFAULT NULL,
    `new_values` JSON DEFAULT NULL,
    `changed_by` VARCHAR(255) NOT NULL,
    `transaction_id` VARCHAR(255) DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `reason` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('mysterious_id','Atmin','claynomercy@gmail.com','$2a$10$W9kuF2XMuxZ6zHa8v5pJ9O4yzShldeCSnUMnD644Jt4FIshQ/mQ92','owner','2027-07-07 07:07:07','2027-07-07 07:07:07');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-09-06 15:34:49
