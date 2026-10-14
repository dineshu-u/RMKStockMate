const express = require('express');
const db = require('../db');
const { validateEventPayload } = require('../utils/eventValidation');
const router = express.Router();

router.post('/addevent', (req, res) => {
  // Backward-compatible validation: valid payloads behave exactly as before,
  // malformed ones are rejected with 400 instead of being stored.
  const validation = validateEventPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const { event_name, event_date, meal_details, no_of_people } = req.body || {};
  const institution = validation.institution;
  const day = validation.day;

  const insertEvent = () => {
    const sqlInsert = `
      INSERT INTO events(event_name, institution, event_date, meal_details,day,no_of_people)
      VALUES (?, ?, ?, ?,?,?)
    `;

    db.query(sqlInsert, [event_name, institution, event_date, JSON.stringify(meal_details), day, no_of_people], (err, result) => {
      if (err) {
        console.error("Error inserting event details:", err);
        res.status(500).send("Error inserting event details");
      } else {
        console.log("Event details inserted successfully:", result.insertId);
        res.status(200).send("Event details inserted successfully");
      }
    });
  };

  // Meal items may reference the event item catalogue (itemId inside the
  // meal_details JSON). Payloads without ids - including anything written before
  // the catalogue existed - skip this check entirely and behave exactly as
  // before. Ids that are sent must exist, so a stale selection can never be
  // stored as a dangling reference.
  const itemIds = [
    ...new Set(
      (Array.isArray(meal_details) ? meal_details : [])
        .flatMap((meal) => (Array.isArray(meal?.items) ? meal.items : []))
        .map((item) => Number(item?.itemId))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];

  if (itemIds.length === 0) {
    return insertEvent();
  }

  db.query('SELECT id FROM event_items WHERE id IN (?)', [itemIds], (err, rows) => {
    if (err) {
      console.error("Error checking event items:", err);
      return res.status(500).send("Error inserting event details");
    }

    const known = new Set(rows.map((row) => row.id));
    const unknown = itemIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      return res.status(400).json({
        message: `Unknown event item id(s): ${unknown.join(', ')}. Reload the event item list and try again.`,
      });
    }

    return insertEvent();
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
