const express = require('express');
const db = require('../db');
const { sendEmail, generateReportFilename } = require('../utils/email');
const { generateCategoryComparisonPDF, generateMonthlyMatrixComparisonPDF } = require('../utils/pdfGenerators');

const router = express.Router();

router.get('/category-report', async (req, res) => {
  const { fdate1, tdate1, fdate2, tdate2, fdate, tdate } = req.query;

  try {
    // Case 1: Exact Dual Date Range Comparison (Period 1 vs Period 2)
    if (fdate1 && tdate1 && fdate2 && tdate2) {
      const sqlQuery = `
        SELECT
          c.category AS category_name,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.quantity ELSE 0 END), 0) AS period1_quantity,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.amount ELSE 0 END), 0) AS period1_amount,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.quantity ELSE 0 END), 0) AS period2_quantity,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.amount ELSE 0 END), 0) AS period2_amount,
          COALESCE(SUM(CASE WHEN (p.date BETWEEN ? AND ?) OR (p.date BETWEEN ? AND ?) THEN p.amount ELSE 0 END), 0) AS total_amount
        FROM (SELECT DISTINCT category FROM category) c
        LEFT JOIN purchase p ON c.category = p.category AND ((p.date BETWEEN ? AND ?) OR (p.date BETWEEN ? AND ?))
        GROUP BY c.category
        ORDER BY c.category;
      `;

      const params = [
        fdate1, tdate1,
        fdate1, tdate1,
        fdate2, tdate2,
        fdate2, tdate2,
        fdate1, tdate1, fdate2, tdate2,
        fdate1, tdate1, fdate2, tdate2
      ];

      const [rows] = await db.promise().query(sqlQuery, params);

      return res.status(200).json({
        type: 'periods',
        period1: { from: fdate1, to: tdate1, label: `Period 1 (${fdate1} - ${tdate1})` },
        period2: { from: fdate2, to: tdate2, label: `Period 2 (${fdate2} - ${tdate2})` },
        data: rows
      });
    }

    // Case 2: Month-by-Month Comparison with Quantity AND Amount for every month
    const startDate = new Date(fdate || new Date(new Date().getFullYear(), 0, 1));
    const endDate = new Date(tdate || new Date());
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
        c.category AS category_name,
        ${monthColumns.join(',\n')},
        COALESCE(SUM(p.amount), 0) AS total_amount
      FROM (SELECT DISTINCT category FROM category) c
      LEFT JOIN purchase p ON c.category = p.category AND (p.date BETWEEN ? AND ?)
      GROUP BY c.category
      ORDER BY c.category;
    `;

    const fromParam = fdate || `${startYear}-01-01`;
    const toParam = tdate || `${startYear}-12-31`;

    const [rows] = await db.promise().query(sqlQuery, [fromParam, toParam]);

    return res.status(200).json({
      type: 'months',
      months: months,
      data: rows
    });
  } catch (err) {
    console.error("Error fetching category report data:", err);
    res.status(500).send({ error: 'An error occurred while fetching category report data' });
  }
});

router.post('/send-report', async (req, res) => {
  try {
    const { recipientEmail, subject, message, fdate1, tdate1, fdate2, tdate2, fdate, tdate } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    let reportData, period1Label, period2Label, filename;

    if (fdate1 && tdate1 && fdate2 && tdate2) {
      // Period comparison mode
      const sqlQuery = `
        SELECT
          c.category AS category_name,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.quantity ELSE 0 END), 0) AS period1_quantity,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.amount ELSE 0 END), 0) AS period1_amount,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.quantity ELSE 0 END), 0) AS period2_quantity,
          COALESCE(SUM(CASE WHEN p.date BETWEEN ? AND ? THEN p.amount ELSE 0 END), 0) AS period2_amount,
          COALESCE(SUM(CASE WHEN (p.date BETWEEN ? AND ?) OR (p.date BETWEEN ? AND ?) THEN p.amount ELSE 0 END), 0) AS total_amount
        FROM (SELECT DISTINCT category FROM category) c
        LEFT JOIN purchase p ON c.category = p.category AND ((p.date BETWEEN ? AND ?) OR (p.date BETWEEN ? AND ?))
        GROUP BY c.category
        ORDER BY c.category;
      `;

      const params = [
        fdate1, tdate1, fdate1, tdate1, fdate2, tdate2, fdate2, tdate2,
        fdate1, tdate1, fdate2, tdate2, fdate1, tdate1, fdate2, tdate2
      ];

      const [rows] = await db.promise().query(sqlQuery, params);
      reportData = rows;
      period1Label = `Period 1 (${fdate1} to ${tdate1})`;
      period2Label = `Period 2 (${fdate2} to ${tdate2})`;
      filename = generateReportFilename('Category Comparison', `${fdate1}_to_${tdate2}`);
    } else if (fdate && tdate) {
      // Month-by-month mode (mirrors GET /category-report months mode)
      const startDate = new Date(fdate);
      const endDate = new Date(tdate);
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
          c.category AS category_name,
          ${monthColumns.join(',\n')},
          COALESCE(SUM(p.amount), 0) AS total_amount
        FROM (SELECT DISTINCT category FROM category) c
        LEFT JOIN purchase p ON c.category = p.category AND (p.date BETWEEN ? AND ?)
        GROUP BY c.category
        ORDER BY c.category;
      `;

      const fromParam = fdate || `${startYear}-01-01`;
      const toParam = tdate || `${startYear}-12-31`;

      const [rows] = await db.promise().query(sqlQuery, [fromParam, toParam]);
      reportData = rows;

      // Generate PDF for monthly mode
      const pdfBuffer = await generateMonthlyMatrixComparisonPDF(reportData, months, {
        type: 'months',
        from: fdate,
        to: tdate
      });

      await sendEmail({
        to: recipientEmail,
        subject: subject || 'RMKStockMate - Category Monthly Comparison Report',
        text: message || 'Please find attached the Category Monthly Comparison Report.',
        attachments: [{ filename: generateReportFilename('Category Monthly Comparison', `${fdate}_to_${tdate}`), content: pdfBuffer, contentType: 'application/pdf' }]
      });

      return res.status(200).json({ message: `Report sent successfully to ${recipientEmail}` });
    } else {
      return res.status(400).json({ message: 'Date range parameters are required' });
    }

    // Generate PDF for period comparison mode
    const pdfBuffer = await generateCategoryComparisonPDF(reportData, period1Label, period2Label);

    await sendEmail({
      to: recipientEmail,
      subject: subject || 'RMKStockMate - Category Comparison Report',
      text: message || 'Please find attached the Category Comparison Report.',
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    res.status(200).json({ message: `Report sent successfully to ${recipientEmail}` });
  } catch (error) {
    console.error('Error sending category comparison report:', error);
    res.status(500).json({ message: 'Failed to send report. Please check email configuration and try again.' });
  }
});

module.exports = router;