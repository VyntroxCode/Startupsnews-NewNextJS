-- Map some published posts to the Robotics category so the Robotics section shows content.
-- Prerequisite: categories table has slug 'robotics' (e.g. after replace-categories-with-12.sql).
-- Usage: mysql -u ... -p zox_db < scripts/migrations/map-posts-to-robotics.sql

SET @robotics_id = (SELECT id FROM categories WHERE slug = 'robotics' LIMIT 1);

-- If Robotics category doesn't exist, ensure it exists
INSERT INTO categories (name, slug, sort_order)
SELECT 'Robotics', 'robotics', 4
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'robotics' LIMIT 1);

SET @robotics_id = (SELECT id FROM categories WHERE slug = 'robotics' LIMIT 1);

-- Move up to 15 published posts (that have content and an image) from other categories into Robotics.
-- Picks the most recently updated posts so we get a mix without wiping any category.
UPDATE posts p
INNER JOIN (
  SELECT id FROM posts
  WHERE status = 'published'
    AND category_id != @robotics_id
    AND content IS NOT NULL AND TRIM(content) != ''
    AND (featured_image_url IS NOT NULL AND TRIM(featured_image_url) != '')
  ORDER BY updated_at DESC, id DESC
  LIMIT 15
) sel ON p.id = sel.id
SET p.category_id = @robotics_id;
