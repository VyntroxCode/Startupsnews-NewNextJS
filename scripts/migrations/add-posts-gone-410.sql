-- Add 410 Gone marker for posts.
-- This keeps editorial status (draft/published/archived) separate from HTTP serving status.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_gone_410 TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

CREATE INDEX IF NOT EXISTS idx_posts_is_gone_410 ON posts(is_gone_410);
