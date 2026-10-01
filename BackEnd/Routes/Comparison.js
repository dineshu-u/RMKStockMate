const express = require('express');
const db = require('../db'); // Ensure this is the correct path to your database configuration
const bodyParser = require('body-parser');

const router = express.Router();

router.get('/report', async (req, res) => {
  // If dates are missing, fallback to current year start and today
  const defaultStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const defaultEnd = new Date().toISOString().split('T')[0];

  const f = req.query.fdate || defaultStart;
  const t = req.query.tdate || defaultEnd;

  try {
    const startDate = new Date(f);
    const endDate = new Date(t);
    const months = [];
    const monthColumns = [];

    // Ensure valid start and end month indices
    const startMonth = isNaN(startDate.getMonth()) ? 0 : startDate.getMonth();
    const endMonth = isNaN(endDate.getMonth()) ? 11 : endDate.getMonth();

    for (let m = startMonth; m <= endMonth; m++) {
      const monthName = new Date(startDate.getFullYear(), m, 1).toLocaleString('default', { month: 'long' });
      months.push(monthName);
      monthColumns.push(`
        COALESCE(SUM(CASE WHEN MONTH(p.date) = ${m + 1} THEN p.quantity ELSE 0 END), 0) AS ${monthName}_quantity,
        COALESCE(SUM(CASE WHEN MONTH(p.date) = ${m + 1} THEN p.amount ELSE 0 END), 0) AS ${monthName}_amount
      `);
    }

    const sqlQuery = `
      SELECT
        p.category AS item_category,
        p.item AS item_name,
        ${monthColumns.join(',\n')}
      FROM purchase p
      WHERE p.date BETWEEN ? AND ?
      GROUP BY p.category, p.item;
    `;

    const [rows] = await db.promise().query(sqlQuery, [f, t]);
    res.status(200).send(rows);
  } catch (err) {
    console.error("Error fetching report data:", err);
    res.status(500).send({ error: 'An error occurred while fetching report data' });
  }
});


module.exports = router;
