const PDFDocument = require('pdfkit');

const PDF_DEBUG = process.env.PDF_DEBUG === '1' || !!process.env.PDF_DEBUG_DIR;

const RMK_DARK = '#164863';
const RMK_LIGHT_BG = '#f1f5f9';
const RMK_TABLE_BORDER = '#cbd5e1';
const RMK_DIFF_BG = '#e2e8f0';
const RMK_POSITIVE = '#059669';
const RMK_NEGATIVE = '#dc2626';
const RMK_WHITE = '#ffffff';

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function createDoc(landscape = false, size = 'A4') {
  return new PDFDocument({ margin: 40, size, layout: landscape ? 'landscape' : 'portrait' });
}

function docToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    doc.end();
  });
}

function drawHeader(doc, title, subtitle, dateInfo) {
  doc.fontSize(20).font('Helvetica-Bold').fillColor(RMK_DARK).text('R.M.K. GROUP OF INSTITUTIONS', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(14).font('Helvetica-Bold').text('FOOD MANAGEMENT SYSTEM', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.8);

  if (subtitle) {
    doc.fontSize(12).font('Helvetica').fillColor('#334155').text(subtitle, { align: 'center' });
    doc.moveDown(0.4);
  }

  if (dateInfo) {
    doc.fontSize(11).font('Helvetica').fillColor('#334155');
    if (dateInfo.period1) doc.text(`Period 1: ${dateInfo.period1}`);
    if (dateInfo.period2) doc.text(`Period 2: ${dateInfo.period2}`);
    if (dateInfo.single) doc.text(`Date Range: ${dateInfo.single}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(1.5);
  }
}

function drawTable(doc, headers, rows, options = {}) {
  const {
    colWidths,
    rowHeight = 30,
    tableLeftX = 40,
    headerBgColor = RMK_DARK,
    headerFontColor = RMK_WHITE,
    rowBgColor = RMK_WHITE,
    altRowBgColor = RMK_LIGHT_BG,
    totalRowBgColor = RMK_DIFF_BG,
    fontSize = 10,
    headerFontSize = 10,
    numberFormat = fmt
  } = options;

  const pageWidth = doc.page.width - 80;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const scale = totalWidth > pageWidth ? pageWidth / totalWidth : 1;
  const scaledWidths = colWidths.map(w => w * scale);
  const leftX = tableLeftX;

  function ensureSpace(needed) {
    if (doc.y + needed > doc.page.height - 60) {
      doc.addPage();
      return true;
    }
    return false;
  }

  function drawRow(values, rowOptions = {}) {
    const { bold = false, bgColor: bgColorParam = rowBgColor, fontColor = '#000000', isHeader = false, isTotal = false, align = 'center' } = rowOptions;
    let bgColor = bgColorParam;
    const y = doc.y;

    if (PDF_DEBUG) {
      console.log(`[drawTable/drawRow] isHeader=${isHeader} isTotal=${isTotal} y=${y.toFixed(1)} rowHeight=${rowHeight} values=${JSON.stringify(values)}`);
    }

    if (isTotal) {
      bgColor = totalRowBgColor;
    }

    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? headerFontSize : fontSize);

    let x = leftX;
    values.forEach((val, idx) => {
      const cellWidth = scaledWidths[idx];
      doc.fillColor(bgColor).rect(x, y, cellWidth, rowHeight).fill();
      doc.strokeColor(RMK_TABLE_BORDER).lineWidth(0.5).rect(x, y, cellWidth, rowHeight).stroke();

      const baseColor = isHeader ? headerFontColor : fontColor;
      const textColor = typeof baseColor === 'function' ? baseColor(idx, val) : baseColor;
      doc.fillColor(textColor);

      const cellAlign = typeof align === 'function' ? align(idx, val) : align;
      const padding = cellAlign === 'left' ? 8 : 4;

      doc.text(val, x + padding, y + (rowHeight - (isHeader ? headerFontSize : fontSize)) / 2, {
        width: cellWidth - padding * 2,
        align: cellAlign
      });
      x += cellWidth;
    });
    doc.fillColor('#000000');
    doc.y = y + rowHeight;
  }

  ensureSpace((rows.length + 2) * rowHeight);
  drawRow(headers, { bold: true, bgColor: headerBgColor, fontColor: headerFontColor, isHeader: true });

  rows.forEach((row, i) => {
    ensureSpace(rowHeight + 10);
    const isTotalRow = row.isTotal === true;
    const bgColor = isTotalRow ? totalRowBgColor : (i % 2 === 0 ? rowBgColor : altRowBgColor);
    drawRow(row.values, { 
      bold: row.bold || isTotalRow, 
      bgColor, 
      fontColor: row.fontColor,
      isTotal: isTotalRow,
      align: row.align
    });
  });

  return doc;
}

async function generateCategoryComparisonPDF(reportData, period1Label, period2Label) {
  const doc = createDoc(true);

  // Diagnostic page counter (doc.bufferedPageCount() is not a function in this PDFKit version)
  let pageCount = 1;
  doc.on('pageAdded', () => pageCount++);

  // ---- Design tokens extracted from the reference PDF's content stream ----
  const PAGE_W = 841.89;
  const MARGIN = 40;
  const TABLE_TOP = 188.6;          // table starts here on EVERY page (reference value)
  const ROW_H = 26;                  // compact uniform row height (reference value)
  const DATA_TOP = TABLE_TOP + 2 * ROW_H; // below the two-row grouped header
  const ROW_BOTTOM_LIMIT = 526.6;    // last row bottom (reference value)

  // Columns: Category | P1 Qty | P1 Amt | P2 Qty | P2 Amt | Diff Qty | Diff Amt
  const COLS = [180, 90, 102, 90, 102, 90, 102];
  const TABLE_W = COLS.reduce((a, b) => a + b, 0); // 756, fits 761.89 usable
  const TABLE_X = MARGIN + ((PAGE_W - 2 * MARGIN) - TABLE_W) / 2;
  const COL_X = [];
  { let acc = TABLE_X; COLS.forEach((w, i) => { COL_X[i] = acc; acc += w; }); }

  const C = {
    brand: '#164863',     // main dark blue (category cell, subheaders, titles)
    groupP1: '#1f5f86',   // Period 1 group header
    groupP2: '#2a7890',   // Period 2 group header
    groupDiff: '#134e4a', // Difference group header
    border: '#cbd5e1',
    rowA: '#ffffff',
    rowB: '#f8fafc',
    text: '#1e293b',
    sub: '#334155',
    muted: '#64748b',
    pos: '#059669',
    neg: '#dc2626',
    totalBg: '#e2e8f0',
    white: '#ffffff'
  };

  // Plain fixed(2) formatting — matches the reference PDF and the website report
  const num = (v) => Number(v || 0).toFixed(2);

  // Draw one cell: background first, then border, then text (explicit coordinates)
  function cell(x, y, w, h, fill) {
    doc.fillColor(fill).rect(x, y, w, h).fill();
    doc.strokeColor(C.border).lineWidth(1).rect(x, y, w, h).stroke();
  }

  function cellText(str, x, y, w, h, opts = {}) {
    const { size = 9, bold = false, color = C.text, align = 'center' } = opts;
    const s = String(str);
    if (!s) return; // blank cell (e.g., empty category name) — background already drawn
    const tx = align === 'left' ? x + 8 : x + 4;
    const tw = align === 'left' ? w - 16 : w - 8;

    // Safe width fallback: an unusually long name is shrunk, then ellipsized,
    // so it can never overlap the adjacent cell. Normal-width text is untouched.
    let fitSize = size;
    let outStr = s;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fitSize);
    if (doc.widthOfString(outStr) > tw) {
      while (fitSize > 7 && doc.widthOfString(outStr) > tw) {
        fitSize -= 0.5;
        doc.fontSize(fitSize);
      }
      if (doc.widthOfString(outStr) > tw) {
        while (outStr.length > 1 && doc.widthOfString(outStr + '...') > tw) {
          outStr = outStr.slice(0, -1);
        }
        outStr += '...';
      }
    }

    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fitSize).fillColor(color);
    const ty = y + (h - fitSize) / 2 + 1.2;
    doc.text(outStr, tx, ty, { width: tw, align, lineBreak: false });
    doc.fillColor('#000000');
  }

  // Full page chrome: header block + grouped table header (repeats on every page)
  function drawChrome() {
    const cw = PAGE_W - 2 * MARGIN;

    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.brand)
      .text('R.M.K. GROUP OF INSTITUTIONS', MARGIN, 42, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.brand)
      .text('FOOD MANAGEMENT SYSTEM', MARGIN, 72, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.brand)
      .text('CATEGORY COMPARISON REPORT', MARGIN, 94, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(10).fillColor(C.sub)
      .text(`Period 1: ${period1Label}`, MARGIN, 122, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(10).fillColor(C.sub)
      .text(`Period 2: ${period2Label}`, MARGIN, 138, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor(C.muted)
      .text(`Generated: ${new Date().toLocaleDateString()}`, MARGIN, 156, { width: cw, align: 'center', lineBreak: false });
    doc.fillColor('#000000');

    // Grouped header row 1 (Category cell spans both header rows)
    cell(COL_X[0], TABLE_TOP, COLS[0], 2 * ROW_H, C.brand);
    cellText('Category Name', COL_X[0], TABLE_TOP, COLS[0], 2 * ROW_H, { size: 9, bold: true, color: C.white });

    const groups = [
      { x: COL_X[1], w: COLS[1] + COLS[2], fill: C.groupP1, label: period1Label },
      { x: COL_X[3], w: COLS[3] + COLS[4], fill: C.groupP2, label: period2Label },
      { x: COL_X[5], w: COLS[5] + COLS[6], fill: C.groupDiff, label: 'Difference (P2 - P1)' }
    ];
    const subTop = TABLE_TOP + ROW_H;
    groups.forEach(g => {
      cell(g.x, TABLE_TOP, g.w, ROW_H, g.fill);
      cellText(g.label, g.x, TABLE_TOP, g.w, ROW_H, { size: 9, bold: true, color: C.white });
      // Subheader cells: Qty | Amount
      cell(g.x, subTop, COLS[1], ROW_H, C.brand);
      cellText('Qty', g.x, subTop, COLS[1], ROW_H, { size: 8.5, bold: true, color: C.white });
      cell(g.x + COLS[1], subTop, COLS[2], ROW_H, C.brand);
      cellText('Amount', g.x + COLS[1], subTop, COLS[2], ROW_H, { size: 8.5, bold: true, color: C.white });
    });

    doc.y = DATA_TOP;
  }

  // Map report rows to display values (same data & calculations as the website report)
  const dataRows = reportData.map(r => ({
    name: r.category_name == null ? '' : String(r.category_name),
    values: [
      num(r.period1_quantity),
      num(r.period1_amount),
      num(r.period2_quantity),
      num(r.period2_amount),
      num(Number(r.period2_quantity || 0) - Number(r.period1_quantity || 0)),
      num(Number(r.period2_amount || 0) - Number(r.period1_amount || 0))
    ],
    p1q: Number(r.period1_quantity || 0), p1a: Number(r.period1_amount || 0),
    p2q: Number(r.period2_quantity || 0), p2a: Number(r.period2_amount || 0)
  }));

  const totals = dataRows.reduce((t, r) => ({
    p1q: t.p1q + r.p1q, p1a: t.p1a + r.p1a, p2q: t.p2q + r.p2q, p2a: t.p2a + r.p2a
  }), { p1q: 0, p1a: 0, p2q: 0, p2a: 0 });

  const totalValues = [
    num(totals.p1q), num(totals.p1a), num(totals.p2q), num(totals.p2a),
    num(totals.p2q - totals.p1q), num(totals.p2a - totals.p1a)
  ];

  if (PDF_DEBUG) {
    console.log(`[generateCategoryComparisonPDF] reportData rows=${reportData.length}`);
    console.log('[generateCategoryComparisonPDF] first two rows:',
      JSON.stringify(dataRows.slice(0, 2).map(r => [r.name, ...r.values])));
    console.log('[generateCategoryComparisonPDF] total row:', JSON.stringify(['Total', ...totalValues]));
  }

  drawChrome();
  let y = DATA_TOP;

  // Data rows — never split a row across pages
  dataRows.forEach((r, i) => {
    if (y + ROW_H > ROW_BOTTOM_LIMIT) {
      doc.addPage();
      drawChrome();
      y = DATA_TOP;
    }
    if (PDF_DEBUG) {
      console.log(`[generateCategoryComparisonPDF] row ${i} y=${y.toFixed(1)} name="${r.name}" vals=[${r.values.join(', ')}]`);
    }
    const bg = i % 2 === 0 ? C.rowA : C.rowB;
    cell(COL_X[0], y, COLS[0], ROW_H, bg);
    cellText(r.name, COL_X[0], y, COLS[0], ROW_H, { size: 9, align: 'left' });
    r.values.forEach((v, ci) => {
      const col = COL_X[ci + 1];
      cell(col, y, COLS[ci + 1], ROW_H, bg);
      const isDiff = ci >= 4;
      const diffColor = Number(v) >= 0 ? C.pos : C.neg;
      cellText(v, col, y, COLS[ci + 1], ROW_H, { size: 9, color: isDiff ? diffColor : C.text });
    });
    y += ROW_H;
  });

  // Total row — after ALL category rows, emphasized like the reference
  if (y + ROW_H > ROW_BOTTOM_LIMIT) {
    doc.addPage();
    drawChrome();
    y = DATA_TOP;
  }
  if (PDF_DEBUG) console.log(`[generateCategoryComparisonPDF] total row y=${y.toFixed(1)}`);
  cell(COL_X[0], y, COLS[0], ROW_H, C.totalBg);
  cellText('Total', COL_X[0], y, COLS[0], ROW_H, { size: 9, bold: true, align: 'left' });
  totalValues.forEach((v, ci) => {
    const col = COL_X[ci + 1];
    cell(col, y, COLS[ci + 1], ROW_H, C.totalBg);
    cellText(v, col, y, COLS[ci + 1], ROW_H, { size: 9, bold: true, color: C.text });
  });

  // Small unobtrusive footer — last page only, like the reference.
  // y=540 keeps the 8pt line inside the bottom margin (555.28), otherwise
  // PDFKit auto-adds a blank page to hold the footer alone.
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.muted)
    .text('RMKStockMate Food Management System', MARGIN, 540, { width: PAGE_W - 2 * MARGIN, align: 'center', lineBreak: false });
  doc.fillColor('#000000');

  const buffer = await docToBuffer(doc);

  if (PDF_DEBUG) {
    console.log(`[generateCategoryComparisonPDF] final page count=${pageCount} buffer=${buffer.length} bytes`);
  }

  return buffer;
}

async function generateMonthlyMatrixComparisonPDF(reportData, months, periodInfo) {
  const doc = createDoc(true);

  let pageCount = 1;
  doc.on('pageAdded', () => pageCount++);

  // ---- Same design tokens as the reference-matched Category Comparison PDF ----
  const PAGE_W = 841.89;
  const MARGIN = 40;
  const TABLE_TOP = 188.6;
  const ROW_H = 26;
  const DATA_TOP = TABLE_TOP + 2 * ROW_H;
  const ROW_BOTTOM_LIMIT = 526.6;
  const usableW = PAGE_W - 2 * MARGIN;

  const C = {
    brand: '#164863', groupP1: '#1f5f86', groupP2: '#2a7890', groupDiff: '#134e4a',
    border: '#cbd5e1', rowA: '#ffffff', rowB: '#f8fafc', text: '#1e293b',
    sub: '#334155', muted: '#64748b', pos: '#059669', neg: '#dc2626',
    totalBg: '#e2e8f0', white: '#ffffff'
  };

  const num = (v) => Number(v || 0).toFixed(2);
  const isPeriods = periodInfo.type === 'periods';
  const isItemRows = reportData.length > 0 && Object.prototype.hasOwnProperty.call(reportData[0], 'item_name');

  // Layout: periods mode has fixed 8 columns; months mode adapts to month count
  let colX, colW, groupDefs, dataFont, tableW, tableX;

  if (isPeriods) {
    colW = [160, 110, 74, 84, 74, 84, 74, 84]; // Item, Category, P1 Q/A, P2 Q/A, Diff Q/A
    tableW = colW.reduce((a, b) => a + b, 0);
    tableX = MARGIN + (usableW - tableW) / 2;
    colX = []; { let acc = tableX; colW.forEach((w) => { colX.push(acc); acc += w; }); }
    groupDefs = [
      { x: colX[2], w: colW[2] + colW[3], qw: colW[2], fill: C.groupP1, label: periodInfo.period1 },
      { x: colX[4], w: colW[4] + colW[5], qw: colW[4], fill: C.groupP2, label: periodInfo.period2 },
      { x: colX[6], w: colW[6] + colW[7], qw: colW[6], fill: C.groupDiff, label: 'Difference (P2 - P1)' }
    ];
    dataFont = 9;
  }

  // Months mode is chunked below (chunkMonths) because column count varies;
  // layout is computed per chunk in drawMonthsTable().

  function cellRect(x, y, w, h, fill) {
    doc.fillColor(fill).rect(x, y, w, h).fill();
    doc.strokeColor(C.border).lineWidth(1).rect(x, y, w, h).stroke();
  }

  // Fitting text: shrink font, then wrap up to 2 lines; returns used height
  function fitText(str, w, maxH, baseSize) {
    const s = String(str == null ? '' : str);
    if (!s) return { lines: [''], size: baseSize, h: ROW_H };
    let size = baseSize;
    doc.font('Helvetica').fontSize(size);
    if (doc.widthOfString(s) <= w && maxH >= ROW_H) return { lines: [s], size, h: ROW_H };
    if (size > 8) {
      size = 8;
      doc.font('Helvetica').fontSize(size);
      if (doc.widthOfString(s) <= w && maxH >= ROW_H) return { lines: [s], size, h: ROW_H };
    }
    if (maxH >= 36) {
      // wrap to 2 lines at size 8
      const words = s.split(' ');
      let l1 = '', l2 = '';
      for (const word of words) {
        if (!l1 || doc.widthOfString(l1 + ' ' + word) <= w) l1 = l1 ? l1 + ' ' + word : word;
        else l2 = l2 ? l2 + ' ' + word : word;
      }
      if (l2 && doc.widthOfString(l2) <= w) return { lines: [l1, l2], size: 8, h: 36 };
    }
    // last resort: truncate with ellipsis
    let t = s;
    doc.font('Helvetica').fontSize(size);
    while (t.length > 1 && doc.widthOfString(t + '...') > w) t = t.slice(0, -1);
    return { lines: [t + '...'], size, h: ROW_H };
  }

  function drawFitted(str, x, y, w, h, opts = {}) {
    const { bold = false, color = C.text, align = 'left' } = opts;
    const fit = fitText(str, w - 10, h, 9);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fit.size).fillColor(color);
    const lineH = fit.size * 1.15;
    const startY = y + (h - lineH * fit.lines.length) / 2 + 1.2;
    fit.lines.forEach((line, i) => {
      doc.text(line, x + 6, startY + i * lineH, { width: w - 10, align, lineBreak: false });
    });
    doc.fillColor('#000000');
  }

  // Numbers never wrap; auto-shrink instead of overflowing the cell
  function drawNumber(str, x, y, w, h, opts = {}) {
    const { bold = false, color = C.text, baseSize = dataFont } = opts;
    const s = String(str == null ? '' : str);
    let size = baseSize;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    while (size > 6 && doc.widthOfString(s) > w - 8) {
      size -= 0.5;
      doc.fontSize(size);
    }
    const ty = y + (h - size) / 2 + 1.2;
    doc.fillColor(color);
    doc.text(s, x + 4, ty, { width: w - 8, align: 'center', lineBreak: false });
    doc.fillColor('#000000');
  }

  function drawChrome(chunkNote) {
    const cw = usableW;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.brand)
      .text('R.M.K. GROUP OF INSTITUTIONS', MARGIN, 42, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.brand)
      .text('FOOD MANAGEMENT SYSTEM', MARGIN, 72, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.brand)
      .text(isPeriods ? 'MONTHLY MATRIX COMPARISON REPORT' : 'MONTH-WISE MATRIX REPORT', MARGIN, 94, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(10).fillColor(C.sub);
    if (isPeriods) {
      doc.text(`Period 1: ${periodInfo.period1}`, MARGIN, 122, { width: cw, align: 'center', lineBreak: false });
      doc.text(`Period 2: ${periodInfo.period2}`, MARGIN, 138, { width: cw, align: 'center', lineBreak: false });
    } else {
      doc.text(`From: ${periodInfo.from}   To: ${periodInfo.to}`, MARGIN, 130, { width: cw, align: 'center', lineBreak: false });
    }
    doc.font('Helvetica').fontSize(9).fillColor(C.muted)
      .text(`Generated: ${new Date().toLocaleDateString()}${chunkNote || ''}`, MARGIN, 156, { width: cw, align: 'center', lineBreak: false });
    doc.fillColor('#000000');
    doc.y = DATA_TOP;
  }

  function drawFooter() {
    // y=540 keeps the 8pt line inside the bottom margin (avoids PDFKit auto-adding a footer-only page)
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.muted)
      .text('RMKStockMate Food Management System', MARGIN, 540, { width: usableW, align: 'center', lineBreak: false });
    doc.fillColor('#000000');
  }

  // Grouped 2-row header. labelCols: [{x,w,label}] spanning both rows.
  function drawHeaderRow(labelCols, groups, font) {
    const subTop = TABLE_TOP + ROW_H;
    labelCols.forEach(lc => {
      cellRect(lc.x, TABLE_TOP, lc.w, 2 * ROW_H, C.brand);
      drawFitted(lc.label, lc.x, TABLE_TOP, lc.w, 2 * ROW_H, { size: font, bold: true, color: C.white, align: 'center' });
    });
    groups.forEach(g => {
      cellRect(g.x, TABLE_TOP, g.w, ROW_H, g.fill);
      doc.font('Helvetica-Bold').fontSize(Math.min(9, font)).fillColor(C.white);
      doc.text(g.label, g.x + 4, TABLE_TOP + (ROW_H - Math.min(9, font)) / 2 + 1.2, { width: g.w - 8, align: 'center', lineBreak: false });
      doc.fillColor('#000000');
      cellRect(g.x, subTop, g.qw, ROW_H, C.brand);
      drawSub('Qty', g.x, subTop, g.qw, font);
      cellRect(g.x + g.qw, subTop, g.w - g.qw, ROW_H, C.brand);
      drawSub('Amount', g.x + g.qw, subTop, g.w - g.qw, font);
    });
  }

  function drawSub(str, x, y, w, font) {
    const size = Math.min(8.5, font);
    doc.font('Helvetica-Bold').fontSize(size).fillColor(C.white);
    doc.text(str, x + 3, y + (ROW_H - size) / 2 + 1.2, { width: w - 6, align: 'center', lineBreak: false });
    doc.fillColor('#000000');
  }

  if (PDF_DEBUG) {
    console.log(`[generateMonthlyMatrixComparisonPDF] type=${periodInfo.type} rows=${reportData.length} months=${months ? months.length : 0}`);
    if (reportData.length) console.log('[generateMonthlyMatrixComparisonPDF] keys:', Object.keys(reportData[0]).join(', '));
  }

  // ---------------- PERIODS MODE (8 columns) ----------------
  if (isPeriods) {
    const dataRows = reportData.map(r => ({
      item: r.item_name == null ? '' : String(r.item_name),
      category: r.item_category == null ? '' : String(r.item_category),
      values: [
        num(r.period1_quantity), num(r.period1_amount),
        num(r.period2_quantity), num(r.period2_amount),
        num(Number(r.period2_quantity || 0) - Number(r.period1_quantity || 0)),
        num(Number(r.period2_amount || 0) - Number(r.period1_amount || 0))
      ],
      p1q: Number(r.period1_quantity || 0), p1a: Number(r.period1_amount || 0),
      p2q: Number(r.period2_quantity || 0), p2a: Number(r.period2_amount || 0)
    }));

    const t = dataRows.reduce((a, r) => ({
      p1q: a.p1q + r.p1q, p1a: a.p1a + r.p1a, p2q: a.p2q + r.p2q, p2a: a.p2a + r.p2a
    }), { p1q: 0, p1a: 0, p2q: 0, p2a: 0 });
    const totalValues = [num(t.p1q), num(t.p1a), num(t.p2q), num(t.p2a), num(t.p2q - t.p1q), num(t.p2a - t.p1a)];

    if (PDF_DEBUG) {
      console.log('[generateMonthlyMatrixComparisonPDF] first two rows:',
        JSON.stringify(dataRows.slice(0, 2).map(r => [r.item, r.category, ...r.values])));
      console.log('[generateMonthlyMatrixComparisonPDF] total row:', JSON.stringify(['Total', '', ...totalValues]));
    }

    drawChrome();
    drawHeaderRow(
      [{ x: colX[0], w: colW[0], label: 'Item' }, { x: colX[1], w: colW[1], label: 'Category' }],
      groupDefs,
      9
    );
    let y = DATA_TOP;
    let rowIdx = 0;

    const nextRowY = () => {
      if (y + ROW_H > ROW_BOTTOM_LIMIT) {
        doc.addPage();
        drawChrome();
        drawHeaderRow(
          [{ x: colX[0], w: colW[0], label: 'Item' }, { x: colX[1], w: colW[1], label: 'Category' }],
          groupDefs,
          9
        );
        y = DATA_TOP;
      }
    };

    if (dataRows.length === 0) {
      cellRect(tableX, y, tableW, ROW_H, C.rowA);
      doc.font('Helvetica').fontSize(9).fillColor(C.text)
        .text('No purchase data available for selected period.', tableX + 6, y + (ROW_H - 9) / 2 + 1.2, { width: tableW - 12, align: 'center', lineBreak: false });
      doc.fillColor('#000000');
      y += ROW_H;
    }

    for (const r of dataRows) {
      nextRowY();
      const bg = rowIdx % 2 === 0 ? C.rowA : C.rowB;
      if (PDF_DEBUG && rowIdx < 2) console.log(`[generateMonthlyMatrixComparisonPDF] row ${rowIdx} y=${y.toFixed(1)} item="${r.item}"`);
      cellRect(colX[0], y, colW[0], ROW_H, bg);
      drawFitted(r.item, colX[0], y, colW[0], ROW_H);
      cellRect(colX[1], y, colW[1], ROW_H, bg);
      drawFitted(r.category, colX[1], y, colW[1], ROW_H);
      r.values.forEach((v, ci) => {
        const col = colX[ci + 2];
        cellRect(col, y, colW[ci + 2], ROW_H, bg);
        const isDiff = ci >= 4;
        drawNumber(v, col, y, colW[ci + 2], ROW_H, { color: isDiff ? (Number(v) >= 0 ? C.pos : C.neg) : C.text });
      });
      y += ROW_H;
      rowIdx++;
    }

    if (dataRows.length > 0) {
      nextRowY();
      if (PDF_DEBUG) console.log(`[generateMonthlyMatrixComparisonPDF] total row y=${y.toFixed(1)}`);
      cellRect(colX[0], y, colW[0], ROW_H, C.totalBg);
      drawFitted('Total', colX[0], y, colW[0], ROW_H, { bold: true });
      cellRect(colX[1], y, colW[1], ROW_H, C.totalBg);
      totalValues.forEach((v, ci) => {
        const col = colX[ci + 2];
        cellRect(col, y, colW[ci + 2], ROW_H, C.totalBg);
        drawNumber(v, col, y, colW[ci + 2], ROW_H, { bold: true, color: C.text });
      });
      y += ROW_H;
    }

    drawFooter();
  } else {
    // ---------------- MONTHS MODE (adaptive / chunked) ----------------
    const allMonths = months || [];
    const CHUNK = 5;
    const chunks = [];
    for (let i = 0; i < allMonths.length || i === 0; i += CHUNK) {
      chunks.push(allMonths.slice(i, i + CHUNK));
      if (allMonths.length === 0) break;
    }

    chunks.forEach((chunk, chunkIdx) => {
      const N = chunk.length;
      const font = N <= 3 ? 9 : 8;
      const labelW = isItemRows ? 140 : 170;
      const label2W = isItemRows ? 96 : 0;
      const avail = usableW - labelW - label2W;
      const numericW = N > 0 ? Math.min(90, Math.max(48, avail / (2 * N))) : 90;

      const widths = isItemRows
        ? [labelW, label2W, ...chunk.flatMap(() => [numericW * 0.45, numericW * 0.55])]
        : [labelW, ...chunk.flatMap(() => [numericW * 0.45, numericW * 0.55])];
      tableW = widths.reduce((a, b) => a + b, 0);
      tableX = MARGIN + (usableW - tableW) / 2;
      colX = []; { let acc = tableX; widths.forEach((w) => { colX.push(acc); acc += w; }); }

      const labelCols = isItemRows
        ? [{ x: colX[0], w: widths[0], label: 'Item' }, { x: colX[1], w: widths[1], label: 'Category' }]
        : [{ x: colX[0], w: widths[0], label: 'Category Name' }];

      const groups = chunk.map((m, i) => {
        const gx = colX[isItemRows ? 2 : 1] + i * numericW;
        return { x: gx, w: numericW, qw: numericW * 0.45, fill: i % 2 === 0 ? C.groupP1 : C.groupP2, label: m };
      });

      const chunkNote = chunks.length > 1 ? `   (Months ${chunkIdx * CHUNK + 1}-${chunkIdx * CHUNK + N} of ${allMonths.length})` : '';
      drawChrome(chunkNote);
      drawHeaderRow(labelCols, groups, font);

      let y = DATA_TOP;
      let rowIdx = 0;

      const nextRowY = () => {
        if (y + ROW_H > ROW_BOTTOM_LIMIT) {
          doc.addPage();
          drawChrome(chunkNote);
          drawHeaderRow(labelCols, groups, font);
          y = DATA_TOP;
        }
      };

      const labelKey = isItemRows ? 'item_name' : 'category_name';
      const label2Key = 'item_category';

      reportData.forEach(r => {
        nextRowY();
        const bg = rowIdx % 2 === 0 ? C.rowA : C.rowB;
        cellRect(colX[0], y, widths[0], ROW_H, bg);
        drawFitted(r[labelKey], colX[0], y, widths[0], ROW_H);
        if (isItemRows) {
          cellRect(colX[1], y, widths[1], ROW_H, bg);
          drawFitted(r[label2Key], colX[1], y, widths[1], ROW_H);
        }
        chunk.forEach((m, mi) => {
          const qx = colX[isItemRows ? 2 : 1] + mi * numericW;
          cellRect(qx, y, numericW * 0.45, ROW_H, bg);
          drawNumber(num(r[`${m}_quantity`]), qx, y, numericW * 0.45, ROW_H, { baseSize: font });
          cellRect(qx + numericW * 0.45, y, numericW * 0.55, ROW_H, bg);
          drawNumber(num(r[`${m}_amount`]), qx + numericW * 0.45, y, numericW * 0.55, ROW_H, { baseSize: font });
        });
        y += ROW_H;
        rowIdx++;
      });

      if (reportData.length > 0) {
        nextRowY();
        cellRect(colX[0], y, widths[0], ROW_H, C.totalBg);
        drawFitted('Total', colX[0], y, widths[0], ROW_H, { bold: true });
        if (isItemRows) {
          cellRect(colX[1], y, widths[1], ROW_H, C.totalBg);
        }
        chunk.forEach((m, mi) => {
          const totalQty = reportData.reduce((a, r) => a + Number(r[`${m}_quantity`] || 0), 0);
          const totalAmt = reportData.reduce((a, r) => a + Number(r[`${m}_amount`] || 0), 0);
          const qx = colX[isItemRows ? 2 : 1] + mi * numericW;
          cellRect(qx, y, numericW * 0.45, ROW_H, C.totalBg);
          drawNumber(num(totalQty), qx, y, numericW * 0.45, ROW_H, { bold: true, baseSize: font });
          cellRect(qx + numericW * 0.45, y, numericW * 0.55, ROW_H, C.totalBg);
          drawNumber(num(totalAmt), qx + numericW * 0.45, y, numericW * 0.55, ROW_H, { bold: true, baseSize: font });
        });
        y += ROW_H;
      }

      if (chunkIdx === chunks.length - 1) drawFooter();
      else doc.addPage();
    });
  }

  const buffer = await docToBuffer(doc);

  if (PDF_DEBUG) {
    console.log(`[generateMonthlyMatrixComparisonPDF] final page count=${pageCount} buffer=${buffer.length} bytes`);
  }

  return buffer;
}

async function generateMonthlyLedgerPDF(reportData, fromDate, toDate) {
  // A3 landscape: 19 columns need genuine width; A4 landscape would force ~34pt
  // numeric columns and clip amounts. Item gets a wide column at readable 8pt.
  const doc = createDoc(true, 'A3');

  let pageCount = 1;
  doc.on('pageAdded', () => pageCount++);

  const PAGE_W = 1190.55;   // A3 landscape
  const PAGE_H = 841.89;
  const MARGIN = 40;
  const usableW = PAGE_W - 2 * MARGIN;
  const TABLE_TOP = 188.6;
  const ROW_H = 26;
  const DATA_TOP = TABLE_TOP + 2 * ROW_H;
  const ROW_BOTTOM_LIMIT = 770; // last row bottom; footer sits at 786
  const FOOTER_Y = 786;

  const C = {
    brand: '#164863', groupA: '#1f5f86', groupB: '#2a7890',
    border: '#cbd5e1', rowA: '#ffffff', rowB: '#f8fafc', text: '#1e293b',
    sub: '#334155', muted: '#64748b', totalBg: '#e2e8f0', white: '#ffffff'
  };

  const num = (v) => Number(v || 0).toFixed(2);

  // 9 logical groups, each Qty + Amount
  const GROUPS = [
    { label: 'Opening Stock' }, { label: 'Purchase' }, { label: 'Total Available' },
    { label: 'RMKEC' }, { label: 'RMDEC' }, { label: 'RMKCET' },
    { label: 'Schools' }, { label: 'Issued Total' }, { label: 'Closing Stock' }
  ];

  const ITEM_W = 200;
  const Q_W = 46, A_W = 55;
  const tableW = ITEM_W + GROUPS.length * (Q_W + A_W); // 1109
  const TABLE_X = MARGIN + (usableW - tableW) / 2;
  // Column x-positions: Item, then each group's Qty and Amount cells
  const COL_X = [];
  {
    let acc = TABLE_X;
    COL_X.push(acc);
    acc += ITEM_W;
    GROUPS.forEach(() => {
      COL_X.push(acc); acc += Q_W;
      COL_X.push(acc); acc += A_W;
    });
  }

  function cellRect(x, y, w, h, fill) {
    doc.fillColor(fill).rect(x, y, w, h).fill();
    doc.strokeColor(C.border).lineWidth(1).rect(x, y, w, h).stroke();
  }

  function fitText(str, w, h, baseSize) {
    const s = String(str == null ? '' : str);
    if (!s) return { lines: [''], size: baseSize, h: ROW_H };
    let size = baseSize;
    doc.font('Helvetica').fontSize(size);
    if (doc.widthOfString(s) <= w && h >= ROW_H) return { lines: [s], size, h: ROW_H };
    if (size > 8) {
      size = 8;
      doc.font('Helvetica').fontSize(size);
      if (doc.widthOfString(s) <= w && h >= ROW_H) return { lines: [s], size, h: ROW_H };
    }
    if (h >= 36) {
      const words = s.split(' ');
      let l1 = '', l2 = '';
      for (const word of words) {
        if (!l1 || doc.widthOfString(l1 + ' ' + word) <= w) l1 = l1 ? l1 + ' ' + word : word;
        else l2 = l2 ? l2 + ' ' + word : word;
      }
      if (l2 && doc.widthOfString(l2) <= w) return { lines: [l1, l2], size: 8, h: 36 };
    }
    let t = s;
    doc.font('Helvetica').fontSize(size);
    while (t.length > 1 && doc.widthOfString(t + '...') > w) t = t.slice(0, -1);
    return { lines: [t + '...'], size, h: ROW_H };
  }

  function drawItemCell(str, x, y, w, h, opts = {}) {
    const { bold = false, color = C.text } = opts;
    const fit = fitText(str, w - 12, h, 9);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fit.size).fillColor(color);
    const lineH = fit.size * 1.15;
    const startY = y + (h - lineH * fit.lines.length) / 2 + 1.2;
    fit.lines.forEach((line, i) => {
      doc.text(line, x + 6, startY + i * lineH, { width: w - 12, align: 'left', lineBreak: false });
    });
    doc.fillColor('#000000');
  }

  function drawNumber(str, x, y, w, h, opts = {}) {
    const { bold = false, color = C.text, baseSize = 8 } = opts;
    const s = String(str == null ? '' : str);
    if (!s) return;
    let size = baseSize;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    while (size > 6 && doc.widthOfString(s) > w - 6) {
      size -= 0.5;
      doc.fontSize(size);
    }
    doc.fillColor(color);
    doc.text(s, x + 3, y + (h - size) / 2 + 1.2, { width: w - 6, align: 'center', lineBreak: false });
    doc.fillColor('#000000');
  }

  let pageNo = 0;
  function drawChrome() {
    pageNo++;
    const cw = usableW;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.brand)
      .text('R.M.K. GROUP OF INSTITUTIONS', MARGIN, 42, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.brand)
      .text('FOOD MANAGEMENT SYSTEM', MARGIN, 72, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.brand)
      .text('MONTHLY LEDGER REPORT', MARGIN, 94, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(10).fillColor(C.sub)
      .text(`From: ${fromDate}   To: ${toDate}`, MARGIN, 130, { width: cw, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor(C.muted)
      .text(`Generated: ${new Date().toLocaleDateString()}`, MARGIN, 156, { width: cw, align: 'center', lineBreak: false });
    doc.fillColor('#000000');

    // Grouped header: Item spans both rows; group row + Qty/Amount subheader row
    const subTop = TABLE_TOP + ROW_H;
    cellRect(COL_X[0], TABLE_TOP, ITEM_W, 2 * ROW_H, C.brand);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white);
    doc.text('Item', COL_X[0] + 3, TABLE_TOP + (2 * ROW_H - 9) / 2 + 1.2, { width: ITEM_W - 6, align: 'center', lineBreak: false });
    doc.fillColor('#000000');

    GROUPS.forEach((g, gi) => {
      const gx = COL_X[1 + gi * 2];
      const gw = Q_W + A_W;
      cellRect(gx, TABLE_TOP, gw, ROW_H, gi % 2 === 0 ? C.groupA : C.groupB);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white);
      doc.text(g.label, gx + 3, TABLE_TOP + (ROW_H - 8) / 2 + 1.2, { width: gw - 6, align: 'center', lineBreak: false });
      cellRect(gx, subTop, Q_W, ROW_H, C.brand);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white);
      doc.text('Qty', gx + 2, subTop + (ROW_H - 7.5) / 2 + 1.2, { width: Q_W - 4, align: 'center', lineBreak: false });
      cellRect(gx + Q_W, subTop, A_W, ROW_H, C.brand);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white);
      doc.text('Amount', gx + Q_W + 2, subTop + (ROW_H - 7.5) / 2 + 1.2, { width: A_W - 4, align: 'center', lineBreak: false });
    });
    doc.fillColor('#000000');

    // Page number, bottom-right, every page
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
      .text(`Page ${pageNo}`, PAGE_W - MARGIN - 80, FOOTER_Y, { width: 80, align: 'right', lineBreak: false });
    doc.fillColor('#000000');
    doc.y = DATA_TOP;
  }

  function drawFooter() {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.muted)
      .text('RMKStockMate Food Management System', MARGIN, FOOTER_Y, { width: usableW - 100, align: 'center', lineBreak: false });
    doc.fillColor('#000000');
  }

  // ---- Row data (same calculations as the website report) ----
  const dataRows = reportData.map(row => {
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
    const closingQuantity = Math.max(0, totalQuantity - issueQuantity);
    const closingAmount = Math.max(0, totalAmount - issueAmount);

    return {
      item: row.item == null ? '' : String(row.item),
      values: [
        num(openingStock), num(adjustedOpeningStock),
        num(purchaseQuantity), num(purchaseAmount),
        num(totalQuantity), num(totalAmount),
        num(rmk), num(rmk * unitPrice),
        num(rmd), num(rmd * unitPrice),
        num(rmkcet), num(rmkcet * unitPrice),
        num(school), num(school * unitPrice),
        num(issueQuantity), num(issueAmount),
        num(closingQuantity), num(closingAmount)
      ]
    };
  });

  // ---- Totals row (same math as before: amounts only, qty cells blank) ----
  const purchaseTotal = reportData.reduce((a, r) => a + Number(r.purchaseAmount || 0), 0);
  const rmkTotal = reportData.reduce((a, r) => a + (Number(r.RMK || 0) * Number(r.unitPrice || 0)), 0);
  const rmdTotal = reportData.reduce((a, r) => a + (Number(r.RMD || 0) * Number(r.unitPrice || 0)), 0);
  const rmkcetTotal = reportData.reduce((a, r) => a + (Number(r.RMKCET || 0) * Number(r.unitPrice || 0)), 0);
  const schoolTotal = reportData.reduce((a, r) => a + (Number(r.RMKSCHOOL || 0) * Number(r.unitPrice || 0)), 0);
  const issueTotalAmount = reportData.reduce((a, r) => a + ((Number(r.RMK || 0) + Number(r.RMD || 0) + Number(r.RMKCET || 0) + Number(r.RMKSCHOOL || 0)) * Number(r.unitPrice || 0)), 0);
  const openingStockAmountTotal = reportData.reduce((a, r) => a + Number(r.adjustedOpeningStock || 0), 0);
  const totalAmountTotal = reportData.reduce((a, r) => a + (Number(r.purchaseAmount || 0) + Number(r.adjustedOpeningStock || 0)), 0);
  const totalValues = [
    num(openingStockAmountTotal), '', num(purchaseTotal), '', num(totalAmountTotal),
    '', num(rmkTotal), '', num(rmdTotal), '', num(rmkcetTotal), '', num(schoolTotal),
    '', num(issueTotalAmount), '', num(totalAmountTotal - issueTotalAmount)
  ];

  if (PDF_DEBUG) {
    console.log(`[generateMonthlyLedgerPDF] rows=${dataRows.length}`);
    console.log('[generateMonthlyLedgerPDF] first two rows:',
      JSON.stringify(dataRows.slice(0, 2).map(r => [r.item, ...r.values])));
    console.log('[generateMonthlyLedgerPDF] total row:', JSON.stringify(['Total', ...totalValues]));
  }

  drawChrome();
  let y = DATA_TOP;
  let rowIdx = 0;

  const nextRowY = () => {
    if (y + ROW_H > ROW_BOTTOM_LIMIT) {
      doc.addPage();
      drawChrome();
      y = DATA_TOP;
    }
  };

  if (dataRows.length === 0) {
    cellRect(TABLE_X, y, tableW, ROW_H, C.rowA);
    doc.font('Helvetica').fontSize(9).fillColor(C.text)
      .text('No data available', TABLE_X + 6, y + (ROW_H - 9) / 2 + 1.2, { width: tableW - 12, align: 'center', lineBreak: false });
    doc.fillColor('#000000');
    y += ROW_H;
  }

  for (const r of dataRows) {
    nextRowY();
    const bg = rowIdx % 2 === 0 ? C.rowA : C.rowB;
    if (PDF_DEBUG && rowIdx < 2) console.log(`[generateMonthlyLedgerPDF] row ${rowIdx} y=${y.toFixed(1)} item="${r.item}"`);
    cellRect(COL_X[0], y, ITEM_W, ROW_H, bg);
    drawItemCell(r.item, COL_X[0], y, ITEM_W, ROW_H);
    r.values.forEach((v, ci) => {
      const col = COL_X[ci + 1];
      const w = ci % 2 === 0 ? Q_W : A_W;
      cellRect(col, y, w, ROW_H, bg);
      drawNumber(v, col, y, w, ROW_H);
    });
    y += ROW_H;
    rowIdx++;
  }

  if (dataRows.length > 0) {
    nextRowY();
    if (PDF_DEBUG) console.log(`[generateMonthlyLedgerPDF] total row y=${y.toFixed(1)}`);
    cellRect(COL_X[0], y, ITEM_W, ROW_H, C.totalBg);
    drawItemCell('Total', COL_X[0], y, ITEM_W, ROW_H, { bold: true });
    totalValues.forEach((v, ci) => {
      const col = COL_X[ci + 1];
      const w = ci % 2 === 0 ? Q_W : A_W;
      cellRect(col, y, w, ROW_H, C.totalBg);
      drawNumber(v, col, y, w, ROW_H, { bold: true });
    });
    y += ROW_H;
  }

  drawFooter();

  const buffer = await docToBuffer(doc);

  if (PDF_DEBUG) {
    console.log(`[generateMonthlyLedgerPDF] final page count=${pageCount} buffer=${buffer.length} bytes`);
  }

  return buffer;
}

async function generateCategorySummaryPDF(reportData, fromDate, toDate) {
  const doc = createDoc(true);
  
  drawHeader(doc, 'CATEGORY-WISE SUMMARY REPORT', null, { single: `${fromDate} to ${toDate}` });

  const colWidths = [180, 100, 90, 90, 90, 90, 100];
  const headers = ['Category', 'Purchase', 'RMK', 'RMD', 'RMKCET', 'School', 'Total Issued'];

  const rows = reportData.map(row => ({
    values: [
      row.category,
      fmt(row.purchase_amount),
      fmt(row.RMK_amount),
      fmt(row.RMD_amount),
      fmt(row.RMKCET_amount),
      fmt(row.RMKSCHOOL_amount),
      fmt(row.total_amount)
    ],
    align: (idx) => idx === 0 ? 'left' : 'center'
  }));

  const totals = {
    purchase: reportData.reduce((a, r) => a + Number(r.purchase_amount || 0), 0),
    rmk: reportData.reduce((a, r) => a + Number(r.RMK_amount || 0), 0),
    rmd: reportData.reduce((a, r) => a + Number(r.RMD_amount || 0), 0),
    rmkcet: reportData.reduce((a, r) => a + Number(r.RMKCET_amount || 0), 0),
    school: reportData.reduce((a, r) => a + Number(r.RMKSCHOOL_amount || 0), 0),
    total: reportData.reduce((a, r) => a + Number(r.total_amount || 0), 0)
  };

  rows.push({
    values: [
      'Total',
      fmt(totals.purchase),
      fmt(totals.rmk),
      fmt(totals.rmd),
      fmt(totals.rmkcet),
      fmt(totals.school),
      fmt(totals.total)
    ],
    bold: true,
    isTotal: true,
    align: (idx) => idx === 0 ? 'left' : 'center'
  });

  drawTable(doc, headers, rows, { colWidths, rowHeight: 30, fontSize: 10, headerFontSize: 10 });

  return await docToBuffer(doc);
}

module.exports = {
  generateCategoryComparisonPDF,
  generateMonthlyMatrixComparisonPDF,
  generateMonthlyLedgerPDF,
  generateCategorySummaryPDF,
  drawHeader,
  drawTable,
  createDoc,
  docToBuffer
};