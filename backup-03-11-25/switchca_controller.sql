-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 03, 2025 at 10:48 AM
-- Server version: 11.4.8-MariaDB
-- PHP Version: 8.4.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `switchca_controller`
--

-- --------------------------------------------------------

--
-- Table structure for table `db_list`
--

CREATE TABLE `db_list` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL,
  `title` varchar(20) NOT NULL,
  `short_title` varchar(12) NOT NULL,
  `max_user` int(11) NOT NULL,
  `production` tinyint(1) NOT NULL,
  `primary_user` int(11) NOT NULL,
  `max_product` int(11) NOT NULL,
  `max_customer` int(11) NOT NULL,
  `phone` varchar(11) NOT NULL,
  `address` varchar(40) NOT NULL,
  `alt_phone` varchar(11) NOT NULL,
  `owner_name` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `db_list`
--

INSERT INTO `db_list` (`id`, `name`, `title`, `short_title`, `max_user`, `production`, `primary_user`, `max_product`, `max_customer`, `phone`, `address`, `alt_phone`, `owner_name`) VALUES
(101, 'switchca_switchcafe', 'Switch Cafe bd', 'Switch Cafe', 10, 1, 1, 30, 200, '01888117761', 'Dawlatpur, Cumilla shodor', '01888117762', 'Mir Hossain'),
(102, 'switchca_hazera_enterprise', 'Hazera Enterprise', 'Hazera Ent.', 10, 0, 1, 20, 250, '01888117761', 'Dawlatpur, Cumilla shodor', '01888117762', 'Mir Hossain'),
(103, 'switchca_laksham', 'Laksham', 'Laksham', 10, 0, 1, 20, 200, '01894433711', 'Jonson bazar, Laksham', '01894433714', 'Mir Hossain'),
(104, 'switchca_tasmiya_enterprise', 'Tasmiya Enterprise', 'Tasmiya Ent.', 10, 0, 1, 20, 200, '01894433710', 'Goripur, Daudkani', '01888117768', 'Emdad Hossen'),
(106, 'switchca_mh_enterprise', 'MH Enterprise', 'MH Enterpris', 5, 0, 1, 20, 100, '0194433710', 'Dagonbhuya', '0194433710', 'Emdad Hossen');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `db_list`
--
ALTER TABLE `db_list`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `db_list`
--
ALTER TABLE `db_list`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
