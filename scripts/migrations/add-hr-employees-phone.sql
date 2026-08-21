-- Contact/phone number, collected on the "Send offer letter" hire form alongside Email.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-employees-phone.sql

USE zox_db;

ALTER TABLE hr_employees
  ADD COLUMN phone VARCHAR(20) NULL AFTER email;
