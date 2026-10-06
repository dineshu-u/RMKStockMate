const express = require('express');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
require('dotenv').config();
const router = express.Router();

// Route to get all master items
router.get('/getItems', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT item, category FROM category ORDER BY item');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to calculate item stats for an exact date range with accurate opening & closing stock
async function getItemMetrics(item, fdate, tdate) {
  // 1. Inward Purchases for this date range [fdate, tdate]
  const [pRows] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(quantity), 0) AS purchaseQuantity,
      COALESCE(SUM(amount), 0) AS purchaseAmount,
      COALESCE(AVG(amountkg), 0) AS avgRate
    FROM purchase
    WHERE item = ? AND date BETWEEN ? AND ?
  `, [item, fdate, tdate]);

  const purchaseQty = Number(pRows[0]?.purchaseQuantity || 0);
  const purchaseAmt = Number(pRows[0]?.purchaseAmount || 0);
  let rate = Number(pRows[0]?.avgRate || 0);

  // If rate was 0 in this range (no purchases in exact window), fallback to latest known purchase rate up to tdate
  if (rate === 0) {
    const [rateRows] = await db.promise().query(`
      SELECT amountkg FROM purchase WHERE item = ? AND date <= ? ORDER BY date DESC, id DESC LIMIT 1
    `, [item, tdate]);
    if (rateRows.length > 0) {
      rate = Number(rateRows[0].amountkg || 0);
    } else {
      const [latestRate] = await db.promise().query(`
        SELECT amountkg FROM purchase WHERE item = ? ORDER BY date DESC, id DESC LIMIT 1
      `, [item]);
      rate = Number(latestRate[0]?.amountkg || 0);
    }
  }

  // 2. Dispatches across the 4 campuses for this date range [fdate, tdate]
  const [dRows] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(RMK), 0) AS RMK,
      COALESCE(SUM(RMD), 0) AS RMD,
      COALESCE(SUM(RMKCET), 0) AS RMKCET,
      COALESCE(SUM(RMKSCHOOL), 0) AS RMKSCHOOL
    FROM dispatch1
    WHERE item = ? AND date BETWEEN ? AND ?
  `, [item, fdate, tdate]);

  const rmkQty = Number(dRows[0]?.RMK || 0);
  const rmdQty = Number(dRows[0]?.RMD || 0);
  const rmkcetQty = Number(dRows[0]?.RMKCET || 0);
  const schoolQty = Number(dRows[0]?.RMKSCHOOL || 0);

  const issuedQty = rmkQty + rmdQty + rmkcetQty + schoolQty;
  const rmkAmt = rmkQty * rate;
  const rmdAmt = rmdQty * rate;
  const rmkcetAmt = rmkcetQty * rate;
  const schoolAmt = schoolQty * rate;
  const issuedAmt = issuedQty * rate;

  // 3. Opening Stock as of fdate (Cumulative purchases before fdate - Cumulative dispatches before fdate)
  const [openPurchases] = await db.promise().query(`
    SELECT COALESCE(SUM(quantity), 0) AS totalOpenPurchase
    FROM purchase
    WHERE item = ? AND date < ?
  `, [item, fdate]);

  const [openDispatches] = await db.promise().query(`
    SELECT COALESCE(SUM(RMK + RMD + RMKCET + RMKSCHOOL), 0) AS totalOpenDispatch
    FROM dispatch1
    WHERE item = ? AND date < ?
  `, [item, fdate]);

  const openingStockQty = Math.max(
    0, 
    Number(openPurchases[0]?.totalOpenPurchase || 0) - Number(openDispatches[0]?.totalOpenDispatch || 0)
  );

  // 4. True Closing Stock at the end of the period (as of tdate)
  // Closing Stock = Opening Stock + Period Purchases - Period Issues
  const closingQty = Math.max(0, openingStockQty + purchaseQty - issuedQty);
  const closingAmt = closingQty * rate;

  return {
    item,
    fromDate: fdate,
    toDate: tdate,
    rate,
    openingStock: openingStockQty,
    Purchased_quantity: purchaseQty,
    Purchased_amount: purchaseAmt,
    RMK_quantity: rmkQty,
    RMK_amount: rmkAmt,
    RMD_quantity: rmdQty,
    RMD_amount: rmdAmt,
    RMKCET_quantity: rmkcetQty,
    RMKCET_amount: rmkcetAmt,
    RMKSCHOOL_quantity: schoolQty,
    RMKSCHOOL_amount: schoolAmt,
    Issued_quantity: issuedQty,
    Issued_amount: issuedAmt,
    Closing_quantity: closingQty,
    Closing_amount: closingAmt
  };
}

