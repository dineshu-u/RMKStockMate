const express = require('express');
const db = require('../db');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
require('dotenv').config();
const router = express.Router();

// Brand palette - same as the item-wise comparison mail
const C = {
  dark: '#164863',
  period1: '#1f5f86',
  period2: '#2a7890',
  variance: '#134e4a',
  lightBg: '#f8fafc',
  altBg: '#f1f5f9',
  diffBg: '#e2e8f0',
  border: '#cbd5e1',
  pos: '#059669',
  neg: '#dc2626',
  white: '#ffffff',
  muted: '#64748b',
  text: '#1e293b'
};

const fmt2 = (n) => Number(n || 0).toFixed(2);
const fmtQ = (n) => String(Number(n || 0));

// ============================================
// PDF drawing helpers
// ============================================
function drawCell(doc, x, y, w, h, text, opts = {}) {
  const { bgColor, fontColor, bold, fontSize, align } = opts;
  if (bgColor) {
    doc.fillColor(bgColor).rect(x, y, w, h).fill();
  }
  doc.strokeColor(C.border).lineWidth(1).rect(x, y, w, h).stroke();
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
  doc.fillColor(fontColor || C.text);
  doc.text(String(text), x + 4, y + (h - fontSize) / 2, {
    width: w - 8,
    align: align || 'center',
    lineBreak: false
  });
  doc.fillColor('#000000');
}

function xOf(colWidths, idx) {
  let x = 0;
  for (let i = 0; i < idx; i++) x += colWidths[i];
  return x;
}

function drawRow(doc, tableX, y, colWidths, values, opts = {}) {
  const { rowHeight, fontSize, bgColor, fontColor, bold, aligns, cellColors } = opts;
  values.forEach((v, i) => {
    drawCell(doc, tableX + xOf(colWidths, i), y, colWidths[i], rowHeight, v, {
      bgColor,
      fontColor: cellColors ? cellColors[i] : fontColor,
      bold,
      fontSize,
      align: aligns ? aligns[i] : undefined
    });
  });
  doc.y = y + rowHeight;
}

