-- =====================================================================
-- RMKStockMate - Rename institution 'RMK H/School' -> 'RMK Residential'
-- ---------------------------------------------------------------------
-- 001_attendance_schema.sql seeds institutions with INSERT IGNORE, so on a
-- database that has already been seeded, changing the name in the seed list
-- alone does NOT rename the existing row - re-running the seed would instead
-- add a second row and split that institution's data across two names.
--
-- This migration performs the rename on existing installations. It is safe to
-- run repeatedly, and safe on a database created after the rename (no rows
-- match, nothing changes).
--
-- Run with:  mysql -u <user> -p < 002_rename_rmk_h_school.sql
-- =====================================================================

USE food;

SET @old_id := (SELECT id FROM attendance_institutions WHERE name = 'RMK H/School' LIMIT 1);
SET @new_id := (SELECT id FROM attendance_institutions WHERE name = 'RMK Residential' LIMIT 1);

-- Normal case: the new name does not exist yet, so rename in place.
-- The id (and therefore every attendance record and category mapping) is kept.
UPDATE attendance_institutions
SET name = 'RMK Residential'
WHERE id = @old_id AND @new_id IS NULL;

-- Defensive case: the seed was re-run after the rename, so both names exist.
-- Merge the old row into the new one instead of leaving a duplicate.
INSERT IGNORE INTO attendance_institution_categories (institution_id, category_id)
SELECT @new_id, category_id
FROM attendance_institution_categories
WHERE institution_id = @old_id AND @new_id IS NOT NULL;

-- Drop old records that would collide with an existing new-name record for the
-- same date/category (uq_attendance_date_inst_cat), then move the survivors.
DELETE r_old
FROM attendance_records r_old
JOIN attendance_records r_new
  ON r_new.attendance_date = r_old.attendance_date
 AND r_new.institution_id = @new_id
 AND r_new.category_id = r_old.category_id
WHERE r_old.institution_id = @old_id AND @new_id IS NOT NULL;

UPDATE attendance_records
SET institution_id = @new_id
WHERE institution_id = @old_id AND @new_id IS NOT NULL;

DELETE FROM attendance_institution_categories
WHERE institution_id = @old_id AND @new_id IS NOT NULL;

DELETE FROM attendance_institutions
WHERE id = @old_id AND @new_id IS NOT NULL;
