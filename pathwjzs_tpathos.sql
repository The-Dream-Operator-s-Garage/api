-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jun 13, 2025 at 08:53 PM
-- Server version: 10.6.21-MariaDB-cll-lve-log
-- PHP Version: 8.3.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pathwjzs_tpathos`
--

-- --------------------------------------------------------

--
-- Table structure for table `entity`
--

CREATE TABLE `entity` (
  `id` int(11) NOT NULL,
  `path` text NOT NULL,
  `ancestor_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `entity_label`
--

CREATE TABLE `entity_label` (
  `entity_id` int(11) NOT NULL,
  `label_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `entity_property`
--

CREATE TABLE `entity_property` (
  `entity_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `label`
--

CREATE TABLE `label` (
  `id` int(11) NOT NULL,
  `path` text NOT NULL,
  `ancestor_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `login`
--

CREATE TABLE `login` (
  `id` varchar(255) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `password` text NOT NULL,
  `secret` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization`
--

CREATE TABLE `organization` (
  `id` int(11) NOT NULL,
  `path` text NOT NULL,
  `ancestor_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_entity`
--

CREATE TABLE `organization_entity` (
  `organization_id` int(11) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_label`
--

CREATE TABLE `organization_label` (
  `organization_id` int(11) NOT NULL,
  `label_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_property`
--

CREATE TABLE `organization_property` (
  `organization_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `owner_type`
--

CREATE TABLE `owner_type` (
  `id` int(11) NOT NULL,
  `type_name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `owner_type`
--

INSERT INTO `owner_type` (`id`, `type_name`, `created_at`) VALUES
(1, 'entity', '2025-05-23 20:36:53'),
(2, 'organization', '2025-05-23 20:36:53'),
(3, 'post', '2025-05-23 20:36:53'),
(4, 'tevent', '2025-05-23 20:36:53');

-- --------------------------------------------------------

--
-- Table structure for table `post`
--

CREATE TABLE `post` (
  `id` int(11) NOT NULL,
  `path` text NOT NULL,
  `ancestor_id` int(11) DEFAULT NULL,
  `owner_id` int(11) NOT NULL,
  `owner_type_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Triggers `post`
--
DELIMITER $$
CREATE TRIGGER `tr_post_owner_check` BEFORE INSERT ON `post` FOR EACH ROW BEGIN
    DECLARE owner_exists INT DEFAULT 0;
    DECLARE owner_type_name VARCHAR(50);
    
    SELECT type_name INTO owner_type_name 
    FROM owner_type 
    WHERE id = NEW.owner_type_id;
    
    IF owner_type_name = 'entity' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM entity 
        WHERE id = NEW.owner_id;
    ELSEIF owner_type_name = 'organization' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM organization 
        WHERE id = NEW.owner_id;
    END IF;
    
    IF owner_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid owner_id for the specified owner_type';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `post_label`
--

CREATE TABLE `post_label` (
  `post_id` int(11) NOT NULL,
  `label_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_property`
--

CREATE TABLE `post_property` (
  `post_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property`
--

CREATE TABLE `property` (
  `id` int(11) NOT NULL,
  `path` text NOT NULL,
  `owner_id` int(11) NOT NULL,
  `owner_type_id` int(11) NOT NULL,
  `property_key` varchar(255) NOT NULL,
  `property_value` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Triggers `property`
--
DELIMITER $$
CREATE TRIGGER `tr_property_owner_check` BEFORE INSERT ON `property` FOR EACH ROW BEGIN
    DECLARE owner_exists INT DEFAULT 0;
    DECLARE owner_type_name VARCHAR(50);
    
    SELECT type_name INTO owner_type_name 
    FROM owner_type 
    WHERE id = NEW.owner_type_id;
    
    IF owner_type_name = 'entity' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM entity 
        WHERE id = NEW.owner_id;
    ELSEIF owner_type_name = 'organization' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM organization 
        WHERE id = NEW.owner_id;
    ELSEIF owner_type_name = 'post' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM post 
        WHERE id = NEW.owner_id;
    ELSEIF owner_type_name = 'tevent' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM tevent 
        WHERE id = NEW.owner_id;
    END IF;
    
    IF owner_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid owner_id for the specified owner_type';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tevent`
--

CREATE TABLE `tevent` (
  `id` int(11) NOT NULL,
  `path` text NOT NULL,
  `start_timestamp` timestamp NULL DEFAULT NULL,
  `start_moment` text NOT NULL,
  `finish_timestamp` timestamp NULL DEFAULT NULL,
  `finish_moment` text NOT NULL,
  `ancestor_id` int(11) DEFAULT NULL,
  `owner_id` int(11) NOT NULL,
  `owner_type_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Triggers `tevent`
--
DELIMITER $$
CREATE TRIGGER `tr_tevent_owner_check` BEFORE INSERT ON `tevent` FOR EACH ROW BEGIN
    DECLARE owner_exists INT DEFAULT 0;
    DECLARE owner_type_name VARCHAR(50);
    
    SELECT type_name INTO owner_type_name 
    FROM owner_type 
    WHERE id = NEW.owner_type_id;
    
    IF owner_type_name = 'entity' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM entity 
        WHERE id = NEW.owner_id;
    ELSEIF owner_type_name = 'organization' THEN
        SELECT COUNT(*) INTO owner_exists 
        FROM organization 
        WHERE id = NEW.owner_id;
    END IF;
    
    IF owner_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid owner_id for the specified owner_type';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tevent_label`
--

CREATE TABLE `tevent_label` (
  `tevent_id` int(11) NOT NULL,
  `label_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tevent_property`
--

CREATE TABLE `tevent_property` (
  `tevent_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `secret`
--

CREATE TABLE `secret` (
  `id` int(11) NOT NULL,
  `path` text NOT NULL,
  `owner_id` int(11) NOT NULL,
  `owner_type_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `used_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `log_type`
--

CREATE TABLE `log_type` (
  `id` int(11) NOT NULL,
  `type_name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `log_type`
--

INSERT INTO `log_type` (`id`, `type_name`, `created_at`) VALUES
(1, 'system', '2025-06-13 20:36:53'),
(2, 'user_action', '2025-06-13 20:36:53'),
(3, 'api_call', '2025-06-13 20:36:53'),
(4, 'error', '2025-06-13 20:36:53'),
(5, 'security', '2025-06-13 20:36:53'),
(6, 'audit', '2025-06-13 20:36:53');

-- --------------------------------------------------------

--
-- Table structure for table `action_type`
--

CREATE TABLE `action_type` (
  `id` int(11) NOT NULL,
  `type_name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `action_type`
--

INSERT INTO `action_type` (`id`, `type_name`, `created_at`) VALUES
(1, 'create', '2025-06-13 20:36:53'),
(2, 'read', '2025-06-13 20:36:53'),
(3, 'update', '2025-06-13 20:36:53'),
(4, 'delete', '2025-06-13 20:36:53'),
(5, 'login', '2025-06-13 20:36:53'),
(6, 'logout', '2025-06-13 20:36:53'),
(7, 'register', '2025-06-13 20:36:53'),
(8, 'view', '2025-06-13 20:36:53');

-- --------------------------------------------------------

--
-- Table structure for table `tlog`
--

CREATE TABLE `tlog` (
  `id` int(11) NOT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `log_type_id` int(11) NOT NULL,
  `action_type_id` int(11) NOT NULL,
  `start_timestamp` timestamp NULL DEFAULT NULL,
  `start_moment` text NOT NULL,
  `finish_timestamp` timestamp NULL DEFAULT NULL,
  `finish_moment` text NOT NULL,
  `receiver_id` int(11) DEFAULT NULL,
  `path_id` text DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `entity`
--
ALTER TABLE `entity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_entity_ancestor` (`ancestor_id`),
  ADD KEY `idx_entity_path` (`path`(255));

--
-- Indexes for table `entity_label`
--
ALTER TABLE `entity_label`
  ADD PRIMARY KEY (`entity_id`,`label_id`),
  ADD KEY `idx_entity_label_label` (`label_id`);

--
-- Indexes for table `entity_property`
--
ALTER TABLE `entity_property`
  ADD PRIMARY KEY (`entity_id`,`property_id`),
  ADD KEY `idx_entity_property_property` (`property_id`);

--
-- Indexes for table `label`
--
ALTER TABLE `label`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_label_ancestor` (`ancestor_id`),
  ADD KEY `idx_label_path` (`path`(255));

--
-- Indexes for table `login`
--
ALTER TABLE `login`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_login_entity` (`entity_id`);

--
-- Indexes for table `organization`
--
ALTER TABLE `organization`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_organization_ancestor` (`ancestor_id`),
  ADD KEY `idx_organization_path` (`path`(255));

--
-- Indexes for table `organization_entity`
--
ALTER TABLE `organization_entity`
  ADD PRIMARY KEY (`organization_id`,`entity_id`),
  ADD KEY `idx_org_entity_entity` (`entity_id`);

--
-- Indexes for table `organization_label`
--
ALTER TABLE `organization_label`
  ADD PRIMARY KEY (`organization_id`,`label_id`),
  ADD KEY `idx_org_label_label` (`label_id`);

--
-- Indexes for table `organization_property`
--
ALTER TABLE `organization_property`
  ADD PRIMARY KEY (`organization_id`,`property_id`),
  ADD KEY `idx_org_property_property` (`property_id`);

--
-- Indexes for table `owner_type`
--
ALTER TABLE `owner_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_name` (`type_name`);

--
-- Indexes for table `post`
--
ALTER TABLE `post`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_type_id` (`owner_type_id`),
  ADD KEY `idx_post_ancestor` (`ancestor_id`),
  ADD KEY `idx_post_owner` (`owner_id`,`owner_type_id`),
  ADD KEY `idx_post_path` (`path`(255));

--
-- Indexes for table `post_label`
--
ALTER TABLE `post_label`
  ADD PRIMARY KEY (`post_id`,`label_id`),
  ADD KEY `idx_post_label_label` (`label_id`);

--
-- Indexes for table `post_property`
--
ALTER TABLE `post_property`
  ADD PRIMARY KEY (`post_id`,`property_id`),
  ADD KEY `idx_post_property_property` (`property_id`);

--
-- Indexes for table `property`
--
ALTER TABLE `property`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_type_id` (`owner_type_id`),
  ADD KEY `idx_property_owner` (`owner_id`,`owner_type_id`),
  ADD KEY `idx_property_key` (`property_key`),
  ADD KEY `idx_property_path` (`path`(255));

--
-- Indexes for table `tevent`
--
ALTER TABLE `tevent`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_type_id` (`owner_type_id`),
  ADD KEY `idx_tevent_ancestor` (`ancestor_id`),
  ADD KEY `idx_tevent_owner` (`owner_id`,`owner_type_id`),
  ADD KEY `idx_tevent_path` (`path`(255)),
  ADD KEY `idx_tevent_timestamps` (`start_timestamp`,`finish_timestamp`);

--
-- Indexes for table `tevent_label`
--
ALTER TABLE `tevent_label`
  ADD PRIMARY KEY (`tevent_id`,`label_id`),
  ADD KEY `idx_tevent_label_label` (`label_id`);

--
-- Indexes for table `tevent_property`
--
ALTER TABLE `tevent_property`
  ADD PRIMARY KEY (`tevent_id`,`property_id`),
  ADD KEY `idx_tevent_property_property` (`property_id`);

--
-- Indexes for table `secret`
--
ALTER TABLE `secret`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_type_id` (`owner_type_id`),
  ADD KEY `idx_secret_owner` (`owner_id`,`owner_type_id`),
  ADD KEY `idx_secret_path` (`path`(255));

--
-- Indexes for table `log_type`
--
ALTER TABLE `log_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_name` (`type_name`);

--
-- Indexes for table `action_type`
--
ALTER TABLE `action_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_name` (`type_name`);

--
-- Indexes for table `tlog`
--
ALTER TABLE `tlog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `log_type_id` (`log_type_id`),
  ADD KEY `action_type_id` (`action_type_id`),
  ADD KEY `idx_tlog_owner` (`owner_id`),
  ADD KEY `idx_tlog_receiver` (`receiver_id`),
  ADD KEY `idx_tlog_timestamps` (`start_timestamp`,`finish_timestamp`),
  ADD KEY `idx_tlog_created` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `entity`
--
ALTER TABLE `entity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `label`
--
ALTER TABLE `label`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization`
--
ALTER TABLE `organization`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owner_type`
--
ALTER TABLE `owner_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `post`
--
ALTER TABLE `post`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `property`
--
ALTER TABLE `property`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tevent`
--
ALTER TABLE `tevent`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `secret`
--
ALTER TABLE `secret`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `log_type`
--
ALTER TABLE `log_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `action_type`
--
ALTER TABLE `action_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tlog`
--
ALTER TABLE `tlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;