const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/report', async (req, res) => {
  const { fdate1, tdate1, fdate2, tdate2, fdate, tdate } = req.query;

  try {
    // Case 1: Exact Dual Date Range Comparison (Period 1 vs Period 2)
    if (fdate1 && tdate1 && fdate2 && tdate2) {
      const sqlQuery = `
        SELECT
          p.category AS item_category,
          p.item AS item_name,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.quantity ELSE 0 END), 0) AS period1_quantity,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.amount ELSE 0 END), 0) AS period1_amount,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.quantity ELSE 0 END), 0) AS period2_quantity,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.amount ELSE 0 END), 0) AS period2_amount,
          COALESCE(SUM(p.amount), 0) AS total_amount
        FROM purchase p
        WHERE (p.date BETWEEN ? AND ?) OR (p.date BETWEEN ? AND ?)
        GROUP BY p.category, p.item
        ORDER BY p.category, p.item;
      `;

      const params = [
        fdate1, tdate1,
        fdate1, tdate1,
        fdate2, tdate2,
        fdate2, tdate2,
        fdate1, tdate1,
        fdate2, tdate2
      ];

      const [rows] = await db.promise().query(sqlQuery, params);

      return res.status(200).json({
        type: 'periods',
        period1: { from: fdate1, to: tdate1, label: `Period 1 (${fdate1} to ${tdate1})` },
        period2: { from: fdate2, to: tdate2, label: `Period 2 (${fdate2} to ${tdate2})` },
        data: rows
      });
    }

    // Case 2: Month-by-month Comparison
    const fromStr = fdate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const toStr = tdate || new Date().toISOString().split('T')[0];

    const startDate = new Date(fromStr);
    const endDate = new Date(toStr);
    const months = [];
    const monthColumns = [];

    const startMonth = isNaN(startDate.getMonth()) ? 0 : startDate.getMonth();
    const endMonth = isNaN(endDate.getMonth()) ? 11 : endDate.getMonth();
    const startYear = isNaN(startDate.getFullYear()) ? new Date().getFullYear() : startDate.getFullYear();

    for (let m = startMonth; m <= endMonth; m++) {
      const monthName = new Date(startYear, m, 1).toLocaleString('default', { month: 'long' });
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
        ${monthColumns.join(',\n')},
        COALESCE(SUM(p.amount), 0) AS total_amount
      FROM purchase p
      WHERE p.date BETWEEN ? AND ?
      GROUP BY p.category, p.item
      ORDER BY p.category, p.item;
    `;

    const [rows] = await db.promise().query(sqlQuery, [fromStr, toStr]);

    return res.status(200).json({
      type: 'months',
      months: months,
      data: rows
    });
  } catch (err) {
    console.error("Error fetching report data:", err);
    res.status(500).send({ error: 'An error occurred while fetching report data' });
  }
});

module.exports = router;