-- ============================================================
-- Category data cleanup - run this on the OTHER laptop
-- Merges duplicate/typo category names and removes blank
-- categories. Safe to re-run: statements that find nothing
-- change nothing. Review STEP 1 output before running STEP 3.
--
-- How to run:
--   MySQL Workbench: open this file, execute step by step.
--   OR command line:  mysql -u root -p food < db-cleanup-categories.sql
--
-- If queries hang (MySQL wedged): restart the MySQL80 service,
-- then run again.
-- ============================================================

-- ---------- STEP 1: INSPECT (review before fixing) ----------
-- Duplicate/blank rows here are what appear in the PDF and website.
SELECT category, COUNT(DISTINCT item) AS items
FROM `category` GROUP BY category ORDER BY category;

SELECT category, COUNT(*) AS rows_count
FROM `purchase` GROUP BY category ORDER BY category;

-- ---------- STEP 2: BACKUP (before the transaction) ----------
-- Creates backup tables holding every row that is about to change.
CREATE TABLE IF NOT EXISTS backup_category_cleanup AS
SELECT * FROM `category`
WHERE category IN ('BAKERY& ICECREAM','ICE CREAN AND BAKERY','MAINTANANCE','MILK&MILK PRODUCTS','PROVISION')
   OR category = '';

CREATE TABLE IF NOT EXISTS backup_purchase_cleanup AS
SELECT * FROM `purchase`
WHERE category IN ('BAKERY& ICECREAM','ICE CREAN AND BAKERY','MAINTANANCE','MILK&MILK PRODUCTS','PROVISION');

CREATE TABLE IF NOT EXISTS backup_dispatch1_cleanup AS
SELECT * FROM `dispatch1`
WHERE category IN ('BAKERY& ICECREAM','ICE CREAN AND BAKERY','MAINTANANCE','MILK&MILK PRODUCTS','PROVISION');

CREATE TABLE IF NOT EXISTS backup_closingstock_cleanup AS
SELECT * FROM `closingstock`
WHERE category IN ('BAKERY& ICECREAM','ICE CREAN AND BAKERY','MAINTANANCE','MILK&MILK PRODUCTS','PROVISION');

CREATE TABLE IF NOT EXISTS backup_current_cleanup AS
SELECT * FROM `current`
WHERE category IN ('BAKERY& ICECREAM','ICE CREAN AND BAKERY','MAINTANANCE','MILK&MILK PRODUCTS','PROVISION');

CREATE TABLE IF NOT EXISTS backup_current_backup_cleanup AS
SELECT * FROM `current_backup`
WHERE category IN ('BAKERY& ICECREAM','ICE CREAN AND BAKERY','MAINTANANCE','MILK&MILK PRODUCTS','PROVISION');

-- ---------- STEP 3: FIX (single transaction, all-or-nothing) ----------
START TRANSACTION;

UPDATE `category` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'BAKERY& ICECREAM';
UPDATE `category` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'ICE CREAN AND BAKERY';
UPDATE `category` SET category = 'MAINTENANCE'            WHERE category = 'MAINTANANCE';
UPDATE `category` SET category = 'MILK AND MILK PRODUCTS' WHERE category = 'MILK&MILK PRODUCTS';
UPDATE `category` SET category = 'PROVISIONS'             WHERE category = 'PROVISION';
DELETE FROM `category` WHERE category = '';

UPDATE `purchase` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'BAKERY& ICECREAM';
UPDATE `purchase` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'ICE CREAN AND BAKERY';
UPDATE `purchase` SET category = 'MAINTENANCE'            WHERE category = 'MAINTANANCE';
UPDATE `purchase` SET category = 'MILK AND MILK PRODUCTS' WHERE category = 'MILK&MILK PRODUCTS';
UPDATE `purchase` SET category = 'PROVISIONS'             WHERE category = 'PROVISION';

UPDATE `dispatch1` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'BAKERY& ICECREAM';
UPDATE `dispatch1` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'ICE CREAN AND BAKERY';
UPDATE `dispatch1` SET category = 'MAINTENANCE'            WHERE category = 'MAINTANANCE';
UPDATE `dispatch1` SET category = 'MILK AND MILK PRODUCTS' WHERE category = 'MILK&MILK PRODUCTS';
UPDATE `dispatch1` SET category = 'PROVISIONS'             WHERE category = 'PROVISION';

UPDATE `closingstock` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'BAKERY& ICECREAM';
UPDATE `closingstock` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'ICE CREAN AND BAKERY';
UPDATE `closingstock` SET category = 'MAINTENANCE'            WHERE category = 'MAINTANANCE';
UPDATE `closingstock` SET category = 'MILK AND MILK PRODUCTS' WHERE category = 'MILK&MILK PRODUCTS';
UPDATE `closingstock` SET category = 'PROVISIONS'             WHERE category = 'PROVISION';

UPDATE `current` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'BAKERY& ICECREAM';
UPDATE `current` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'ICE CREAN AND BAKERY';
UPDATE `current` SET category = 'MAINTENANCE'            WHERE category = 'MAINTANANCE';
UPDATE `current` SET category = 'MILK AND MILK PRODUCTS' WHERE category = 'MILK&MILK PRODUCTS';
UPDATE `current` SET category = 'PROVISIONS'             WHERE category = 'PROVISION';

UPDATE `current_backup` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'BAKERY& ICECREAM';
UPDATE `current_backup` SET category = 'ICE CREAM AND BAKERY'   WHERE category = 'ICE CREAN AND BAKERY';
UPDATE `current_backup` SET category = 'MAINTENANCE'            WHERE category = 'MAINTANANCE';
UPDATE `current_backup` SET category = 'MILK AND MILK PRODUCTS' WHERE category = 'MILK&MILK PRODUCTS';
UPDATE `current_backup` SET category = 'PROVISIONS'             WHERE category = 'PROVISION';

COMMIT;

-- ---------- STEP 4: VERIFY ----------
-- Expect ~15 categories, no blank row, no duplicates.
SELECT category, COUNT(DISTINCT item) AS items
FROM `category` GROUP BY category ORDER BY category;

-- If the result looks wrong, restore from the backup tables, e.g.:
--   UPDATE `category` c JOIN backup_category_cleanup b ON c.id = b.id SET c.category = b.category;
