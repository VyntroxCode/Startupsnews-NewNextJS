-- Server-enforced geofencing for Punch In / Punch Out. hr_rules.geo_fencing already existed as
-- a Rules-page toggle with nothing behind it; this adds the fence itself (office coordinates +
-- radius, Founder-editable on the Rules page) and per-punch GPS audit columns on both
-- hr_punch_log (today's row) and hr_attendance (per-day history). Seeded to the StartupNews.fyi
-- office at Jhandewalan, New Delhi (28.644533, 77.2003635), 50 m radius.
-- Apply BEFORE deploying the code that reads these columns.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-geofence.sql

USE zox_db;

ALTER TABLE hr_rules
  ADD COLUMN geo_fence_lat DECIMAL(10,7) NULL DEFAULT 28.6445330 AFTER geo_fencing,
  ADD COLUMN geo_fence_lng DECIMAL(10,7) NULL DEFAULT 77.2003635 AFTER geo_fence_lat,
  ADD COLUMN geo_fence_radius_m INT NULL DEFAULT 50 AFTER geo_fence_lng;

-- Belt-and-braces backfill of the existing singleton row (ADD COLUMN ... DEFAULT already fills
-- it on MariaDB, but this makes the seed explicit and idempotent).
UPDATE hr_rules
   SET geo_fence_lat = COALESCE(geo_fence_lat, 28.6445330),
       geo_fence_lng = COALESCE(geo_fence_lng, 77.2003635),
       geo_fence_radius_m = COALESCE(geo_fence_radius_m, 50)
 WHERE id = 1;

ALTER TABLE hr_punch_log
  ADD COLUMN in_lat DECIMAL(10,7) NULL AFTER in_minutes,
  ADD COLUMN in_lng DECIMAL(10,7) NULL AFTER in_lat,
  ADD COLUMN in_accuracy_m DECIMAL(8,1) NULL AFTER in_lng,
  ADD COLUMN in_distance_m DECIMAL(8,1) NULL AFTER in_accuracy_m,
  ADD COLUMN out_lat DECIMAL(10,7) NULL AFTER out_minutes,
  ADD COLUMN out_lng DECIMAL(10,7) NULL AFTER out_lat,
  ADD COLUMN out_accuracy_m DECIMAL(8,1) NULL AFTER out_lng,
  ADD COLUMN out_distance_m DECIMAL(8,1) NULL AFTER out_accuracy_m;

ALTER TABLE hr_attendance
  ADD COLUMN in_lat DECIMAL(10,7) NULL AFTER in_minutes,
  ADD COLUMN in_lng DECIMAL(10,7) NULL AFTER in_lat,
  ADD COLUMN in_accuracy_m DECIMAL(8,1) NULL AFTER in_lng,
  ADD COLUMN in_distance_m DECIMAL(8,1) NULL AFTER in_accuracy_m,
  ADD COLUMN out_lat DECIMAL(10,7) NULL AFTER out_minutes,
  ADD COLUMN out_lng DECIMAL(10,7) NULL AFTER out_lat,
  ADD COLUMN out_accuracy_m DECIMAL(8,1) NULL AFTER out_lng,
  ADD COLUMN out_distance_m DECIMAL(8,1) NULL AFTER out_accuracy_m;
