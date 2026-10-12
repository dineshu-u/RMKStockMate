const express = require('express');
const db = require('../db');
let bodyParser = require('body-parser');
const { sendEmail, generateReportFilename } = require('../utils/email');
const { generateMonthlyLedgerPDF } = require('../utils/pdfGenerators');

const router = express.Router();

// First day of the previous month and of the month containing `fdate` (YYYY-MM-DD)
// as plain date literals, so `date >= ? AND date < ?` predicates stay sargable
// and hit the idx_item_date / idx_date indexes instead of wrapping `date` in DATE_FORMAT().
function monthBounds(fdate) {
    const [y, m] = fdate.split('-').map(Number);
    const thisStart = `${fdate.slice(0, 7)}-01`;
    const prevStart = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
    return { prevStart, thisStart };
}

router.get('/report', async (req, res) => {
    const { fdate, tdate } = req.query;
    if (!fdate || !tdate || !/^\d{4}-\d{2}-\d{2}$/.test(fdate)) {
        return res.status(400).json({ message: 'Valid fdate (YYYY-MM-DD) and tdate are required' });
    }
    const { prevStart, thisStart } = monthBounds(fdate);
    const [rows] = await db.promise().query(`
  SELECT 
    p_sub.item, 
    p_sub.purchaseQuantity, 
    p_sub.purchaseAmount,
    COALESCE(
        (SELECT quantity 
         FROM closingstock 
         WHERE item = p_sub.item 
           AND date <= ? 
         ORDER BY date DESC 
         LIMIT 1), 
        0
    ) AS openingStock, 
    COALESCE(
                (SELECT AVG(amountKg) 
                 FROM purchase 
                 WHERE item = p_sub.item 
                   AND date >= ? 
                   AND date < ?
                 ), 
                0
            ) * COALESCE(
                (SELECT quantity 
                 FROM closingstock 
                 WHERE item = p_sub.item 
                   AND date <= ? 
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
    `, [fdate, prevStart, thisStart, fdate, fdate, tdate, fdate, tdate]);

    res.status(200).send(rows);
});

router.post('/send-report', async (req, res) => {
  try {
    const { recipientEmail, subject, message, fdate, tdate } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!fdate || !tdate) {
      return res.status(400).json({ message: 'Date range parameters (fdate, tdate) are required' });
    }

    const { prevStart, thisStart } = monthBounds(fdate);

    const sqlQuery = `
      SELECT 
        p_sub.item, 
        p_sub.purchaseQuantity, 
        p_sub.purchaseAmount,
        COALESCE(
            (SELECT quantity 
             FROM closingstock 
             WHERE item = p_sub.item 
               AND date <= ? 
             ORDER BY date DESC 
             LIMIT 1), 
            0
        ) AS openingStock, 
        COALESCE(
                (SELECT AVG(amountKg) 
                 FROM purchase 
                 WHERE item = p_sub.item 
                   AND date >= ? 
                   AND date < ?
                 ), 
                0
            ) * COALESCE(
                (SELECT quantity 
                 FROM closingstock 
                 WHERE item = p_sub.item 
                   AND date <= ? 
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
    `;

    const [rows] = await db.promise().query(sqlQuery, [fdate, prevStart, thisStart, fdate, fdate, tdate, fdate, tdate]);
    const reportData = rows;

    const pdfBuffer = await generateMonthlyLedgerPDF(reportData, fdate, tdate);
    const filename = generateReportFilename('Monthly Ledger Report', `${fdate}_to_${tdate}`);

    await sendEmail({
      to: recipientEmail,
      subject: subject || 'RMKStockMate - Monthly Ledger Report',
      text: message || 'Please find attached the Monthly Ledger Report.',
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    res.status(200).json({ message: `Report sent successfully to ${recipientEmail}` });
  } catch (error) {
    console.error('Error sending monthly ledger report:', error);
    res.status(500).json({ message: 'Failed to send report. Please check email configuration and try again.' });
  }
});

module.exports = router;
 