const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/report', async (req, res) => {
    const { fdate, tdate } = req.query;

    if (!fdate || !tdate) {
        return res.status(400).json({ message: 'Missing required fields: fdate, tdate' });
    }

    // First day of fdate's month and of the previous month, so the
    // previous-calendar-month lookup can use the (item, date) index.
    const monthStart = fdate.substring(0, 7) + '-01';
    const my = Number(monthStart.substring(0, 4));
    const mm = Number(monthStart.substring(5, 7));
    const prevMonthStart = `${mm === 1 ? my - 1 : my}-${String(mm === 1 ? 12 : mm - 1).padStart(2, '0')}-01`;

    try {
        const [rows] = await db.promise().query(`
  SELECT 
    p_sub.item, 
    p_sub.purchaseQuantity, 
    p_sub.purchaseAmount,
    COALESCE(
        (SELECT quantity 
         FROM closingstock 
         WHERE date <= ? 
           AND item = p_sub.item 
         ORDER BY date DESC 
         LIMIT 1), 
        0
    ) AS openingStock, 
    COALESCE(
                (SELECT AVG(amountKg) 
                 FROM purchase 
                 WHERE item = p_sub.item 
                   AND date >= ? AND date < ?
                 ), 
                0
            ) * COALESCE(
                (SELECT quantity 
                 FROM closingstock 
                 WHERE date <= ? 
                   AND item = p_sub.item 
                 ORDER BY date DESC 
                 LIMIT 1), 
                0
            ) AS adjustedOpeningStock,

    COALESCE(d_sub.RMK, 0) AS RMK,
    COALESCE(d_sub.RMD, 0) AS RMD,
    COALESCE(d_sub.RMKCET, 0) AS RMKCET,
    COALESCE(d_sub.RMKSCHOOL, 0) AS RMKSCHOOL,
    p_sub.amountKg AS unitPrice
FROM (
    SELECT 
        item, 
        SUM(quantity) AS purchaseQuantity, 
        SUM(amount) AS purchaseAmount,
        AVG(amountKg) AS amountKg
    FROM purchase 
    WHERE date BETWEEN ? AND ? 
    GROUP BY item
) p_sub
LEFT JOIN (
    SELECT 
        item, 
        SUM(RMK) AS RMK, 
        SUM(RMD) AS RMD, 
        SUM(RMKCET) AS RMKCET, 
        SUM(RMKSCHOOL) AS RMKSCHOOL 
    FROM dispatch1 
    WHERE date BETWEEN ? AND ? 
    GROUP BY item
) d_sub
ON p_sub.item = d_sub.item;
    `, [fdate, prevMonthStart, monthStart, fdate, fdate, tdate, fdate, tdate]);

    res.status(200).send(rows);
    } catch (error) {
        console.error('Error fetching monthly report data:', error);
        res.status(500).json({
            message: error && error.message
                ? `Failed to fetch monthly report: ${error.message}`
                : 'Failed to fetch monthly report'
        });
    }
});

module.exports = router;