// Helper function to build month sequence for a date range
// Returns array of { month, year, monthName, start, end }
function buildMonthSequence(fdate, tdate) {
  const startDate = new Date(fdate);
  const endDate = new Date(tdate);
  
  const months = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  while (current <= endDate) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    // Adjust for actual range boundaries
    const actualStart = current < startDate ? startDate : monthStart;
    const actualEnd = monthEnd > endDate ? endDate : monthEnd;
    
    // Only include if the month has any overlap with the range
    if (actualStart <= actualEnd) {
      months.push({
        month: current.getMonth(),
        year: current.getFullYear(),
        monthName: current.toLocaleString('default', { month: 'long' }),
        start: actualStart.toISOString().split('T')[0],
        end: actualEnd.toISOString().split('T')[0]
      });
    }
    
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

// Helper function to get monthly metrics for a specific month range
async function getItemMetricsForMonth(item, monthInfo) {
  const metrics = await getItemMetrics(item, monthInfo.start, monthInfo.end);
  return {
    month: monthInfo.month,
    year: monthInfo.year,
    monthName: monthInfo.monthName,
    start: monthInfo.start,
    end: monthInfo.end,
    RMK_quantity: metrics.RMK_quantity,
    RMD_quantity: metrics.RMD_quantity,
    RMKCET_quantity: metrics.RMKCET_quantity,
    RMKSCHOOL_quantity: metrics.RMKSCHOOL_quantity,
    Issued_quantity: metrics.Issued_quantity
  };
}

// Helper function to build monthly comparison by position/index (not by calendar month)
async function buildMonthlyComparison(item, fdate1, tdate1, fdate2, tdate2) {
  // Build month sequences independently for each period
  const period1Months = buildMonthSequence(fdate1, tdate1);
  const period2Months = buildMonthSequence(fdate2, tdate2);
  
  // Get metrics for all months in parallel
  const [period1Metrics, period2Metrics] = await Promise.all([
    Promise.all(period1Months.map(m => getItemMetricsForMonth(item, m))),
    Promise.all(period2Months.map(m => getItemMetricsForMonth(item, m)))
  ]);
  
  // Pair by position/index
  const monthlyComparison = [];
  const maxMonths = Math.max(period1Metrics.length, period2Metrics.length);
  
  for (let i = 0; i < maxMonths; i++) {
    const p1 = period1Metrics[i];
    const p2 = period2Metrics[i];
    
    if (p1 && p2) {
      // Both periods have this month position - compare them
      monthlyComparison.push({
        comparisonIndex: i + 1, // 1-based for display
        period1: {
          month: p1.month,
          year: p1.year,
          monthName: p1.monthName,
          start: p1.start,
          end: p1.end,
          RMK_quantity: p1.RMK_quantity,
          RMD_quantity: p1.RMD_quantity,
          RMKCET_quantity: p1.RMKCET_quantity,
          RMKSCHOOL_quantity: p1.RMKSCHOOL_quantity,
          Issued_quantity: p1.Issued_quantity
        },
        period2: {
          month: p2.month,
          year: p2.year,
          monthName: p2.monthName,
          start: p2.start,
          end: p2.end,
          RMK_quantity: p2.RMK_quantity,
          RMD_quantity: p2.RMD_quantity,
          RMKCET_quantity: p2.RMKCET_quantity,
          RMKSCHOOL_quantity: p2.RMKSCHOOL_quantity,
          Issued_quantity: p2.Issued_quantity
        },
        difference: {
          RMK_quantity: p2.RMK_quantity - p1.RMK_quantity,
          RMD_quantity: p2.RMD_quantity - p1.RMD_quantity,
          RMKCET_quantity: p2.RMKCET_quantity - p1.RMKCET_quantity,
          RMKSCHOOL_quantity: p2.RMKSCHOOL_quantity - p1.RMKSCHOOL_quantity,
          Issued_quantity: p2.Issued_quantity - p1.Issued_quantity
        }
      });
    } else if (p1 && !p2) {
      // Period 1 has month but Period 2 doesn't - unmatched
      monthlyComparison.push({
        comparisonIndex: i + 1,
        period1: {
          month: p1.month,
          year: p1.year,
          monthName: p1.monthName,
          start: p1.start,
          end: p1.end,
          RMK_quantity: p1.RMK_quantity,
          RMD_quantity: p1.RMD_quantity,
          RMKCET_quantity: p1.RMKCET_quantity,
          RMKSCHOOL_quantity: p1.RMKSCHOOL_quantity,
          Issued_quantity: p1.Issued_quantity
        },
        period2: null,
        difference: null,
        unmatched: 'period2'
      });
    } else if (!p1 && p2) {
      // Period 2 has month but Period 1 doesn't - unmatched
      monthlyComparison.push({
        comparisonIndex: i + 1,
        period1: null,
        period2: {
          month: p2.month,
          year: p2.year,
          monthName: p2.monthName,
          start: p2.start,
          end: p2.end,
          RMK_quantity: p2.RMK_quantity,
          RMD_quantity: p2.RMD_quantity,
          RMKCET_quantity: p2.RMKCET_quantity,
          RMKSCHOOL_quantity: p2.RMKSCHOOL_quantity,
          Issued_quantity: p2.Issued_quantity
        },
        difference: null,
        unmatched: 'period1'
      });
    }
  }
  
  return monthlyComparison;
}

// Helper function to calculate item stats for an exact date range with accurate opening & closing stock
async function getItemMetrics(item, fdate, tdate) {
  // 1. Inward Purchases for this date range [fdate, tdate]
  const [pRows] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(quantity), 0) AS purchaseQuantity,
      COALESCE(SUM(amount), 0) AS purchaseAmount,
      COALESCE(AVG(amountkg), 0) AS avgRate
    FROM purchase
    WHERE item = ? AND date BETWEEN ? AND ?
  `, [item, fdate, tdate]);

  const purchaseQty = Number(pRows[0]?.purchaseQuantity || 0);
  const purchaseAmt = Number(pRows[0]?.purchaseAmount || 0);
  let rate = Number(pRows[0]?.avgRate || 0);

  // If rate was 0 in this range (no purchases in exact window), fallback to latest known purchase rate up to tdate
  if (rate === 0) {
    const [rateRows] = await db.promise().query(`
      SELECT amountkg FROM purchase WHERE item = ? AND date <= ? ORDER BY date DESC, id DESC LIMIT 1
    `, [item, tdate]);
    if (rateRows.length > 0) {
      rate = Number(rateRows[0].amountkg || 0);
    } else {
      const [latestRate] = await db.promise().query(`
        SELECT amountkg FROM purchase WHERE item = ? ORDER BY date DESC, id DESC LIMIT 1
      `, [item]);
      rate = Number(latestRate[0]?.amountkg || 0);
    }
  }

  // 2. Dispatches across the 4 campuses for this date range [fdate, tdate]
  const [dRows] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(RMK), 0) AS RMK,
      COALESCE(SUM(RMD), 0) AS RMD,
      COALESCE(SUM(RMKCET), 0) AS RMKCET,
      COALESCE(SUM(RMKSCHOOL), 0) AS RMKSCHOOL
    FROM dispatch1
    WHERE item = ? AND date BETWEEN ? AND ?
  `, [item, fdate, tdate]);

  const rmkQty = Number(dRows[0]?.RMK || 0);
  const rmdQty = Number(dRows[0]?.RMD || 0);
  const rmkcetQty = Number(dRows[0]?.RMKCET || 0);
  const schoolQty = Number(dRows[0]?.RMKSCHOOL || 0);

  const issuedQty = rmkQty + rmdQty + rmkcetQty + schoolQty;
  const rmkAmt = rmkQty * rate;
  const rmdAmt = rmdQty * rate;
  const rmkcetAmt = rmkcetQty * rate;
  const schoolAmt = schoolQty * rate;
  const issuedAmt = issuedQty * rate;

  // 3. Opening Stock as of fdate (Cumulative purchases before fdate - Cumulative dispatches before fdate)
  const [openPurchases] = await db.promise().query(`
    SELECT COALESCE(SUM(quantity), 0) AS totalOpenPurchase
    FROM purchase
    WHERE item = ? AND date < ?
  `, [item, fdate]);

  const [openDispatches] = await db.promise().query(`
    SELECT COALESCE(SUM(RMK + RMD + RMKCET + RMKSCHOOL), 0) AS totalOpenDispatch
    FROM dispatch1
    WHERE item = ? AND date < ?
  `, [item, fdate]);

  const openingStockQty = Math.max(
    0, 
    Number(openPurchases[0]?.totalOpenPurchase || 0) - Number(openDispatches[0]?.totalOpenDispatch || 0)
  );

  // 4. True Closing Stock at the end of the period (as of tdate)
  // Closing Stock = Opening Stock + Period Purchases - Period Issues
  const closingQty = Math.max(0, openingStockQty + purchaseQty - issuedQty);
  const closingAmt = closingQty * rate;

  return {
    item,
    fromDate: fdate,
    toDate: tdate,
    rate,
    openingStock: openingStockQty,
    Purchased_quantity: purchaseQty,
    Purchased_amount: purchaseAmt,
    RMK_quantity: rmkQty,
    RMK_amount: rmkAmt,
    RMD_quantity: rmdQty,
    RMD_amount: rmdAmt,
    RMKCET_quantity: rmkcetQty,
    RMKCET_amount: rmkcetAmt,
    RMKSCHOOL_quantity: schoolQty,
    RMKSCHOOL_amount: schoolAmt,
    Issued_quantity: issuedQty,
    Issued_amount: issuedAmt,
    Closing_quantity: closingQty,
    Closing_amount: closingAmt
  };
}

