/*
  Warnings:

  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `posts`;

-- CreateTable
CREATE TABLE `wpny_posts` (
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

    INDEX `wpny_posts_post_author_idx`(`post_author`),
    INDEX `wpny_posts_post_status_idx`(`post_status`),
    INDEX `wpny_posts_post_type_idx`(`post_type`),
    INDEX `wpny_posts_post_date_idx`(`post_date`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
