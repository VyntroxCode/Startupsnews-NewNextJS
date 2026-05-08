-- Add SEO robots field for per-post indexing control
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS robots VARCHAR(50) NULL DEFAULT 'index,follow' AFTER meta_description;
