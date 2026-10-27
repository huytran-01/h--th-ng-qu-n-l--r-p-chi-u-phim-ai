-- =========================================================================
-- HỆ THỐNG QUẢN LÝ RẠP CHIẾU PHIM CGV CULTUREPLEX TÍCH HỢP AI
-- Database Schema Script cho MySQL Server 8.0+
-- Bảng mã: UTF8MB4 (Hỗ trợ tiếng Việt có dấu và Emoji)
-- =========================================================================

CREATE DATABASE IF NOT EXISTS `cinema_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `cinema_db`;

-- 1. BẢNG CỤM RẠP (CINEMAS)
DROP TABLE IF EXISTS `booking_combos`;
DROP TABLE IF EXISTS `booking_seats`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `combos`;
DROP TABLE IF EXISTS `showtimes`;
DROP TABLE IF EXISTS `seats`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `cinemas`;
DROP TABLE IF EXISTS `movies`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `cinemas` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG PHÒNG CHIẾU (ROOMS)
CREATE TABLE `rooms` (
  `id` VARCHAR(50) NOT NULL,
  `cinema_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `format` VARCHAR(50) NOT NULL DEFAULT '2D',
  `total_seats` INT NOT NULL DEFAULT 48,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_rooms_cinemas_idx` (`cinema_id`),
  CONSTRAINT `fk_rooms_cinemas` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG GHẾ NGỒI (SEATS)
CREATE TABLE `seats` (
  `id` VARCHAR(20) NOT NULL,
  `room_id` VARCHAR(50) NOT NULL,
  `seat_row` VARCHAR(5) NOT NULL,
  `seat_number` INT NOT NULL,
  `seat_type` ENUM('STANDARD', 'VIP', 'SWEETBOX') NOT NULL DEFAULT 'STANDARD',
  `price_rate` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (`room_id`, `id`),
  CONSTRAINT `fk_seats_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG PHIM (MOVIES)
CREATE TABLE `movies` (
  `id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `original_title` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('NOW_SHOWING', 'COMING_SOON', 'ENDED') NOT NULL DEFAULT 'NOW_SHOWING',
  `duration_minutes` INT NOT NULL DEFAULT 120,
  `release_date` DATE DEFAULT NULL,
  `age_rating` VARCHAR(10) NOT NULL DEFAULT 'T13',
  `genres` JSON DEFAULT NULL,
  `formats` JSON DEFAULT NULL,
  `director` VARCHAR(255) DEFAULT NULL,
  `cast` JSON DEFAULT NULL,
  `imdb_rating` DECIMAL(3,1) DEFAULT 0.0,
  `trending_score` INT DEFAULT 80,
  `is_hot` TINYINT(1) DEFAULT 0,
  `poster_url` TEXT DEFAULT NULL,
  `banner_url` TEXT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_movies_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG SUẤT CHIẾU (SHOWTIMES)
CREATE TABLE `showtimes` (
  `id` VARCHAR(50) NOT NULL,
  `movie_id` VARCHAR(50) NOT NULL,
  `room_id` VARCHAR(50) NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `price` INT NOT NULL DEFAULT 110000,
  `format` VARCHAR(50) NOT NULL DEFAULT '2D',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_showtimes_movies_idx` (`movie_id`),
  KEY `fk_showtimes_rooms_idx` (`room_id`),
  CONSTRAINT `fk_showtimes_movies` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_showtimes_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG COMBO BẮP NƯỚC (COMBOS)
CREATE TABLE `combos` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` INT NOT NULL DEFAULT 0,
  `image_url` TEXT DEFAULT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG NGƯỜI DÙNG & THÀNH VIÊN (USERS) - 3 TÁC NHÂN: CUSTOMER, STAFF, ADMIN
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('CUSTOMER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `member_card_number` VARCHAR(50) DEFAULT NULL,
  `member_tier` VARCHAR(20) DEFAULT 'MEMBER',
  `points` INT DEFAULT 0,
  `total_spent` BIGINT DEFAULT 0,
  `favorite_genres` JSON DEFAULT NULL,
  `status` ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG ĐƠN ĐẶT VÉ (BOOKINGS)
CREATE TABLE `bookings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `booking_code` VARCHAR(50) NOT NULL UNIQUE,
  `qr_token` VARCHAR(255) NOT NULL UNIQUE,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `movie_id` VARCHAR(50) DEFAULT NULL,
  `showtime_id` VARCHAR(50) DEFAULT NULL,
  `seats` JSON NOT NULL,
  `combo_ids` JSON DEFAULT NULL,
  `ticket_total` INT NOT NULL DEFAULT 0,
  `combo_total` INT NOT NULL DEFAULT 0,
  `total` INT NOT NULL DEFAULT 0,
  `status` ENUM('PAID', 'CHECKED_IN', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PAID',
  `booked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `checked_in_at` TIMESTAMP NULL DEFAULT NULL,
  `checked_in_by` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_booking_code` (`booking_code`),
  UNIQUE KEY `idx_booking_qr` (`qr_token`),
  KEY `fk_bookings_users_idx` (`user_id`),
  KEY `fk_bookings_movies_idx` (`movie_id`),
  KEY `fk_bookings_showtimes_idx` (`showtime_id`),
  CONSTRAINT `fk_bookings_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bookings_movies` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bookings_showtimes` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
