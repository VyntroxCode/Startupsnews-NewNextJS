-- Add 'scheduled' to posts status enum
ALTER TABLE posts
  MODIFY COLUMN status ENUM('draft', 'published', 'archived', 'scheduled') DEFAULT 'draft';
