-- CreateTable
CREATE TABLE `logs` (
    `id` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `meta` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `logs_level_idx`(`level`),
    INDEX `logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `post_title` VARCHAR(191) NOT NULL,
    `post_content` TEXT NOT NULL,
    `post_excerpt` TEXT NULL,
    `post_status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `post_type` VARCHAR(191) NOT NULL DEFAULT 'post',
    `post_author` VARCHAR(191) NOT NULL,
    `post_name` VARCHAR(191) NOT NULL,
    `post_password` VARCHAR(191) NULL DEFAULT '',
    `comment_status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `ping_status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `to_ping` TEXT NULL,
    `pinged` TEXT NULL,
    `post_content_filtered` TEXT NULL,
    `post_mime_type` VARCHAR(191) NULL,
    `guid` VARCHAR(191) NULL,
    `post_parent` VARCHAR(191) NULL DEFAULT '',
    `menu_order` INTEGER NOT NULL DEFAULT 0,
    `comment_count` INTEGER NOT NULL DEFAULT 0,
    `post_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `post_date_gmt` DATETIME(3) NULL,
    `post_modified` DATETIME(3) NOT NULL,
    `post_modified_gmt` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `post_uuid` VARCHAR(191) NOT NULL,

    INDEX `posts_post_author_idx`(`post_author`),
    INDEX `posts_post_status_idx`(`post_status`),
    INDEX `posts_post_type_idx`(`post_type`),
    INDEX `posts_post_date_idx`(`post_date`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL DEFAULT '',
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vault` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `encrypted_value` VARCHAR(191) NOT NULL,
    `iv` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vault_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
