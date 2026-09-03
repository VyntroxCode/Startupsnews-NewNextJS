-- Retire the generic "Required Documents" checklist — KYC & Personal Documents is now the only
-- set of documents collected from employees.
--
-- Background: two independent document systems existed side by side. The generic one
-- (hr_required_documents -> a per-employee snapshot in hr_employees.documents) asked for
-- Aadhar / Bank Proof / Education Certificates / PAN Card / Previous Employment Proof; the KYC
-- checklist (hr_employees.kyc_documents, schema in src/modules/hr-tool/domain/kyc.ts) asks for
-- the same real-world documents but with validated numbers, repeating education/experience
-- entries and per-slot required flags. Employees were being asked for both.
--
-- This empties the generic list so no employee is ever issued it again. The tables, columns and
-- code paths all remain — re-populating hr_required_documents in Rules & Org Structure brings
-- the feature back on its own.
--
-- DELIBERATELY NON-DESTRUCTIVE: rows whose snapshot contains a document that was actually
-- uploaded (status pending/approved/rejected) are LEFT ALONE, so no S3 file reference and no
-- HR approval is thrown away. At the time of writing that protects exactly one record —
-- E-110 Bhavika Arora, 2 approved + 3 pending uploads. Her profile keeps its Documents section
-- (Directory.tsx renders it only when documents is non-empty); everyone else loses it.
--
-- NOTE: the guard uses JSON_SEARCH, not JSON_OVERLAPS — this server is MariaDB 10.6, which has
-- no JSON_OVERLAPS (that is MySQL 8.0+). Verified by dry-run against live data: rows E-102..E-109
-- match (all placeholders, nothing uploaded), E-110 does not.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/retire-generic-required-documents.sql
USE zox_db;

START TRANSACTION;

DELETE FROM hr_required_documents;

UPDATE hr_employees
   SET documents = '[]',
       documents_deadline = NULL
 WHERE JSON_LENGTH(documents) > 0
   AND JSON_SEARCH(documents, 'one', 'pending',  NULL, '$[*].status') IS NULL
   AND JSON_SEARCH(documents, 'one', 'approved', NULL, '$[*].status') IS NULL
   AND JSON_SEARCH(documents, 'one', 'rejected', NULL, '$[*].status') IS NULL;

COMMIT;

-- Verification
SELECT (SELECT COUNT(*) FROM hr_required_documents) AS required_documents_left;
SELECT id, name, JSON_LENGTH(documents) AS generic_docs_left FROM hr_employees ORDER BY id;