function drawBrandedHeader(doc, title, infoLines) {
  doc.fontSize(20).font('Helvetica-Bold').fillColor(C.dark).text('R.M.K. GROUP OF INSTITUTIONS', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(14).font('Helvetica-Bold').text('FOOD MANAGEMENT SYSTEM', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.8);
  doc.fontSize(11).font('Helvetica').fillColor('#334155');
  infoLines.forEach(line => doc.text(line));
  doc.text(`Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown(1.2);
}

// ============================================
// Data fetchers - same SQL as each report's GET route
// ============================================
async function fetchMonthlyData(fdate, tdate) {
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
                     AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(DATE_SUB(?, INTERVAL 1 MONTH), '%Y-%m')
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
    ON p_sub.item = d_sub.item
  `, [fdate, fdate, fdate, fdate, tdate, fdate, tdate]);
  return rows;
}

async function fetchCategoryData(fdate, tdate) {
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
  return result;
}

async function fetchComparisonData({ fdate1, tdate1, fdate2, tdate2, fdate, tdate }) {
  if (fdate1 && tdate1 && fdate2 && tdate2) {
    const [rows] = await db.promise().query(`
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
      `, [fdate1, tdate1, fdate1, tdate1, fdate2, tdate2, fdate2, tdate2, fdate1, tdate1, fdate2, tdate2]);

    return {
      type: 'periods',
      period1: { from: fdate1, to: tdate1, label: `Period 1 (${fdate1} to ${tdate1})` },
      period2: { from: fdate2, to: tdate2, label: `Period 2 (${fdate2} to ${tdate2})` },
      data: rows
    };
  }

  const fromStr = fdate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const toStr = tdate || new Date().toISOString().split('T')[0];

  const startDate = new Date(fromStr);
  const endDate = new Date(toStr);

  if (startDate > endDate) {
    throw new Error('To date must be after From date');
  }

  const months = [];
  const monthColumns = [];

  const startMonth = isNaN(startDate.getMonth()) ? 0 : startDate.getMonth();
  const endMonth = isNaN(endDate.getMonth()) ? 11 : endDate.getMonth();
  const startYear = isNaN(startDate.getFullYear()) ? new Date().getFullYear() : startDate.getFullYear();
  const endYear = isNaN(endDate.getFullYear()) ? startYear : endDate.getFullYear();

  if (startYear === endYear) {
    for (let m = startMonth; m <= endMonth; m++) {
      const monthName = new Date(startYear, m, 1).toLocaleString('default', { month: 'long' });
      months.push(monthName);
      monthColumns.push(`
        COALESCE(SUM(CASE WHEN MONTH(p.date) = ${m + 1} THEN p.quantity ELSE 0 END), 0) AS ${monthName}_quantity,
        COALESCE(SUM(CASE WHEN MONTH(p.date) = ${m + 1} THEN p.amount ELSE 0 END), 0) AS ${monthName}_amount
      `);
    }
  } else {
    // Walk month by month across year boundaries; label with the year so column aliases stay unique
    const cursor = new Date(startYear, startMonth, 1);
    while (cursor.getFullYear() < endYear || (cursor.getFullYear() === endYear && cursor.getMonth() <= endMonth)) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const monthName = new Date(y, m, 1).toLocaleString('default', { month: 'long' });
      const label = `${monthName} ${y}`;
      months.push(label);
      monthColumns.push(`
        COALESCE(SUM(CASE WHEN YEAR(p.date) = ${y} AND MONTH(p.date) = ${m + 1} THEN p.quantity ELSE 0 END), 0) AS \`${label}_quantity\`,
        COALESCE(SUM(CASE WHEN YEAR(p.date) = ${y} AND MONTH(p.date) = ${m + 1} THEN p.amount ELSE 0 END), 0) AS \`${label}_amount\`
      `);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  if (months.length > 24) {
    throw new Error('Date range spans too many months (max 24)');
  }

  const [rows] = await db.promise().query(`
      SELECT
        p.category AS item_category,
        p.item AS item_name,
        ${monthColumns.join(',\n')},
        COALESCE(SUM(p.amount), 0) AS total_amount
      FROM purchase p
      WHERE p.date BETWEEN ? AND ?
      GROUP BY p.category, p.item
      ORDER BY p.category, p.item;
    `, [fromStr, toStr]);

  return {
    type: 'months',
    months,
    data: rows
  };
}

async function fetchCategoryComparisonData({ fdate1, tdate1, fdate2, tdate2, fdate, tdate }) {
  if (fdate1 && tdate1 && fdate2 && tdate2) {
    const [rows] = await db.promise().query(`
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
      `, [fdate1, tdate1, fdate1, tdate1, fdate2, tdate2, fdate2, tdate2, fdate1, tdate1, fdate2, tdate2, fdate1, tdate1, fdate2, tdate2]);

    return {
      type: 'periods',
      period1: { from: fdate1, to: tdate1, label: `Period 1 (${fdate1} - ${tdate1})` },
      period2: { from: fdate2, to: tdate2, label: `Period 2 (${fdate2} - ${tdate2})` },
      data: rows
    };
  }

  const startDate = new Date(fdate || new Date(new Date().getFullYear(), 0, 1));
  const endDate = new Date(tdate || new Date());

  if (startDate > endDate) {
    throw new Error('To date must be after From date');
  }

  const months = [];
  const monthColumns = [];

  const startMonth = isNaN(startDate.getMonth()) ? 0 : startDate.getMonth();
  const endMonth = isNaN(endDate.getMonth()) ? 11 : endDate.getMonth();
  const startYear = isNaN(startDate.getFullYear()) ? new Date().getFullYear() : startDate.getFullYear();
  const endYear = isNaN(endDate.getFullYear()) ? startYear : endDate.getFullYear();

  if (startYear === endYear) {
    for (let m = startMonth; m <= endMonth; m++) {
      const monthName = new Date(startYear, m, 1).toLocaleString('default', { month: 'long' });
      months.push(monthName);
      monthColumns.push(`
        COALESCE(SUM(CASE WHEN MONTH(p.date) = ${m + 1} THEN p.quantity ELSE 0 END), 0) AS ${monthName}_quantity,
        COALESCE(SUM(CASE WHEN MONTH(p.date) = ${m + 1} THEN p.amount ELSE 0 END), 0) AS ${monthName}_amount
      `);
    }
  } else {
    // Walk month by month across year boundaries; label with the year so column aliases stay unique
    const cursor = new Date(startYear, startMonth, 1);
    while (cursor.getFullYear() < endYear || (cursor.getFullYear() === endYear && cursor.getMonth() <= endMonth)) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const monthName = new Date(y, m, 1).toLocaleString('default', { month: 'long' });
      const label = `${monthName} ${y}`;
      months.push(label);
      monthColumns.push(`
        COALESCE(SUM(CASE WHEN YEAR(p.date) = ${y} AND MONTH(p.date) = ${m + 1} THEN p.quantity ELSE 0 END), 0) AS \`${label}_quantity\`,
        COALESCE(SUM(CASE WHEN YEAR(p.date) = ${y} AND MONTH(p.date) = ${m + 1} THEN p.amount ELSE 0 END), 0) AS \`${label}_amount\`
      `);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  if (months.length > 24) {
    throw new Error('Date range spans too many months (max 24)');
  }

  const fromParam = fdate || `${startYear}-01-01`;
  const toParam = tdate || `${startYear}-12-31`;

  const [rows] = await db.promise().query(`
      SELECT
        c.category AS category_name,
        ${monthColumns.join(',\n')},
        COALESCE(SUM(p.amount), 0) AS total_amount
      FROM (SELECT DISTINCT category FROM category) c
      LEFT JOIN purchase p ON c.category = p.category AND (p.date BETWEEN ? AND ?)
      GROUP BY c.category
      ORDER BY c.category;
    `, [fromParam, toParam]);

  return {
    type: 'months',
    months,
    data: rows
  };
}

// ============================================
// PDF generators - match each report's print layout
// ============================================
function generateMonthlyPDF(data, fromDate, toDate) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const tableX = 30;
      const itemW = 116;
      const numW = 37;
      const colWidths = [itemW];
      for (let i = 0; i < 18; i++) colWidths.push(numW);
      const rowHeight = 22;
      const fontSize = 7;

      const groups = [
        ['Opening Stock', 'Purchase', 'Total', 'RMK', 'RMD', 'RMKCET', 'School', 'Issue Total', 'Closing Stock']
      ][0];

      const drawTableHeader = () => {
        const y = doc.y;
        // Row 1: Item Name spans 2 rows; group headers span 2 cols each
        drawCell(doc, tableX, y, itemW, rowHeight * 2, 'Item Name', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: 8 });
        let x = tableX + itemW;
        groups.forEach(g => {
          drawCell(doc, x, y, numW * 2, rowHeight, g, { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: 7.5 });
          x += numW * 2;
        });
        // Row 2: Qty / Amt cells
        x = tableX + itemW;
        for (let i = 0; i < 9; i++) {
          drawCell(doc, x, y + rowHeight, numW, rowHeight, 'Qty', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: 7 });
          x += numW;
          drawCell(doc, x, y + rowHeight, numW, rowHeight, 'Amt', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: 7 });
          x += numW;
        }
        doc.y = y + rowHeight * 2;
      };

      const drawHeaderBlock = () => {
        drawBrandedHeader(doc, 'MONTHLY REPORT', [
          `From: ${fromDate}`,
          `To: ${toDate}`
        ]);
        drawTableHeader();
      };

      drawHeaderBlock();

      let openingTotal = 0, purchaseTotal = 0, grandTotal = 0;
      let rmkTotal = 0, rmdTotal = 0, rmkcetTotal = 0, schoolTotal = 0, issueTotal = 0;

      data.forEach((row, idx) => {
        if (doc.y + rowHeight > doc.page.height - 40) {
          doc.addPage();
          drawHeaderBlock();
        }

        const openingStock = Number(row.openingStock || 0);
        const adjustedOpeningStock = Number(row.adjustedOpeningStock || 0);
        const purchaseQuantity = Number(row.purchaseQuantity || 0);
        const purchaseAmount = Number(row.purchaseAmount || 0);
        const rmk = Number(row.RMK || 0);
        const rmd = Number(row.RMD || 0);
        const rmkcet = Number(row.RMKCET || 0);
        const school = Number(row.RMKSCHOOL || 0);
        const unitPrice = Number(row.unitPrice || 0);

        const totalQuantity = purchaseQuantity + openingStock;
        const totalAmount = purchaseAmount + adjustedOpeningStock;
        const issueQuantity = rmk + rmd + rmkcet + school;
        const issueAmount = issueQuantity * unitPrice;
        const closingQuantity = totalQuantity - issueQuantity > 0 ? totalQuantity - issueQuantity : 0;
        const closingAmount = totalAmount - issueAmount > 0 ? totalAmount - issueAmount : 0;

        openingTotal += adjustedOpeningStock;
        purchaseTotal += purchaseAmount;
        grandTotal += totalAmount;
        rmkTotal += rmk * unitPrice;
        rmdTotal += rmd * unitPrice;
        rmkcetTotal += rmkcet * unitPrice;
        schoolTotal += school * unitPrice;
        issueTotal += issueAmount;

        const bgColor = idx % 2 === 0 ? C.white : C.lightBg;
        drawRow(doc, tableX, doc.y, colWidths, [
          row.item,
          fmtQ(openingStock), fmt2(adjustedOpeningStock),
          fmtQ(purchaseQuantity), fmt2(purchaseAmount),
          fmtQ(totalQuantity), fmt2(totalAmount),
          fmtQ(rmk), fmt2(rmk * unitPrice),
          fmtQ(rmd), fmt2(rmd * unitPrice),
          fmtQ(rmkcet), fmt2(rmkcet * unitPrice),
          fmtQ(school), fmt2(school * unitPrice),
          fmtQ(issueQuantity), fmt2(issueAmount),
          fmtQ(closingQuantity), fmt2(closingAmount)
        ], {
          rowHeight,
          fontSize,
          bgColor,
          aligns: ['left', ...Array(18).fill('center')]
        });
      });

      if (data.length > 0) {
        if (doc.y + rowHeight > doc.page.height - 40) {
          doc.addPage();
          drawHeaderBlock();
        }
        drawRow(doc, tableX, doc.y, colWidths, [
          'Total', '',
          fmt2(openingTotal), '',
          fmt2(purchaseTotal), '',
          fmt2(grandTotal), '',
          fmt2(rmkTotal), '',
          fmt2(rmdTotal), '',
          fmt2(rmkcetTotal), '',
          fmt2(schoolTotal), '',
          fmt2(issueTotal), '',
          fmt2(grandTotal - issueTotal)
        ], {
          rowHeight,
          fontSize,
          bgColor: C.diffBg,
          bold: true,
          aligns: ['left', ...Array(18).fill('center')]
        });
      } else {
        drawRow(doc, tableX, doc.y, colWidths, ['No data available', ...Array(18).fill('')], {
          rowHeight,
          fontSize: 9,
          bgColor: C.white,
          aligns: ['center', ...Array(18).fill('center')]
        });
      }

      doc.fontSize(8).font('Helvetica-Oblique').fillColor(C.muted).text('RMKStockMate Food Management System', { align: 'center' });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateCategoryPDF(data, fromDate, toDate) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const tableX = 40;
      const colWidths = [200, 95, 95, 95, 95, 95, 105];
      const headers = ['Category Name', 'Purchase Total', 'RMK', 'RMD', 'RMKCET', 'School', 'Issue Total'];
      const rowHeight = 30;
      const fontSize = 10;

      const drawTableHeader = () => {
        drawRow(doc, tableX, doc.y, colWidths, headers, {
          rowHeight,
          fontSize,
          bgColor: C.dark,
          fontColor: C.white,
          bold: true,
          aligns: ['left', ...Array(6).fill('center')]
        });
      };

      const drawHeaderBlock = () => {
        drawBrandedHeader(doc, 'CATEGORY REPORT', [
          `From: ${fromDate}`,
          `To: ${toDate}`
        ]);
        drawTableHeader();
      };

      drawHeaderBlock();

      data.forEach((row, idx) => {
        if (doc.y + rowHeight > doc.page.height - 50) {
          doc.addPage();
          drawHeaderBlock();
        }
        const bgColor = idx % 2 === 0 ? C.white : C.lightBg;
        drawRow(doc, tableX, doc.y, colWidths, [
          row.category,
          fmt2(row.purchase_amount),
          fmt2(row.RMK_amount),
          fmt2(row.RMD_amount),
          fmt2(row.RMKCET_amount),
          fmt2(row.RMKSCHOOL_amount),
          fmt2(row.total_amount)
        ], {
          rowHeight,
          fontSize,
          bgColor,
          aligns: ['left', ...Array(6).fill('center')]
        });
      });

      if (data.length > 0) {
        if (doc.y + rowHeight > doc.page.height - 50) {
          doc.addPage();
          drawHeaderBlock();
        }
        drawRow(doc, tableX, doc.y, colWidths, [
          'Total',
          fmt2(data.reduce((a, r) => a + Number(r.purchase_amount || 0), 0)),
          fmt2(data.reduce((a, r) => a + Number(r.RMK_amount || 0), 0)),
          fmt2(data.reduce((a, r) => a + Number(r.RMD_amount || 0), 0)),
          fmt2(data.reduce((a, r) => a + Number(r.RMKCET_amount || 0), 0)),
          fmt2(data.reduce((a, r) => a + Number(r.RMKSCHOOL_amount || 0), 0)),
          fmt2(data.reduce((a, r) => a + Number(r.total_amount || 0), 0))
        ], {
          rowHeight,
          fontSize,
          bgColor: C.diffBg,
          bold: true,
          aligns: ['left', ...Array(6).fill('center')]
        });
      } else {
        drawRow(doc, tableX, doc.y, colWidths, ['No data available', '', '', '', '', '', ''], {
          rowHeight,
          fontSize: 10,
          bgColor: C.white,
          aligns: Array(7).fill('center')
        });
      }

      doc.fontSize(8).font('Helvetica-Oblique').fillColor(C.muted).text('RMKStockMate Food Management System', { align: 'center' });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateComparisonPDF(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const tableX = 40;
      const usable = doc.page.width - 80;
      const rowHeight = 26;
      const diffColor = (val) => Number(val) >= 0 ? C.pos : C.neg;

      const isPeriods = payload.type === 'periods';
      const months = payload.months || [];

      let colWidths, fontSize, headerHeight;

      if (isPeriods) {
        const itemW = 170, catW = 100;
        const dataW = (usable - itemW - catW) / 6;
        colWidths = [itemW, catW, dataW, dataW, dataW, dataW, dataW, dataW];
        fontSize = 8.5;
      } else {
        const itemW = 100, catW = 85;
        const n = Math.max(1, months.length * 2);
        const dataW = (usable - itemW - catW) / n;
        colWidths = [itemW, catW];
        for (let i = 0; i < n; i++) colWidths.push(dataW);
        fontSize = dataW < 30 ? 6 : dataW < 45 ? 7 : 8.5;
      }
      headerHeight = rowHeight * 2;

      const drawTableHeader = () => {
        const y = doc.y;
        if (isPeriods) {
          drawCell(doc, tableX, y, colWidths[0], headerHeight, 'Item Name', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize });
          drawCell(doc, tableX + colWidths[0], y, colWidths[1], headerHeight, 'Category', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize });
          let x = tableX + colWidths[0] + colWidths[1];
          const p1Label = payload.period1 ? payload.period1.label : 'Period 1';
          const p2Label = payload.period2 ? payload.period2.label : 'Period 2';
          drawCell(doc, x, y, colWidths[2] * 2, rowHeight, p1Label, { bgColor: C.period1, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
          x += colWidths[2] * 2;
          drawCell(doc, x, y, colWidths[4] * 2, rowHeight, p2Label, { bgColor: C.period2, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
          x += colWidths[4] * 2;
          drawCell(doc, x, y, colWidths[6] * 2, rowHeight, 'Variance / Difference (P2 - P1)', { bgColor: C.variance, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
          // Row 2
          x = tableX + colWidths[0] + colWidths[1];
          ['Qty', 'Amount', 'Qty', 'Amount', 'Qty Diff', 'Amt Diff'].forEach(label => {
            drawCell(doc, x, y + rowHeight, colWidths[2], rowHeight, label, { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[2];
          });
        } else {
          drawCell(doc, tableX, y, colWidths[0], headerHeight, 'Item Name', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize });
          drawCell(doc, tableX + colWidths[0], y, colWidths[1], headerHeight, 'Category', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize });
          let x = tableX + colWidths[0] + colWidths[1];
          months.forEach(m => {
            drawCell(doc, x, y, colWidths[2] * 2, rowHeight, m, { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[2] * 2;
          });
          x = tableX + colWidths[0] + colWidths[1];
          months.forEach(m => {
            drawCell(doc, x, y + rowHeight, colWidths[2], rowHeight, 'Qty', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[2];
            drawCell(doc, x, y + rowHeight, colWidths[2], rowHeight, 'Amt', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[2];
          });
        }
        doc.y = y + headerHeight;
      };

      const infoLines = isPeriods
        ? [
            `Period 1: ${payload.period1?.from} to ${payload.period1?.to}`,
            `Period 2: ${payload.period2?.from} to ${payload.period2?.to}`
          ]
        : months.length > 0
          ? [`Months: ${months.join(', ')}`]
          : [];

      const drawHeaderBlock = () => {
        drawBrandedHeader(doc, 'MONTHLY MATRIX COMPARISON REPORT', infoLines);
        drawTableHeader();
      };

      drawHeaderBlock();

      const data = payload.data || [];

      if (isPeriods) {
        data.forEach((row, idx) => {
          if (doc.y + rowHeight > doc.page.height - 50) {
            doc.addPage();
            drawHeaderBlock();
          }
          const qtyDiff = Number(row.period2_quantity || 0) - Number(row.period1_quantity || 0);
          const amtDiff = Number(row.period2_amount || 0) - Number(row.period1_amount || 0);
          const bgColor = idx % 2 === 0 ? C.white : C.lightBg;
          drawRow(doc, tableX, doc.y, colWidths, [
            row.item_name,
            row.item_category,
            fmt2(row.period1_quantity),
            fmt2(row.period1_amount),
            fmt2(row.period2_quantity),
            fmt2(row.period2_amount),
            qtyDiff > 0 ? `+${fmt2(qtyDiff)}` : fmt2(qtyDiff),
            amtDiff > 0 ? `+${fmt2(amtDiff)}` : fmt2(amtDiff)
          ], {
            rowHeight,
            fontSize,
            bgColor,
            aligns: ['left', 'left', ...Array(6).fill('center')],
            cellColors: [C.text, C.text, C.text, C.text, C.text, C.text, diffColor(qtyDiff), diffColor(amtDiff)]
          });
        });

        if (data.length > 0) {
          if (doc.y + rowHeight > doc.page.height - 50) {
            doc.addPage();
            drawHeaderBlock();
          }
          const tQty1 = data.reduce((a, r) => a + Number(r.period1_quantity || 0), 0);
          const tAmt1 = data.reduce((a, r) => a + Number(r.period1_amount || 0), 0);
          const tQty2 = data.reduce((a, r) => a + Number(r.period2_quantity || 0), 0);
          const tAmt2 = data.reduce((a, r) => a + Number(r.period2_amount || 0), 0);
          const dQty = tQty2 - tQty1;
          const dAmt = tAmt2 - tAmt1;
          drawRow(doc, tableX, doc.y, colWidths, [
            'Total', '',
            fmt2(tQty1), fmt2(tAmt1),
            fmt2(tQty2), fmt2(tAmt2),
            dQty > 0 ? `+${fmt2(dQty)}` : fmt2(dQty),
            dAmt > 0 ? `+${fmt2(dAmt)}` : fmt2(dAmt)
          ], {
            rowHeight,
            fontSize,
            bgColor: C.diffBg,
            bold: true,
            aligns: ['left', 'left', ...Array(6).fill('center')],
            cellColors: [C.text, C.text, C.text, C.text, C.text, C.text, diffColor(dQty), diffColor(dAmt)]
          });
        }
      } else {
        data.forEach((row, idx) => {
          if (doc.y + rowHeight > doc.page.height - 50) {
            doc.addPage();
            drawHeaderBlock();
          }
          const values = [row.item_name, row.item_category];
          months.forEach(m => {
            values.push(fmt2(row[`${m}_quantity`]));
            values.push(fmt2(row[`${m}_amount`]));
          });
          const bgColor = idx % 2 === 0 ? C.white : C.lightBg;
          drawRow(doc, tableX, doc.y, colWidths, values, {
            rowHeight,
            fontSize,
            bgColor,
            aligns: ['left', 'left', ...Array(months.length * 2).fill('center')]
          });
        });

        if (data.length > 0) {
          if (doc.y + rowHeight > doc.page.height - 50) {
            doc.addPage();
            drawHeaderBlock();
          }
          const values = ['Total', ''];
          months.forEach(m => {
            values.push(fmt2(data.reduce((a, r) => a + Number(r[`${m}_quantity`] || 0), 0)));
            values.push(fmt2(data.reduce((a, r) => a + Number(r[`${m}_amount`] || 0), 0)));
          });
          drawRow(doc, tableX, doc.y, colWidths, values, {
            rowHeight,
            fontSize,
            bgColor: C.diffBg,
            bold: true,
            aligns: ['left', 'left', ...Array(months.length * 2).fill('center')]
          });
        }
      }

      if (data.length === 0) {
        drawRow(doc, tableX, doc.y, colWidths, ['No purchase data available for selected period', ...Array(colWidths.length - 1).fill('')], {
          rowHeight,
          fontSize: 10,
          bgColor: C.white,
          aligns: Array(colWidths.length).fill('center')
        });
      }

      doc.fontSize(8).font('Helvetica-Oblique').fillColor(C.muted).text('RMKStockMate Food Management System', { align: 'center' });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateCategoryComparisonPDF(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const tableX = 40;
      const usable = doc.page.width - 80;
      const rowHeight = 26;

      const isPeriods = payload.type === 'periods';
      const months = payload.months || [];

      let colWidths, fontSize;
      if (isPeriods) {
        colWidths = [210, 95, 105, 95, 105, 130];
        fontSize = 9;
      } else {
        const catW = 200;
        const totalW = 110;
        const n = Math.max(1, months.length * 2);
        const dataW = (usable - catW - totalW) / n;
        colWidths = [catW];
        for (let i = 0; i < n; i++) colWidths.push(dataW);
        colWidths.push(totalW);
        fontSize = dataW < 30 ? 6 : dataW < 45 ? 7 : 9;
      }
      const headerHeight = rowHeight * 2;

      const drawTableHeader = () => {
        const y = doc.y;
        if (isPeriods) {
          drawCell(doc, tableX, y, colWidths[0], headerHeight, 'Category Name', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize });
          let x = tableX + colWidths[0];
          const p1Label = payload.period1 ? payload.period1.label : 'Period 1';
          const p2Label = payload.period2 ? payload.period2.label : 'Period 2';
          drawCell(doc, x, y, colWidths[1] + colWidths[2], rowHeight, p1Label, { bgColor: C.period1, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
          x += colWidths[1] + colWidths[2];
          drawCell(doc, x, y, colWidths[3] + colWidths[4], rowHeight, p2Label, { bgColor: C.period2, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
          x += colWidths[3] + colWidths[4];
          drawCell(doc, x, y, colWidths[5], headerHeight, 'Total Amount', { bgColor: C.variance, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
          x = tableX + colWidths[0];
          ['Qty', 'Amount'].forEach(label => {
            drawCell(doc, x, y + rowHeight, colWidths[1], rowHeight, label, { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[1];
          });
          x += 0;
          ['Qty', 'Amount'].forEach(label => {
            drawCell(doc, x, y + rowHeight, colWidths[3], rowHeight, label, { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[3];
          });
        } else {
          drawCell(doc, tableX, y, colWidths[0], headerHeight, 'Category Name', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize });
          let x = tableX + colWidths[0];
          months.forEach(m => {
            drawCell(doc, x, y, colWidths[1] * 2, rowHeight, m, { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[1] * 2;
          });
          drawCell(doc, x, y, colWidths[colWidths.length - 1], headerHeight, 'Total Amount', { bgColor: C.variance, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
          x = tableX + colWidths[0];
          months.forEach(m => {
            drawCell(doc, x, y + rowHeight, colWidths[1], rowHeight, 'Qty', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[1];
            drawCell(doc, x, y + rowHeight, colWidths[1], rowHeight, 'Amt', { bgColor: C.dark, fontColor: C.white, bold: true, fontSize: fontSize - 0.5 });
            x += colWidths[1];
          });
        }
        doc.y = y + headerHeight;
      };

      const infoLines = isPeriods
        ? [
            `Period 1: ${payload.period1?.from} to ${payload.period1?.to}`,
            `Period 2: ${payload.period2?.from} to ${payload.period2?.to}`
          ]
        : months.length > 0
          ? [`Months: ${months.join(', ')}`]
          : [];

      const drawHeaderBlock = () => {
        drawBrandedHeader(doc, 'CATEGORY COMPARISON REPORT', infoLines);
        drawTableHeader();
      };

      drawHeaderBlock();

      const data = payload.data || [];

      const totalColIdx = isPeriods ? 5 : colWidths.length - 1;

      data.forEach((row, idx) => {
        if (doc.y + rowHeight > doc.page.height - 50) {
          doc.addPage();
          drawHeaderBlock();
        }
        const values = isPeriods
          ? [
              row.category_name,
              fmt2(row.period1_quantity),
              fmt2(row.period1_amount),
              fmt2(row.period2_quantity),
              fmt2(row.period2_amount),
              fmt2(row.total_amount)
            ]
          : (() => {
              const v = [row.category_name];
              months.forEach(m => {
                v.push(fmt2(row[`${m}_quantity`]));
                v.push(fmt2(row[`${m}_amount`]));
              });
              v.push(fmt2(row.total_amount));
              return v;
            })();
        const bgColor = idx % 2 === 0 ? C.white : C.lightBg;
        const aligns = ['left', ...Array(values.length - 1).fill('center')];
        const cellColors = [...Array(values.length).fill(C.text)];
        cellColors[totalColIdx] = C.dark;
        drawRow(doc, tableX, doc.y, colWidths, values, {
          rowHeight,
          fontSize,
          bgColor,
          aligns,
          cellColors
        });
      });

      if (data.length > 0) {
        if (doc.y + rowHeight > doc.page.height - 50) {
          doc.addPage();
          drawHeaderBlock();
        }
        const values = isPeriods
          ? [
              'Total',
              fmt2(data.reduce((a, r) => a + Number(r.period1_quantity || 0), 0)),
              fmt2(data.reduce((a, r) => a + Number(r.period1_amount || 0), 0)),
              fmt2(data.reduce((a, r) => a + Number(r.period2_quantity || 0), 0)),
              fmt2(data.reduce((a, r) => a + Number(r.period2_amount || 0), 0)),
              fmt2(data.reduce((a, r) => a + Number(r.total_amount || 0), 0))
            ]
          : (() => {
              const v = ['Total'];
              months.forEach(m => {
                v.push(fmt2(data.reduce((a, r) => a + Number(r[`${m}_quantity`] || 0), 0)));
                v.push(fmt2(data.reduce((a, r) => a + Number(r[`${m}_amount`] || 0), 0)));
              });
              v.push(fmt2(data.reduce((a, r) => a + Number(r.total_amount || 0), 0)));
              return v;
            })();
        drawRow(doc, tableX, doc.y, colWidths, values, {
          rowHeight,
          fontSize,
          bgColor: C.diffBg,
          bold: true,
          aligns: ['left', ...Array(values.length - 1).fill('center')]
        });
      } else {
        drawRow(doc, tableX, doc.y, colWidths, ['No category purchase data found for selected periods', ...Array(colWidths.length - 1).fill('')], {
          rowHeight,
          fontSize: 10,
          bgColor: C.white,
          aligns: Array(colWidths.length).fill('center')
        });
      }

      doc.fontSize(8).font('Helvetica-Oblique').fillColor(C.muted).text('RMKStockMate Food Management System', { align: 'center' });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// Mailer - same transport as item-wise report mail
// ============================================
async function sendReportEmail(recipientEmail, subject, message, pdfBuffer, fileName) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

  await transporter.verify();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: subject || 'RMKStockMate Report',
    text: message || 'Please find the attached report.',
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

// ============================================
// Global endpoint: email any report as PDF
// ============================================
router.post('/send-pdf-report', async (req, res) => {
  try {
    const {
      recipientEmail,
      subject,
      message,
      reportType,
      fileName,
      fromDate,
      toDate,
      fromDate1,
      toDate1,
      fromDate2,
      toDate2
    } = req.body;

    if (!recipientEmail || !reportType) {
      return res.status(400).json({ message: 'Missing required fields: recipientEmail, reportType' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    let pdfBuffer = null;
    let finalFileName = fileName;

    if (reportType === 'monthly') {
      if (!fromDate || !toDate) {
        return res.status(400).json({ message: 'fromDate and toDate are required for the monthly report' });
      }
      const data = await fetchMonthlyData(fromDate, toDate);
      pdfBuffer = await generateMonthlyPDF(data, fromDate, toDate);
      finalFileName = finalFileName || `RMKStockMate_Monthly_Report_${fromDate}_to_${toDate}.pdf`;

    } else if (reportType === 'category') {
      if (!fromDate || !toDate) {
        return res.status(400).json({ message: 'fromDate and toDate are required for the category report' });
      }
      const data = await fetchCategoryData(fromDate, toDate);
      pdfBuffer = await generateCategoryPDF(data, fromDate, toDate);
      finalFileName = finalFileName || `RMKStockMate_Category_Report_${fromDate}_to_${toDate}.pdf`;

    } else if (reportType === 'comparison') {
      const payload = await fetchComparisonData({ fdate1: fromDate1, tdate1: toDate1, fdate2: fromDate2, tdate2: toDate2, fdate: fromDate, tdate: toDate });
      pdfBuffer = await generateComparisonPDF(payload);
      finalFileName = finalFileName || `RMKStockMate_Comparison_Report.pdf`;

    } else if (reportType === 'categorycomparison') {
      const payload = await fetchCategoryComparisonData({ fdate1: fromDate1, tdate1: toDate1, fdate2: fromDate2, tdate2: toDate2, fdate: fromDate, tdate: toDate });
      pdfBuffer = await generateCategoryComparisonPDF(payload);
      finalFileName = finalFileName || `RMKStockMate_Category_Comparison_Report.pdf`;

    } else {
      return res.status(400).json({ message: 'Invalid reportType. Supported: monthly, category, comparison, categorycomparison' });
    }

    if (!finalFileName.endsWith('.pdf')) {
      finalFileName += '.pdf';
    }

    await sendReportEmail(recipientEmail, subject, message, pdfBuffer, finalFileName);
    res.status(200).json({ message: `Report sent successfully to ${recipientEmail}` });

  } catch (error) {
    console.error('Error sending report email:', error);
    res.status(500).json({
      message: error && error.message
        ? `Failed to send report: ${error.message}`
        : 'Failed to send report. Please check email configuration and try again.'
    });
  }
});

module.exports = router;
