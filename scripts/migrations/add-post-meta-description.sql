-- Add SEO meta description field for manual/admin posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(160) NULL AFTER excerpt;
