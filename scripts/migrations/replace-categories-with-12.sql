-- Replace all existing categories with exactly these 12. Run this to reset categories.
-- Prerequisite: categories table exists (init-db.sql). Safe to run multiple times.
-- Usage: mysql -u ... -p ... < scripts/migrations/replace-categories-with-12.sql

-- 1) Ensure the 12 canonical categories exist (insert or update by slug)
INSERT INTO categories (name, slug, sort_order) VALUES
  ('AI & Deeptech',    'ai-deeptech',      1),
  ('Fintech',          'fintech',          2),
  ('Social Media',     'social-media',     3),
  ('Robotics',         'robotics',         4),
  ('HealthTech',       'healthtech',       5),
  ('EV & Mobility',    'ev-mobility',     6),
  ('eCommerce',        'ecommerce',        7),
  ('SaaS & Enterprise','saas-enterprise',  8),
  ('Consumer & D2C',   'consumer-d2c',    9),
  ('Web3 & Blockchain','web3-blockchain', 10),
  ('Cybersecurity',    'cybersecurity',   11),
  ('Climate & Energy', 'climate-energy',   12)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order);

-- 2) Point all posts in non-canonical categories to AI & Deeptech, then remove old categories
UPDATE posts p
INNER JOIN categories c ON p.category_id = c.id
SET p.category_id = (SELECT id FROM categories WHERE slug = 'ai-deeptech' LIMIT 1)
WHERE c.slug NOT IN (
-- 3) Point all RSS feeds in non-canonical (or missing) categories to AI & Deeptech
  'ai-deeptech','fintech','social-media','robotics','healthtech','ev-mobility',
  'ecommerce','saas-enterprise','consumer-d2c','web3-blockchain','cybersecurity','climate-energy'
);

UPDATE rss_feeds rf
INNER JOIN categories c ON rf.category_id = c.id
SET rf.category_id = (SELECT id FROM categories WHERE slug = 'ai-deeptech' LIMIT 1),
-- 4) Remove any category that is not one of the 12
    rf.updated_at = NOW()
WHERE c.slug NOT IN (
  'ai-deeptech','fintech','social-media','robotics','healthtech','ev-mobility',
  'ecommerce','saas-enterprise','consumer-d2c','web3-blockchain','cybersecurity','climate-energy'
);

DELETE FROM categories
WHERE slug NOT IN (
  'ai-deeptech','fintech','social-media','robotics','healthtech','ev-mobility',
  'ecommerce','saas-enterprise','consumer-d2c','web3-blockchain','cybersecurity','climate-energy'
);
