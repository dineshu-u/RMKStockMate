const express = require('express');
const db = require('../db');
const { sendEmail, generateReportFilename } = require('../utils/email');
const { generateCategorySummaryPDF } = require('../utils/pdfGenerators');
const router = express.Router();

router.get('/report', async (req, res) => {
    const { fdate, tdate } = req.query;

    try {
        const [result] = await db.promise().query(`
            SELECT 
                c.category AS category,
                COALESCE(SUM(p.amount), 0) AS purchase_amount,
                COALESCE(SUM(d.RMK * p.rate), 0) AS RMK_amount,
                COALESCE(SUM(d.RMD * p.rate), 0) AS RMD_amount,
                COALESCE(SUM(d.RMKCET * p.rate), 0) AS RMKCET_amount,
                COALESCE(SUM(d.RMKSCHOOL * p.rate), 0) AS RMKSCHOOL_amount,
                (COALESCE(SUM(d.RMK * p.rate), 0) + 
                 COALESCE(SUM(d.RMD * p.rate), 0) + 
                 COALESCE(SUM(d.RMKCET * p.rate), 0) + 
                 COALESCE(SUM(d.RMKSCHOOL * p.rate), 0)) AS total_amount
            FROM (
                SELECT 
                    item, 
                    SUM(quantity) AS quantity, 
                    SUM(amount) AS amount,
                    AVG(amount / quantity) AS rate
                FROM purchase
                WHERE date BETWEEN ? AND ?
                GROUP BY item
            ) AS p
            LEFT JOIN (
                SELECT 
                    item,
                    SUM(RMK) AS RMK,
                    SUM(RMD) AS RMD,
                    SUM(RMKSCHOOL) AS RMKSCHOOL,
                    SUM(RMKCET) AS RMKCET
                FROM dispatch1
                WHERE date BETWEEN ? AND ?
                GROUP BY item
            ) AS d ON p.item = d.item
            JOIN category c ON p.item = c.item
            GROUP BY c.category
        `, [fdate, tdate, fdate, tdate]);

        console.log(result);
        res.status(200).send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while retrieving the result.", error });
    }
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

    const sqlQuery = `
      SELECT 
        c.category AS category,
        COALESCE(SUM(p.amount), 0) AS purchase_amount,
        COALESCE(SUM(d.RMK * p.rate), 0) AS RMK_amount,
        COALESCE(SUM(d.RMD * p.rate), 0) AS RMD_amount,
        COALESCE(SUM(d.RMKCET * p.rate), 0) AS RMKCET_amount,
        COALESCE(SUM(d.RMKSCHOOL * p.rate), 0) AS RMKSCHOOL_amount,
        (COALESCE(SUM(d.RMK * p.rate), 0) + 
         COALESCE(SUM(d.RMD * p.rate), 0) + 
         COALESCE(SUM(d.RMKCET * p.rate), 0) + 
         COALESCE(SUM(d.RMKSCHOOL * p.rate), 0)) AS total_amount
      FROM (
        SELECT 
          item, 
          SUM(quantity) AS quantity, 
          SUM(amount) AS amount,
          AVG(amount / quantity) AS rate
        FROM purchase
        WHERE date BETWEEN ? AND ?
        GROUP BY item
      ) AS p
      LEFT JOIN (
        SELECT 
          item,
          SUM(RMK) AS RMK,
          SUM(RMD) AS RMD,
          SUM(RMKSCHOOL) AS RMKSCHOOL,
          SUM(RMKCET) AS RMKCET
        FROM dispatch1
        WHERE date BETWEEN ? AND ?
        GROUP BY item
      ) AS d ON p.item = d.item
      JOIN category c ON p.item = c.item
      GROUP BY c.category
    `;

    const [rows] = await db.promise().query(sqlQuery, [fdate, tdate, fdate, tdate]);
    const reportData = rows;

    const pdfBuffer = await generateCategorySummaryPDF(reportData, fdate, tdate);
    const filename = generateReportFilename('Category Summary Report', `${fdate}_to_${tdate}`);

    await sendEmail({
      to: recipientEmail,
      subject: subject || 'RMKStockMate - Category-wise Summary Report',
      text: message || 'Please find attached the Category-wise Summary Report.',
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    res.status(200).json({ message: `Report sent successfully to ${recipientEmail}` });
  } catch (error) {
    console.error('Error sending category summary report:', error);
    res.status(500).json({ message: 'Failed to send report. Please check email configuration and try again.' });
  }
});

module.exports = router;
