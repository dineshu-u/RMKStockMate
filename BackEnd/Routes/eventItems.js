const express = require('express');
const db = require('../db');
const { validateEventItemInput } = require('../utils/eventItems');

const router = express.Router();

// ---------------------------------------------------------------------------
// Event item catalogue
//
//   GET  /eventItems        -> { items: [{ id, name, unit }] }
//   POST /eventItems        -> { item: { id, name, unit } }
//
// URL convention: this project mounts routers at bare prefixes (server.js:
// /addItems, /attendance, /event, ...) and the frontend targets
// VITE_RMK_MESS_URL directly, so there is no /api prefix anywhere in the app.
// The catalogue therefore lives at /eventItems rather than /api/event-items so
// it matches the routes the rest of the frontend already calls.
//
// This route only ever touches `event_items`. It never reads or writes the
// inventory tables (category/current/purchase/dispatch/closingstock), so
// creating an event item cannot create stock, alter a balance or deduct
// inventory.
// ---------------------------------------------------------------------------

const SELECT_COLUMNS = 'id, name, unit';

const toResponseItem = (row) => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
});

// Case/accent-insensitive by virtue of the utf8mb4_0900_ai_ci collation on the
// column, so this finds ' tomato ' for a stored 'Tomato'.
const findExistingByName = async (name) => {
  const [rows] = await db
    .promise()
    .query(`SELECT ${SELECT_COLUMNS} FROM event_items WHERE name = ? LIMIT 1`, [name]);
  return rows.length ? toResponseItem(rows[0]) : null;
};

// List the catalogue, optionally filtered by a server-side name search.
router.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').replace(/\s+/g, ' ').trim();

  try {
    const [rows] = q
      ? await db
          .promise()
          .query(
            `SELECT ${SELECT_COLUMNS} FROM event_items WHERE name LIKE ? ORDER BY name`,
            [`%${q}%`]
          )
      : await db.promise().query(`SELECT ${SELECT_COLUMNS} FROM event_items ORDER BY name`);

    // An empty catalogue is a normal state (not an error): the form's empty
    // state offers the inline "add item" flow.
    return res.status(200).json({ items: rows.map(toResponseItem) });
  } catch (error) {
    console.error('Error fetching event items:', error);
    return res.status(500).json({ message: 'Failed to fetch event items' });
  }
});

// Create an event item, or return the already-existing equivalent.
router.post('/', async (req, res) => {
  const validation = validateEventItemInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const { name, unit } = validation;

  try {
    // Fast path: an equivalent name already exists -> return it untouched. The
    // existing unit is never overwritten; a differing unit is reported instead.
    const existing = await findExistingByName(name);
    if (existing) {
      return res.status(200).json({
        message:
          existing.unit === unit
            ? `"${existing.name}" is already in the event item list.`
            : `"${existing.name}" is already in the event item list with unit "${existing.unit}".`,
        item: existing,
        duplicate: true,
        unitMismatch: existing.unit !== unit,
      });
    }

    const [result] = await db
      .promise()
      .query('INSERT INTO event_items (name, unit) VALUES (?, ?)', [name, unit]);

    return res.status(201).json({
      message: `"${name}" was added to the event item list.`,
      item: { id: result.insertId, name, unit },
      duplicate: false,
    });
  } catch (error) {
    // A concurrent identical create lost the race; the unique index is the
    // authority, so return the row that won rather than a 500 or a duplicate.
    if (error && error.code === 'ER_DUP_ENTRY') {
      try {
        const existing = await findExistingByName(name);
        if (existing) {
          return res.status(200).json({
            message: `"${existing.name}" is already in the event item list.`,
            item: existing,
            duplicate: true,
            unitMismatch: existing.unit !== unit,
          });
        }
      } catch (lookupError) {
        console.error('Error resolving duplicate event item:', lookupError);
      }
    }

    console.error('Error creating event item:', error);
    // Deliberately generic: no SQL text, credentials or driver internals leak out.
    return res.status(500).json({ message: 'Failed to save the event item' });
  }
});

module.exports = router;
