-- =====================================================================
-- RMKStockMate - Attendance Management schema (additive, repeatable)
-- ---------------------------------------------------------------------
-- Safe to run multiple times: only CREATE TABLE IF NOT EXISTS and
-- INSERT IGNORE statements. Never drops tables and never touches any
-- existing table (purchase, dispatch, dispatch1, closingstock, current,
-- category, events, vendors, users, admin) or the legacy `attendence`
-- table, which is intentionally left abandoned and untouched.
--
-- Run with:  mysql -u <user> -p < 001_attendance_schema.sql
-- =====================================================================

USE food;

-- ---------------------------------------------------------------------
-- 1) Institutions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_institutions (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_attendance_institution_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 2) Attendance categories (aggregate headcount groups)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_attendance_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3) Which categories apply to which institution
--    (applicability is configuration, not hardcode)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_institution_categories (
  institution_id INT NOT NULL,
  category_id    INT NOT NULL,
  PRIMARY KEY (institution_id, category_id),
  CONSTRAINT fk_att_map_institution
    FOREIGN KEY (institution_id) REFERENCES attendance_institutions (id),
  CONSTRAINT fk_att_map_category
    FOREIGN KEY (category_id) REFERENCES attendance_categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4) Daily aggregate headcount records (one row per date/institution/
--    category - enforced unique so re-saving can never duplicate)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  attendance_date DATE NOT NULL,
  institution_id  INT NOT NULL,
  category_id     INT NOT NULL,
  headcount       INT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_date_inst_cat (attendance_date, institution_id, category_id),
  CONSTRAINT fk_att_rec_institution
    FOREIGN KEY (institution_id) REFERENCES attendance_institutions (id),
  CONSTRAINT fk_att_rec_category
    FOREIGN KEY (category_id) REFERENCES attendance_categories (id),
    -- supported natively on MySQL >= 8.0.16 / MariaDB >= 10.2.1;
    -- parsed-but-ignored on older MySQL, server-side validation is authoritative
  CONSTRAINT chk_attendance_headcount_nonnegative CHECK (headcount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 5) Seed data (INSERT IGNORE => repeatable, never duplicates)
--    Institution names exactly as approved; category applicability:
--    all four categories everywhere EXCEPT 'RMK School / Thiruverkadu'
--    which has no Students category.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO attendance_institutions (name) VALUES
  ('RMK'),
  ('RMD'),
  ('RMK-CET'),
  ('RMK Residential'),
  ('RMK Mat. School'),
  ('SDPC'),
  ('RMK School / Thiruverkadu'),
  ('RMK Pathasala');

-- Rename 'RMK H/School' to 'RMK Residential' in databases created before
-- this rename. Repeatable: matches zero rows once already renamed.
UPDATE attendance_institutions
SET name = 'RMK Residential'
WHERE name = 'RMK H/School';

INSERT IGNORE INTO attendance_categories (name) VALUES
  ('Students'),
  ('Staff'),
  ('Workers'),
  ('Visitors');

-- Map every active institution to every category, except:
-- 'RMK School / Thiruverkadu' x 'Students' (does not apply).
INSERT IGNORE INTO attendance_institution_categories (institution_id, category_id)
SELECT i.id, c.id
FROM attendance_institutions i
JOIN attendance_categories c
  ON c.name <> 'Students' OR i.name <> 'RMK School / Thiruverkadu'
WHERE i.is_active = 1;
