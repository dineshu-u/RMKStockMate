var express = require('express');
const db = require('../db');
var router = express.Router();

// Route to get items
router.get('/getItems', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT item, category FROM category ORDER BY item');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route to get report data
router.get('/report', async (req, res) => {
  const { fdate, tdate, item } = req.query;
  console.log(item);
  if (!fdate || !tdate || !item) {
    return res.status(400).json({ message: 'Missing required query parameters' });
  }

  try {
    const sqlQuery = `
      SELECT 
        p_sub.item, 
        COALESCE(d_sub.RMK_quantity, 0) AS RMK_quantity,
        COALESCE(d_sub.RMK_amount, 0) AS RMK_amount,
        COALESCE(d_sub.RMD_quantity, 0) AS RMD_quantity,
        COALESCE(d_sub.RMD_amount, 0) AS RMD_amount,
        COALESCE(d_sub.RMKCET_quantity, 0) AS RMKCET_quantity,
        COALESCE(d_sub.RMKCET_amount, 0) AS RMKCET_amount,
        COALESCE(d_sub.RMKSCHOOL_quantity, 0) AS RMKSCHOOL_quantity,
        COALESCE(d_sub.RMKSCHOOL_amount, 0) AS RMKSCHOOL_amount,
        p_sub.purchaseQuantity AS Purchased_quantity,
        p_sub.purchaseAmount AS Purchased_amount
      FROM (
        SELECT 
          item, 
          SUM(quantity) AS purchaseQuantity, 
          SUM(amount) AS purchaseAmount
        FROM purchase 
        WHERE date BETWEEN ? AND ? 
        AND item = ?
        GROUP BY item
      ) p_sub
      LEFT JOIN (
        SELECT 
          item, 
          SUM(RMK) AS RMK_quantity, 
          SUM(RMK * amountKg) AS RMK_amount,
          SUM(RMD) AS RMD_quantity, 
          SUM(RMD * amountKg) AS RMD_amount,
          SUM(RMKCET) AS RMKCET_quantity, 
          SUM(RMKCET * amountKg) AS RMKCET_amount,
          SUM(RMKSCHOOL) AS RMKSCHOOL_quantity, 
          SUM(RMKSCHOOL * amountKg) AS RMKSCHOOL_amount
        FROM dispatch1 
        WHERE date BETWEEN ? AND ? 
        AND item = ?
        GROUP BY item
      ) d_sub
      ON p_sub.item = d_sub.item;
    `;

    const [rows] = await db.promise().query(sqlQuery, [fdate, tdate, item, fdate, tdate, item]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No data found for the given criteria' });
    }

    res.status(200).json(rows);
    console.log(rows);
  } catch (err) {
    console.error("Error fetching report data:", err);
    res.status(500).json({ error: 'An error occurred while fetching report data' });
  }
});

module.exports = router;
