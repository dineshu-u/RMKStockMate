-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: food
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES (1,'PONNI RICE','GROCERY'),(2,'BASMATI RICE','GROCERY'),(3,'TOOR DAL','GROCERY'),(4,'MOONG DAL','GROCERY'),(5,'URAD DAL','GROCERY'),(6,'WHEAT FLOUR','GROCERY'),(7,'SUGAR','GROCERY'),(8,'SUNFLOWER OIL','PROVISIONS'),(9,'GHEE','DAIRY'),(10,'MILK','DAIRY'),(11,'CURD','DAIRY'),(12,'PANEER','DAIRY'),(13,'POTATO','VEGETABLES'),(14,'ONION','VEGETABLES'),(15,'TOMATO','VEGETABLES'),(16,'CARROT','VEGETABLES'),(17,'BEANS','VEGETABLES'),(18,'TEA POWDER','PROVISIONS'),(19,'COFFEE POWDER','PROVISIONS'),(20,'APPLES','FRUITS'),(21,'BANANAS','FRUITS'),(22,'gulfi','DAIRY');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `closingstock`
--

DROP TABLE IF EXISTS `closingstock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `closingstock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `date` date NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `closingstock`
--

LOCK TABLES `closingstock` WRITE;
/*!40000 ALTER TABLE `closingstock` DISABLE KEYS */;
INSERT INTO `closingstock` VALUES (1,'PONNI RICE',400.00,'2026-08-05','GROCERY'),(2,'TOOR DAL',100.00,'2026-08-05','GROCERY'),(3,'GHEE',30.00,'2026-08-05','DAIRY'),(4,'PONNI RICE',520.00,'2026-09-05','GROCERY'),(5,'TOOR DAL',140.00,'2026-09-05','GROCERY'),(6,'GHEE',45.00,'2026-09-05','DAIRY'),(7,'PONNI RICE',650.00,'2026-10-05','GROCERY'),(8,'TOOR DAL',180.00,'2026-10-05','GROCERY'),(9,'GHEE',60.00,'2026-10-05','DAIRY');
/*!40000 ALTER TABLE `closingstock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `current`
--

DROP TABLE IF EXISTS `current`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `current` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT '0.00',
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `current`
--

LOCK TABLES `current` WRITE;
/*!40000 ALTER TABLE `current` DISABLE KEYS */;
INSERT INTO `current` VALUES (1,'PONNI RICE','GROCERY',650.00,'2026-10-05'),(2,'BASMATI RICE','GROCERY',200.00,'2026-10-05'),(3,'TOOR DAL','GROCERY',180.00,'2026-10-05'),(4,'MOONG DAL','GROCERY',90.00,'2026-10-05'),(5,'URAD DAL','GROCERY',110.00,'2026-10-05'),(6,'WHEAT FLOUR','GROCERY',300.00,'2026-10-05'),(7,'SUGAR','GROCERY',150.00,'2026-10-05'),(8,'SUNFLOWER OIL','PROVISIONS',280.00,'2026-10-05'),(9,'GHEE','DAIRY',60.00,'2026-10-05'),(10,'MILK','DAIRY',180.00,'2026-10-05'),(11,'CURD','DAIRY',120.00,'2026-10-05'),(12,'PANEER','DAIRY',55.00,'2026-10-05'),(13,'POTATO','VEGETABLES',240.00,'2026-10-05'),(14,'ONION','VEGETABLES',210.00,'2026-10-05'),(15,'TOMATO','VEGETABLES',130.00,'2026-10-05'),(16,'CARROT','VEGETABLES',85.00,'2026-10-05'),(17,'BEANS','VEGETABLES',70.00,'2026-10-05'),(18,'TEA POWDER','PROVISIONS',40.00,'2026-10-05'),(19,'COFFEE POWDER','PROVISIONS',30.00,'2026-10-05'),(20,'APPLES','FRUITS',50.00,'2026-10-05'),(21,'BANANAS','FRUITS',100.00,'2026-10-05'),(22,'gulfi','DAIRY',0.00,NULL);
/*!40000 ALTER TABLE `current` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch1`
--

DROP TABLE IF EXISTS `dispatch1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch1` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  `RMK` decimal(10,2) DEFAULT '0.00',
  `RMD` decimal(10,2) DEFAULT '0.00',
  `RMKCET` decimal(10,2) DEFAULT '0.00',
  `RMKSCHOOL` decimal(10,2) DEFAULT '0.00',
  `date` date NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch1`
--

LOCK TABLES `dispatch1` WRITE;
/*!40000 ALTER TABLE `dispatch1` DISABLE KEYS */;
INSERT INTO `dispatch1` VALUES (1,'PONNI RICE',220.00,160.00,120.00,60.00,'2026-08-02','GROCERY'),(2,'MILK',40.00,30.00,20.00,10.00,'2026-08-02','DAIRY'),(3,'GHEE',12.00,10.00,8.00,4.00,'2026-08-01','DAIRY'),(4,'POTATO',60.00,45.00,40.00,20.00,'2026-08-03','VEGETABLES'),(5,'PONNI RICE',300.00,220.00,180.00,80.00,'2026-09-02','GROCERY'),(6,'MILK',60.00,40.00,30.00,15.00,'2026-09-02','DAIRY'),(7,'GHEE',18.00,14.00,10.00,6.00,'2026-09-01','DAIRY'),(8,'POTATO',80.00,55.00,50.00,25.00,'2026-09-03','VEGETABLES'),(9,'ONION',70.00,45.00,40.00,20.00,'2026-09-01','VEGETABLES'),(10,'PANEER',15.00,12.00,10.00,5.00,'2026-09-02','DAIRY'),(11,'PONNI RICE',160.00,120.00,90.00,40.00,'2026-10-03','GROCERY'),(12,'MILK',50.00,35.00,25.00,10.00,'2026-10-04','DAIRY'),(13,'POTATO',40.00,30.00,30.00,15.00,'2026-10-05','VEGETABLES'),(14,'ONION',35.00,25.00,25.00,10.00,'2026-10-05','VEGETABLES');
/*!40000 ALTER TABLE `dispatch1` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_name` varchar(255) NOT NULL,
  `institution` varchar(255) NOT NULL,
  `event_date` date NOT NULL,
  `meal_details` json NOT NULL,
  `day` varchar(50) DEFAULT NULL,
  `no_of_people` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (1,'International Conference on Smart Computing (ICSC)','RMK Engineering College','2026-10-08','[{\"items\": [{\"name\": \"Ghee Pongal & Sambar\", \"type\": \"Veg\", \"quantity\": \"350 Nos\"}, {\"name\": \"Medu Vada & Chutney\", \"type\": \"Veg\", \"quantity\": \"350 Nos\"}, {\"name\": \"Fresh Filter Coffee\", \"type\": \"Common\", \"quantity\": \"40 Ltr\"}], \"mealType\": \"Breakfast\"}, {\"items\": [{\"name\": \"Paneer Biryani & Raita\", \"type\": \"Veg\", \"quantity\": \"50 Kg\"}, {\"name\": \"Mutton Biryani\", \"type\": \"Non-Veg\", \"quantity\": \"80 Kg\"}, {\"name\": \"Gulab Jamun with Ice Cream\", \"type\": \"Common\", \"quantity\": \"350 Cups\"}], \"mealType\": \"Lunch\"}, {\"items\": [{\"name\": \"Cashew Pakoda\", \"type\": \"Veg\", \"quantity\": \"30 Kg\"}, {\"name\": \"Masala Tea\", \"type\": \"Common\", \"quantity\": \"35 Ltr\"}], \"mealType\": \"Snacks\"}]','Thursday',350),(2,'State Level Youth Technical Symposium','R.M.D. Engineering College','2026-10-12','[{\"items\": [{\"name\": \"Idli & Vada combo\", \"type\": \"Veg\", \"quantity\": \"500 Sets\"}, {\"name\": \"Tea / Coffee\", \"type\": \"Common\", \"quantity\": \"50 Ltr\"}], \"mealType\": \"Breakfast\"}, {\"items\": [{\"name\": \"South Indian Feast Meals\", \"type\": \"Veg\", \"quantity\": \"450 Meals\"}, {\"name\": \"Chicken Curry\", \"type\": \"Non-Veg\", \"quantity\": \"250 Servings\"}], \"mealType\": \"Lunch\"}]','Monday',450);
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase`
--

DROP TABLE IF EXISTS `purchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `amountkg` decimal(10,2) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase`
--

LOCK TABLES `purchase` WRITE;
/*!40000 ALTER TABLE `purchase` DISABLE KEYS */;
INSERT INTO `purchase` VALUES (1,'PONNI RICE','GROCERY',600.00,50.00,30000.00,'2026-08-01'),(2,'TOOR DAL','GROCERY',120.00,135.00,16200.00,'2026-08-02'),(3,'SUNFLOWER OIL','PROVISIONS',180.00,125.00,22500.00,'2026-08-03'),(4,'GHEE','DAIRY',40.00,520.00,20800.00,'2026-08-01'),(5,'MILK','DAIRY',120.00,46.00,5520.00,'2026-08-02'),(6,'POTATO','VEGETABLES',180.00,28.00,5040.00,'2026-08-03'),(7,'ONION','VEGETABLES',150.00,36.00,5400.00,'2026-08-01'),(8,'PONNI RICE','GROCERY',850.00,52.00,44200.00,'2026-09-01'),(9,'TOOR DAL','GROCERY',160.00,140.00,22400.00,'2026-09-02'),(10,'SUNFLOWER OIL','PROVISIONS',220.00,130.00,28600.00,'2026-09-03'),(11,'GHEE','DAIRY',55.00,540.00,29700.00,'2026-09-01'),(12,'MILK','DAIRY',160.00,48.00,7680.00,'2026-09-02'),(13,'POTATO','VEGETABLES',220.00,32.00,7040.00,'2026-09-03'),(14,'ONION','VEGETABLES',190.00,40.00,7600.00,'2026-09-01'),(15,'PANEER','DAIRY',45.00,340.00,15300.00,'2026-09-02'),(16,'TOMATO','VEGETABLES',100.00,34.00,3400.00,'2026-09-03'),(17,'PONNI RICE','GROCERY',500.00,54.00,27000.00,'2026-10-02'),(18,'MILK','DAIRY',150.00,50.00,7500.00,'2026-10-03'),(19,'POTATO','VEGETABLES',140.00,34.00,4760.00,'2026-10-04'),(20,'ONION','VEGETABLES',120.00,42.00,5040.00,'2026-10-05'),(21,'TOMATO','VEGETABLES',80.00,38.00,3040.00,'2026-10-05'),(22,'GHEE','DAIRY',30.00,550.00,16500.00,'2026-10-05');
/*!40000 ALTER TABLE `purchase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uname` varchar(255) NOT NULL,
  `pass` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uname` (`uname`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'avinash','$2a$10$FoVfZwFcT1uQ0Yw4p4kHC.sycgVIGiJoAlHvxzNPtHH/lk1FcnqfC','Admin'),(2,'admin','$2b$10$FRU68G8mUZHQty1qf6QxUOBQK9jeeJv66WXBMoTGABO388KWdXbcy','Admin');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text,
  `license_no` varchar(255) DEFAULT NULL,
  `validity` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES (1,'Sri Balaji Provision Stores','No. 12, Trunk Road, Gummidipundi, Chennai - 601201','FSSAI-12421001000452','2027-12-31'),(2,'Arogya Dairy Products Ltd','Plot 45, SIPCOT Industrial Park, Gummidipundi','FSSAI-12419002000891','2028-06-30'),(3,'Kaveri Vegetable Wholesale','Shop 7, Koyambedu Market, Chennai - 600092','FSSAI-12423004001210','2027-08-15'),(4,'Annapurna Rice & Grains','34, G.N.T. Road, Kavaraipettai, Tamil Nadu','FSSAI-12420003000734','2028-03-31'),(5,'Supreme Spices & Oils','Plot 88, Ambattur Industrial Estate, Chennai','FSSAI-12422005001188','2027-11-20');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-05 14:12:21