// Route to get item report (supports both single item and multi-item comparison)
router.get('/report', async (req, res) => {
  const { fdate1, tdate1, fdate2, tdate2, fdate, tdate, monthly } = req.query;
  const isMonthly = monthly === 'true';

  // Normalize requested items list (supports items array, comma-separated items, or single item)
  let itemList = [];
  if (req.query.items) {
    if (Array.isArray(req.query.items)) {
      itemList = req.query.items;
    } else if (typeof req.query.items === 'string') {
      itemList = req.query.items.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (req.query.item) {
    if (Array.isArray(req.query.item)) {
      itemList = req.query.item;
    } else {
      itemList = [req.query.item.trim()];
    }
  }

  if (itemList.length === 0) {
    return res.status(400).json({ message: 'At least one item is required' });
  }

  try {
    // Case 1: Dual Date Range Comparison (Period 1 vs Period 2)
    if (fdate1 && tdate1 && fdate2 && tdate2) {
      const itemResults = await Promise.all(itemList.map(async (itemName) => {
        const period1 = await getItemMetrics(itemName, fdate1, tdate1);
        const period2 = await getItemMetrics(itemName, fdate2, tdate2);

        const baseResult = {
          item: itemName,
          period1: {
            ...period1,
            label: `Period 1 (${fdate1} to ${tdate1})`
          },
          period2: {
            ...period2,
            label: `Period 2 (${fdate2} to ${tdate2})`
          },
          difference: {
            purchaseQuantityDiff: period2.Purchased_quantity - period1.Purchased_quantity,
            purchaseAmountDiff: period2.Purchased_amount - period1.Purchased_amount,
            issuedQuantityDiff: period2.Issued_quantity - period1.Issued_quantity,
            issuedAmountDiff: period2.Issued_amount - period1.Issued_amount,
            closingQuantityDiff: period2.Closing_quantity - period1.Closing_quantity,
            closingAmountDiff: period2.Closing_amount - period1.Closing_amount,
            rmkQtyDiff: period2.RMK_quantity - period1.RMK_quantity,
            rmdQtyDiff: period2.RMD_quantity - period1.RMD_quantity,
            rmkcetQtyDiff: period2.RMKCET_quantity - period1.RMKCET_quantity,
            schoolQtyDiff: period2.RMKSCHOOL_quantity - period1.RMKSCHOOL_quantity
          }
        };

        // Add monthly breakdown if requested
        if (isMonthly) {
          const monthlyComparison = await buildMonthlyComparison(itemName, fdate1, tdate1, fdate2, tdate2);
          baseResult.monthly = monthlyComparison;
        }
        
        return baseResult;
      }));

      return res.status(200).json({
        type: 'comparison',
        items: itemResults,
        isMonthly,
        // Backward compatibility fields for single-item consumers
        item: itemResults[0]?.item,
        period1: itemResults[0]?.period1,
        period2: itemResults[0]?.period2,
        difference: itemResults[0]?.difference
      });
    }

    // Case 2: Single Date Range
    const from = fdate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const to = tdate || new Date().toISOString().split('T')[0];
    const singleResults = await Promise.all(itemList.map(itemName => getItemMetrics(itemName, from, to)));
    return res.status(200).json(singleResults);
  } catch (error) {
    console.error('Error fetching item report data:', error);
    res.status(500).json({ error: 'An error occurred while fetching report data' });
  }
});

// POST /item/send-report - Send Item Comparison Report via email
router.post('/send-report', async (req, res) => {
  try {
    const { 
      recipientEmail, 
      subject, 
      message, 
      items, 
      fdate1, 
      tdate1, 
      fdate2, 
      tdate2,
      monthly
    } = req.body;

    // Validate required fields
    if (!recipientEmail || !items || !fdate1 || !tdate1 || !fdate2 || !tdate2) {
      return res.status(400).json({ 
        message: 'Missing required fields: recipientEmail, items, fdate1, tdate1, fdate2, tdate2' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Parse items (support both array and comma-separated string)
    let itemList = [];
    if (Array.isArray(items)) {
      itemList = items;
    } else if (typeof items === 'string') {
      itemList = items.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (itemList.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const isMonthly = monthly === true || monthly === 'true';

    // Generate report data for all items
    const reportData = [];
    for (const itemName of itemList) {
      const period1 = await getItemMetrics(itemName, fdate1, tdate1);
      const period2 = await getItemMetrics(itemName, fdate2, tdate2);

      const itemData = {
        item: itemName,
        period1: {
          ...period1,
          label: `Period 1 (${fdate1} to ${tdate1})`
        },
        period2: {
          ...period2,
          label: `Period 2 (${fdate2} to ${tdate2})`
        },
        difference: {
          rmkQtyDiff: period2.RMK_quantity - period1.RMK_quantity,
          rmdQtyDiff: period2.RMD_quantity - period1.RMD_quantity,
          rmkcetQtyDiff: period2.RMKCET_quantity - period1.RMKCET_quantity,
          schoolQtyDiff: period2.RMKSCHOOL_quantity - period1.RMKSCHOOL_quantity,
          issuedQtyDiff: period2.Issued_quantity - period1.Issued_quantity
        }
      };

      // Add monthly breakdown if requested
      if (isMonthly) {
        const monthlyComparison = await buildMonthlyComparison(itemName, fdate1, tdate1, fdate2, tdate2);
        itemData.monthly = monthlyComparison;
      }

      reportData.push(itemData);
    }

    // Generate PDF
    const pdfBuffer = await generateComparisonPDF(reportData, fdate1, tdate1, fdate2, tdate2, isMonthly);

    // Send email
    await sendReportEmail(recipientEmail, subject, message, pdfBuffer, fdate1, tdate1, fdate2, tdate2);

    res.status(200).json({ message: `Report sent successfully to ${recipientEmail}` });

  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({ message: 'Failed to send report. Please check email configuration and try again.' });
  }
});

// Generate PDF for Item Comparison Report - matches Print Item Comparison layout exactly
async function generateComparisonPDF(reportData, fdate1, tdate1, fdate2, tdate2, isMonthly = false) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Color palette (matching web report exactly)
      const RMK_DARK = '#164863';
      const RMK_LIGHT_BG = '#f1f5f9';
      const RMK_TABLE_BORDER = '#cbd5e1';
      const RMK_DIFF_BG = '#e2e8f0';
      const RMK_POSITIVE = '#059669';
      const RMK_NEGATIVE = '#dc2626';
      const RMK_WHITE = '#ffffff';

      const pageWidth = doc.page.width - 80; // landscape A4 minus margins
      const colWidths = [180, 95, 95, 95, 95, 110]; // Period, RMKEC, RMDEC, RMKCET, Schools, Total Issued
      const rowHeight = 38;
      const tableLeftX = 40;

      // Helper: draw a row with background and borders - matches web table exactly
      function drawRow(values, options = {}) {
        const { bold = false, bgColor = RMK_WHITE, fontColor = '#000000', fontSize = 11, isHeader = false } = options;
        const y = doc.y;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
        let x = tableLeftX;
        values.forEach((val, idx) => {
          // Cell background
          doc.fillColor(bgColor).rect(x, y, colWidths[idx], rowHeight).fill();
          // Cell border - all sides
          doc.strokeColor(RMK_TABLE_BORDER).lineWidth(1).rect(x, y, colWidths[idx], rowHeight).stroke();
          // Cell text
          const textColor = isHeader ? RMK_WHITE : fontColor;
          doc.fillColor(textColor);
          const align = idx === 0 ? 'left' : 'center';
          const padding = idx === 0 ? 12 : 0;
          doc.text(val, x + padding, y + (rowHeight - fontSize) / 2, {
            width: colWidths[idx] - padding * 2,
            align: align
          });
          x += colWidths[idx];
        });
        doc.fillColor('#000000'); // reset
        doc.y = y + rowHeight; // advance cursor to next row
      }

      // Helper: check if we need a new page
      function ensureSpace(neededHeight) {
        if (doc.y + neededHeight > doc.page.height - 60) {
          doc.addPage();
          drawHeader(); // Redraw header on new page
        }
      }

      // Helper: draw header section - matches Print header
      function drawHeader() {
        // Title block
        doc.fontSize(20).font('Helvetica-Bold').fillColor(RMK_DARK).text('R.M.K. GROUP OF INSTITUTIONS', { align: 'center' });
        doc.moveDown(0.4);
        doc.fontSize(14).font('Helvetica-Bold').text('FOOD MANAGEMENT SYSTEM', { align: 'center' });
        doc.moveDown(0.4);
        doc.fontSize(18).font('Helvetica-Bold').text('ITEM-WISE COMPARISON REPORT', { align: 'center' });
        doc.moveDown(0.8);

        // Period info
        doc.fontSize(11).font('Helvetica').fillColor('#334155');
        doc.text(`Period 1: ${fdate1} to ${tdate1}`, { indent: 0 });
        doc.text(`Period 2: ${fdate2} to ${tdate2}`, { indent: 0 });
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, { indent: 0 });
        doc.moveDown(1.5);
      }

      // Draw header on first page
      drawHeader();

      // Table for each item - exactly matching web report structure
      for (let i = 0; i < reportData.length; i++) {
        const data = reportData[i];
        const p1 = data.period1;
        const p2 = data.period2;
        const diff = data.difference;
        const monthly = data.monthly || [];

        // Extract quantities for aggregate view
        const p1RMK = Number(p1.RMK_quantity || 0);
        const p1RMD = Number(p1.RMD_quantity || 0);
        const p1RMKCET = Number(p1.RMKCET_quantity || 0);
        const p1School = Number(p1.RMKSCHOOL_quantity || 0);
        const p1Total = Number(p1.Issued_quantity || 0);

        const p2RMK = Number(p2.RMK_quantity || 0);
        const p2RMD = Number(p2.RMD_quantity || 0);
        const p2RMKCET = Number(p2.RMKCET_quantity || 0);
        const p2School = Number(p2.RMKSCHOOL_quantity || 0);
        const p2Total = Number(p2.Issued_quantity || 0);

        const diffRMK = p2RMK - p1RMK;
        const diffRMD = p2RMD - p1RMD;
        const diffRMKCET = p2RMKCET - p1RMKCET;
        const diffSchool = p2School - p1School;
        const diffTotal = p2Total - p1Total;

        // Format numbers - match web formatting (2 decimal places)
        const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Period labels - exactly as web
        const p1Label = `Period 1 (${fdate1} to ${tdate1})`;
        const p2Label = `Period 2 (${fdate2} to ${tdate2})`;

        // Item title - matches web ItemSectionHeader
        ensureSpace(isMonthly && monthly.length > 0 ? 100 : 220);
        doc.fontSize(14).font('Helvetica-Bold').fillColor(RMK_DARK).text(`Item: ${data.item}`);
        doc.moveDown(0.5);

        if (isMonthly && monthly.length > 0) {
          // MONTHLY BREAKDOWN VIEW - Position-based comparison
          for (let m = 0; m < monthly.length; m++) {
            const month = monthly[m];
            const isUnmatched = month.unmatched !== undefined;
            
            // Check if we need a new page for this month
            const rowsNeeded = isUnmatched ? 4 : 5; // header + data rows + spacing
            ensureSpace(rowsNeeded * rowHeight + 60);
            
            // Month header with comparison index
            const p1MonthStr = month.period1 ? `${month.period1.monthName} ${month.period1.year}` : 'No corresponding month in Period 1';
            const p2MonthStr = month.period2 ? `${month.period2.monthName} ${month.period2.year}` : 'No corresponding month in Period 2';
            
            doc.fontSize(12).font('Helvetica-Bold').fillColor(RMK_DARK).text(`MONTH ${month.comparisonIndex}`);
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`Period 1: ${p1MonthStr}`);
            doc.text(`Period 2: ${p2MonthStr}`);
            doc.moveDown(0.5);

            // Table header row
            drawRow(['Period', 'RMKEC', 'RMDEC', 'RMKCET', 'Schools', 'Total Issued'], {
              bold: true,
              bgColor: RMK_DARK,
              fontColor: RMK_WHITE,
              fontSize: 11,
              isHeader: true
            });

            if (month.period1) {
              // Period 1 row for this month
              const p1M = month.period1;
              drawRow(['Period 1', 
                fmt(p1M.RMK_quantity), fmt(p1M.RMD_quantity), fmt(p1M.RMKCET_quantity), fmt(p1M.RMKSCHOOL_quantity), fmt(p1M.Issued_quantity)
              ], {
                bold: true,
                bgColor: RMK_LIGHT_BG,
                fontColor: '#1e293b',
                fontSize: 11
              });
            } else {
              // No Period 1 data for this position
              drawRow(['Period 1', '-', '-', '-', '-', '-'], {
                bold: true,
                bgColor: RMK_LIGHT_BG,
                fontColor: '#94a3b8',
                fontSize: 11
              });
            }

            if (month.period2) {
              // Period 2 row for this month
              const p2M = month.period2;
              drawRow(['Period 2', 
                fmt(p2M.RMK_quantity), fmt(p2M.RMD_quantity), fmt(p2M.RMKCET_quantity), fmt(p2M.RMKSCHOOL_quantity), fmt(p2M.Issued_quantity)
              ], {
                bold: true,
                bgColor: RMK_LIGHT_BG,
                fontColor: '#1e293b',
                fontSize: 11
              });
            } else {
              // No Period 2 data for this position
              drawRow(['Period 2', '-', '-', '-', '-', '-'], {
                bold: true,
                bgColor: RMK_LIGHT_BG,
                fontColor: '#94a3b8',
                fontSize: 11
              });
            }

            if (!isUnmatched && month.difference) {
              // Difference row for this month
              const diffM = month.difference;
              const diffValues = ['Difference', 
                fmt(diffM.RMK_quantity), fmt(diffM.RMD_quantity), fmt(diffM.RMKCET_quantity), fmt(diffM.RMKSCHOOL_quantity), fmt(diffM.Issued_quantity)
              ];
              const y = doc.y;
              doc.font('Helvetica-Bold').fontSize(11);
              let x = tableLeftX;
              diffValues.forEach((val, idx) => {
                doc.fillColor(RMK_DIFF_BG).rect(x, y, colWidths[idx], rowHeight).fill();
                doc.strokeColor(RMK_TABLE_BORDER).lineWidth(1).rect(x, y, colWidths[idx], rowHeight).stroke();
                
                let textColor = '#1e293b';
                if (idx > 0) {
                  const numVal = Number(val.replace(/,/g, ''));
                  textColor = numVal >= 0 ? RMK_POSITIVE : RMK_NEGATIVE;
                }
                doc.fillColor(textColor);
                const align = idx === 0 ? 'left' : 'center';
                const padding = idx === 0 ? 12 : 0;
                doc.text(val, x + padding, y + (rowHeight - 11) / 2, {
                  width: colWidths[idx] - padding * 2,
                  align: align
                });
                x += colWidths[idx];
              });
              doc.fillColor('#000000');
              doc.y = y + rowHeight;
            } else if (isUnmatched) {
              // Unmatched row - no difference calculated
              const unmatchedLabel = month.unmatched === 'period1' 
                ? 'No corresponding month in Period 1' 
                : 'No corresponding month in Period 2';
              const y = doc.y;
              doc.fillColor(RMK_DIFF_BG).rect(tableLeftX, y, colWidths.reduce((a,b)=>a+b,0), rowHeight).fill();
              doc.strokeColor(RMK_TABLE_BORDER).lineWidth(1).rect(tableLeftX, y, colWidths.reduce((a,b)=>a+b,0), rowHeight).stroke();
              doc.fillColor('#dc2626').font('Helvetica-Bold').fontSize(11);
              doc.text(unmatchedLabel, tableLeftX + 12, y + (rowHeight - 11) / 2);
              doc.fillColor('#000000');
              doc.y = y + rowHeight;
            }

            // Small spacing between months
            if (m < monthly.length - 1) {
              doc.moveDown(0.8);
            }

            // Page break check between months
            if (m < monthly.length - 1 && doc.y > doc.page.height - 100) {
              doc.addPage();
              drawHeader();
            }
          }
        } else {
          // AGGREGATE VIEW (existing logic)
          // Ensure space for item table (item title + header + 3 data rows = ~200pt)
          ensureSpace(220);

          // Item title - matches web ItemSectionHeader
          doc.fontSize(14).font('Helvetica-Bold').fillColor(RMK_DARK).text(`Item: ${data.item}`);
          doc.moveDown(0.5);

          // Table header row - matches web thead
          drawRow(['Period', 'RMKEC', 'RMDEC', 'RMKCET', 'Schools', 'Total Issued'], {
            bold: true,
            bgColor: RMK_DARK,
            fontColor: RMK_WHITE,
            fontSize: 11,
            isHeader: true
          });

          // Period 1 row - matches web tbody tr with background #f1f5f9
          drawRow([p1Label, fmt(p1RMK), fmt(p1RMD), fmt(p1RMKCET), fmt(p1School), fmt(p1Total)], {
            bold: true,
            bgColor: RMK_LIGHT_BG,
            fontColor: '#1e293b',
            fontSize: 11
          });

          // Period 2 row
          drawRow([p2Label, fmt(p2RMK), fmt(p2RMD), fmt(p2RMKCET), fmt(p2School), fmt(p2Total)], {
            bold: true,
            bgColor: RMK_LIGHT_BG,
            fontColor: '#1e293b',
            fontSize: 11
          });

          // Difference row - matches web: background #e2e8f0, bold, color-coded
          const diffValues = ['Difference', fmt(diffRMK), fmt(diffRMD), fmt(diffRMKCET), fmt(diffSchool), fmt(diffTotal)];
          const y = doc.y;
          doc.font('Helvetica-Bold').fontSize(11);
          let x = tableLeftX;
          diffValues.forEach((val, idx) => {
            doc.fillColor(RMK_DIFF_BG).rect(x, y, colWidths[idx], rowHeight).fill();
            doc.strokeColor(RMK_TABLE_BORDER).lineWidth(1).rect(x, y, colWidths[idx], rowHeight).stroke();
            
            let textColor = '#1e293b';
            if (idx > 0) {
              const numVal = Number(val.replace(/,/g, ''));
              textColor = numVal >= 0 ? RMK_POSITIVE : RMK_NEGATIVE;
            }
            doc.fillColor(textColor);
            const align = idx === 0 ? 'left' : 'center';
            const padding = idx === 0 ? 12 : 0;
            doc.text(val, x + padding, y + (rowHeight - 11) / 2, {
              width: colWidths[idx] - padding * 2,
              align: align
            });
            x += colWidths[idx];
          });
          doc.fillColor('#000000');
          doc.y = y + rowHeight; // advance cursor
        }

        // Small spacing after each item's table
        doc.moveDown(1);

        // Add page break if not last item and near bottom
        if (i < reportData.length - 1 && doc.y > doc.page.height - 100) {
          doc.addPage();
          drawHeader();
        }
      }

      // Footer on last page - minimal, only if space allows
      if (doc.y < doc.page.height - 50) {
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748b').text(
          'RMKStockMate Food Management System',
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Send email with PDF attachment
async function sendReportEmail(recipientEmail, subject, message, pdfBuffer, fdate1, tdate1, fdate2, tdate2) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

  // Verify connection
  await transporter.verify();

  // Generate filename
  const fileName = `RMKStockMate_Item_Wise_Comparison_${fdate1}_to_${tdate2}.pdf`;

  // Send email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: subject || 'RMKStockMate - Item-Wise Period Comparison Report',
    text: message || 'Please find attached the Item-Wise Period Comparison Report.',
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}

module.exports = router;