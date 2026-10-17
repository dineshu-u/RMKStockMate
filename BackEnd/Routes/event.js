const express = require('express');
const db = require('../db');
const router = express.Router();

// Upper bound of a MySQL INT column
const MAX_NO_OF_PEOPLE = 2147483647;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------------------------------------------------------------------
// Validation helpers (backward compatible: field names and insert
// behaviour are unchanged; only clearly invalid payloads are rejected)
// ---------------------------------------------------------------------

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Accepts numbers or digit-only strings; decimals, negatives and text are rejected
function parsePositiveInt(v) {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return NaN;
}

// Accepts numbers or numeric strings (decimals permitted, as elsewhere in the app)
function parseQuantity(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v.trim());
  return NaN;
}

function validateEventPayload(body) {
  const { event_name, institution, event_date, meal_details, no_of_people } = body;
  const errors = [];

  if (!isNonEmptyString(event_name)) errors.push('event_name is required.');
  if (!isNonEmptyString(institution)) errors.push('institution is required.');
  if (!isValidDateString(event_date)) {
    errors.push('event_date must be a valid date in YYYY-MM-DD format.');
  }

  const people = parsePositiveInt(no_of_people);
  if (!(Number.isInteger(people) && people >= 1 && people <= MAX_NO_OF_PEOPLE)) {
    errors.push('no_of_people must be a positive whole number.');
  }

  if (!Array.isArray(meal_details) || meal_details.length === 0) {
    errors.push('meal_details must be a non-empty array.');
  } else {
    meal_details.forEach((meal, i) => {
      if (!meal || !isNonEmptyString(meal.mealType)) {
        errors.push(`meal_details[${i}].mealType is required.`);
      }
      if (!meal || !Array.isArray(meal.items) || meal.items.length === 0) {
        errors.push(`meal_details[${i}].items must be a non-empty array.`);
      } else {
        meal.items.forEach((item, j) => {
          if (!item || !isNonEmptyString(item.name)) {
            errors.push(`meal_details[${i}].items[${j}].name is required.`);
          }
          const qty = item ? parseQuantity(item.quantity) : NaN;
          if (!(Number.isFinite(qty) && qty > 0)) {
            errors.push(
              `meal_details[${i}].items[${j}].quantity must be a number greater than 0.`
            );
          }
          if (!item || !isNonEmptyString(item.type)) {
            errors.push(`meal_details[${i}].items[${j}].type is required.`);
          }
        });
      }
    });
  }

  return { errors, people };
}

router.post('/addevent', (req, res) => {
  console.log("REQUEST BODY IS ", req.body);
  const { event_name, institution, event_date, meal_details, day, no_of_people } = req.body;

  const { errors, people } = validateEventPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid event details.', errors });
  }

  // Keep the client-supplied day when present; otherwise derive it from the
  // calendar date in UTC so the stored day always matches event_date.
  const storedDay = isNonEmptyString(day)
    ? day.trim()
    : WEEKDAYS[new Date(`${event_date}T00:00:00Z`).getUTCDay()];

  const sqlInsert = `
    INSERT INTO events(event_name, institution, event_date, meal_details,day,no_of_people)
    VALUES (?, ?, ?, ?,?,?)
  `;

  db.query(sqlInsert, [event_name, institution, event_date, JSON.stringify(meal_details), storedDay, people], (err, result) => {
    if (err) {
      console.error("Error inserting event details:", err);
      res.status(500).send("Error inserting event details");
    } else {
      console.log("Event details inserted successfully:", result);
      res.status(200).send("Event details inserted successfully");
    }
  });
});

router.get('/events', (req, res) => {
  const sqlSelect = "SELECT id, event_name, event_date FROM events";
  
  db.query(sqlSelect, (err, result) => {
    if (err) {
      console.error("Error fetching event details:", err);
      res.status(500).send("Error fetching event details");
    } else {
      res.status(200).json(result);
    }
  });
});

