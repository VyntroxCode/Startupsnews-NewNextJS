ALTER TABLE events
  ADD COLUMN event_end_date DATE NULL AFTER event_date,
  ADD COLUMN event_end_time TIME NULL AFTER event_time;
