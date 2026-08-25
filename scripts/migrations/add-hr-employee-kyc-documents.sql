-- KYC & Personal Documents checklist (PAN, Aadhaar, bank statements, education, experience) —
-- a fixed HR-policy-defined structure, separate from the admin-configurable generic Required
-- Documents list (hr_required_documents). See src/modules/hr-tool/domain/kyc.ts for the shape.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-employee-kyc-documents.sql
USE zox_db;

ALTER TABLE hr_employees ADD COLUMN kyc_documents JSON NULL AFTER documents_deadline;