router.get('/eventdetail', (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  const sqlSelect = "SELECT * FROM events WHERE id = ?";

  db.query(sqlSelect, [eventId], (err, result) => {
    if (err) {
      console.error("Error fetching event details:", err);
      return res.status(500).send("Error fetching event details");
    }

    // Check if result is empty
    if (result.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(200).json(result[0]); // Send the first result object
  });
});
// ---------------------------------------------------------------------
// Event Items endpoints (event_items table)
// ---------------------------------------------------------------------

// GET /event/items - List all event items (optional ?q= search filter)
router.get('/items', (req, res) => {
  const { q } = req.query;
  let sql = 'SELECT id, name, unit, created_at FROM event_items';
  const params = [];

  if (isNonEmptyString(q)) {
    sql += ' WHERE name LIKE ?';
    params.push(`%${q.trim()}%`);
  }

  sql += ' ORDER BY name ASC';

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching event items:', err);
      return res.status(500).json({ message: 'Error fetching event items', error: err });
    }
    res.status(200).json(rows);
  });
});

// POST /event/items - Create a new event item
router.post('/items', (req, res) => {
  const rawName = req.body?.name;
  const rawUnit = req.body?.unit;

  if (!isNonEmptyString(rawName)) {
    return res.status(400).json({ message: 'Item name is required.' });
  }

  const name = rawName.trim().replace(/\s+/g, ' ');
  const unit = isNonEmptyString(rawUnit) ? rawUnit.trim() : 'nos';

  // Check if item already exists (case-insensitive check)
  const checkSql = 'SELECT id, name, unit, created_at FROM event_items WHERE LOWER(name) = LOWER(?) LIMIT 1';
  db.query(checkSql, [name], (checkErr, checkRows) => {
    if (checkErr) {
      console.error('Error checking duplicate event item:', checkErr);
      return res.status(500).json({ message: 'Error verifying event item', error: checkErr });
    }

    if (checkRows && checkRows.length > 0) {
      return res.status(409).json({
        message: `An event item named "${checkRows[0].name}" already exists.`,
        item: checkRows[0]
      });
    }

    const insertSql = 'INSERT INTO event_items (name, unit) VALUES (?, ?)';
    db.query(insertSql, [name, unit], (insertErr, result) => {
      if (insertErr) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: `An event item named "${name}" already exists.` });
        }
        console.error('Error creating event item:', insertErr);
        return res.status(500).json({ message: 'Error creating event item', error: insertErr });
      }

      res.status(201).json({
        message: 'Event item created successfully',
        item: {
          id: result.insertId,
          name,
          unit
        }
      });
    });
  });
});

router.post('/vendors', (req, res) => {
  const { name, address, license_no, validity } = req.body;
  const query = 'INSERT INTO vendors (name, address, license_no, validity) VALUES (?, ?, ?, ?)';
  db.query(query, [name, address, license_no, validity], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Error adding vendor', error: err });
    }
    res.status(201).json({ message: 'Vendor added successfully', id: result.insertId });
  });
});

// Get all vendors
router.get('/vendors', (req, res) => {
  db.query('SELECT * FROM vendors', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching vendors', error: err });
    }
    res.status(200).json(results);
  });
});

// Update vendor
router.put('/vendors/:id', (req, res) => {
  const { name, address, license_no, validity } = req.body;
  const query = 'UPDATE vendors SET name = ?, address = ?, license_no = ?, validity = ? WHERE id = ?';
  db.query(query, [name, address, license_no, validity, req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error updating vendor', error: err });
    }
    res.status(200).json({ message: 'Vendor updated successfully' });
  });
});

// Delete vendor
router.delete('/vendors/:id', (req, res) => {
  db.query('DELETE FROM vendors WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error deleting vendor', error: err });
    }
    res.status(200).json({ message: 'Vendor deleted successfully' });
  });
});
module.exports = router;
