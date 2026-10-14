-- =====================================================================
-- RMKStockMate - Event items (ingredients/materials used in event meals)
-- ---------------------------------------------------------------------
-- Why a separate table: the Add Event form previously offered the inventory
-- master list (`category`, surfaced via /addItems/getItemCategory) as the item
-- catalogue for event meals. Inventory items and event items are different
-- business entities - an event item is a menu ingredient, and creating one must
-- never create stock, change a balance or deduct inventory.
--
-- This table is additive. It does not read, write, alter or drop the inventory
-- tables (`category`, `current`, `purchase`, `dispatch`, `closingstock`) or any
-- other existing table, and it never touches historical `events` rows.
--
-- Repeatable: CREATE TABLE IF NOT EXISTS only, so it is safe to run again.
--
-- Run with:  mysql -u <user> -p < 003_event_items.sql
--
-- Note on uniqueness: the `food` schema uses utf8mb4_0900_ai_ci, which is
-- case- and accent-insensitive, so `UNIQUE KEY uq_event_items_name (name)`
-- rejects 'Tomato' when ' tomato ' would normalize to the same name. The
-- application trims/collapses whitespace before insert and returns the existing
-- record instead of failing, so the index is a safety net, not the UX.
-- =====================================================================

USE food;

CREATE TABLE IF NOT EXISTS event_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  unit       VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_items_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
