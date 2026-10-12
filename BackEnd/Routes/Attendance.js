const express = require('express');
const db = require('../db');
const { sendEmail, generateReportFilename } = require('../utils/email');
const { generateAttendancePDF } = require('../utils/pdfGenerators');

const router = express.Router();

// Upper bound of a MySQL INT column - anything larger cannot be stored
const MAX_HEADCOUNT = 2147483647;

// ---------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------

function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isId(v) {
  return Number.isInteger(v) && v > 0;
}

function parseId(v) {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v, 10);
  return NaN;
}

// Accepts numbers or digit-only strings; anything else (negative, decimal,
// text, empty) is rejected. Missing entries are simply absent - never 0.
function parseHeadcount(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v, 10);
  return NaN;
}

function isValidHeadcount(v) {
  return Number.isInteger(v) && v >= 0 && v <= MAX_HEADCOUNT;
}

// mysql2 returns DATE columns as Date objects at LOCAL midnight, so
// toISOString() (UTC) shifts the calendar day for timezones ahead of UTC.
// Local date parts recover the stored day exactly.
function fmtDate(v) {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

// ---------------------------------------------------------------------
// Configuration (institutions + applicable categories)
// ---------------------------------------------------------------------

async function loadConfig() {
  const [rows] = await db.promise().query(`
    SELECT i.id AS institutionId, i.name AS institutionName,
           c.id AS categoryId, c.name AS categoryName
    FROM attendance_institutions i
    JOIN attendance_institution_categories ic ON ic.institution_id = i.id
    JOIN attendance_categories c ON c.id = ic.category_id
    WHERE i.is_active = 1
    ORDER BY i.id, c.id
  `);
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.institutionId)) {
      map.set(r.institutionId, { id: r.institutionId, name: r.institutionName, categories: [] });
    }
    map.get(r.institutionId).categories.push({ id: r.categoryId, name: r.categoryName });
  }
  return [...map.values()];
}

// Apply optional institution/category filters to a config copy
function filterConfig(config, institutionId, categoryId) {
  let filtered = config;
  if (isId(institutionId)) {
    filtered = filtered.filter(inst => inst.id === institutionId);
    if (filtered.length === 0) return null;
  }
  if (isId(categoryId)) {
    filtered = filtered
      .map(inst => ({ ...inst, categories: inst.categories.filter(c => c.id === categoryId) }))
      .filter(inst => inst.categories.length > 0);
    if (filtered.length === 0) return null;
  }
  return filtered;
}

// ---------------------------------------------------------------------
// Aggregation - authoritative totals are always computed here on the
// server from saved rows. headcount null = applicable entry not recorded.
// ---------------------------------------------------------------------

function buildDaily(config, records, date) {
  const recMap = new Map();
  for (const r of records) {
    recMap.set(`${r.institution_id}_${r.category_id}`, Number(r.headcount));
  }

  let complete = true;
  const institutions = config.map(inst => {
    let instComplete = true;
    let total = 0;
    const categories = inst.categories.map(cat => {
      const key = `${inst.id}_${cat.id}`;
      const entered = recMap.has(key);
      const headcount = entered ? recMap.get(key) : null;
      if (entered) {
        total += headcount;
      } else {
        instComplete = false;
      }
      return { id: cat.id, name: cat.name, headcount };
    });
    if (!instComplete) complete = false;
    return { id: inst.id, name: inst.name, categories, total, complete: instComplete };
  });

  // Combined category totals across all institutions (applicable only)
  const catOrder = [];
  const catNames = {};
  config.forEach(inst => inst.categories.forEach(cat => {
    if (catNames[cat.id] === undefined) { catNames[cat.id] = cat.name; catOrder.push(cat.id); }
  }));
  const categoryTotals = catOrder.map(id => {
    let total = 0;
    let missingCount = 0;
    config.forEach(inst => {
      const cat = inst.categories.find(c => c.id === id);
      if (!cat) return;
      const key = `${inst.id}_${id}`;
      if (recMap.has(key)) total += recMap.get(key);
      else missingCount += 1;
    });
    return { id, name: catNames[id], total, missingCount };
  });

  const grandTotal = institutions.reduce((a, i) => a + i.total, 0);
  return { date, institutions, categoryTotals, grandTotal, complete, recordedPairs: recMap.size };
}

async function fetchRecords(from, to, institutionId, categoryId) {
  let sql = `
    SELECT attendance_date, institution_id, category_id, headcount
    FROM attendance_records
    WHERE attendance_date BETWEEN ? AND ?`;
  const params = [from, to];
  if (isId(institutionId)) { sql += ' AND institution_id = ?'; params.push(institutionId); }
  if (isId(categoryId)) { sql += ' AND category_id = ?'; params.push(categoryId); }
  sql += ' ORDER BY attendance_date, institution_id, category_id';
  const [rows] = await db.promise().query(sql, params);
  return rows;
}

function buildRange(config, records, from, to) {
  const byDate = new Map();
  for (const r of records) {
    const d = fmtDate(r.attendance_date);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(r);
  }

  const institutions = config.map(inst => ({ id: inst.id, name: inst.name }));
  let prevTotal = null;
  const days = [...byDate.keys()].sort().map(date => {
    const daily = buildDaily(config, byDate.get(date), date);
    const day = {
      date,
      values: daily.institutions.map(inst => {
        // day total per institution across the (possibly filtered) categories
        return inst.categories.length === 1 ? inst.categories[0].headcount : inst.total;
      }),
      total: daily.grandTotal,
      change: prevTotal === null ? null : daily.grandTotal - prevTotal,
      complete: daily.complete
    };
    prevTotal = daily.grandTotal;
    return day;
  });

  const overall = {
    grandTotal: days.reduce((a, d) => a + d.total, 0),
    byInstitution: institutions.map((inst, idx) => ({
      id: inst.id,
      name: inst.name,
      total: days.reduce((a, d) => a + (Number.isInteger(d.values[idx]) ? d.values[idx] : 0), 0)
    })),
    daysRecorded: days.length,
    complete: days.length > 0 && days.every(d => d.complete)
  };

  return { from, to, institutions, days, overall };
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function daysInMonthOf(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function clampMonth(ym, from, to) {
  const first = `${ym}-01`;
  const last = `${ym}-${String(daysInMonthOf(ym)).padStart(2, '0')}`;
  return { start: from > first ? from : first, end: to < last ? to : last };
}

function buildMonthly(config, records, from, to) {
  const range = buildRange(config, records, from, to);
  const byMonth = new Map();
  for (const day of range.days) {
    const ym = day.date.slice(0, 7);
    if (!byMonth.has(ym)) byMonth.set(ym, []);
    byMonth.get(ym).push(day);
  }

  const months = [...byMonth.keys()].sort().map(ym => {
    const days = byMonth.get(ym);
    const bounds = clampMonth(ym, from, to);
    const start = new Date(`${bounds.start}T00:00:00Z`);
    const end = new Date(`${bounds.end}T00:00:00Z`);
    const daysExpected = Math.round((end - start) / 86400000) + 1;

    const byInstitution = (range.institutions || []).map((inst, idx) => ({
      id: inst.id,
      name: inst.name,
      total: days.reduce((a, d) => a + (Number.isInteger(d.values[idx]) ? d.values[idx] : 0), 0),
      daysRecorded: days.filter(d => Number.isInteger(d.values[idx])).length
    }));

    const byCategory = buildDaily(config, records.filter(r => fmtDate(r.attendance_date).startsWith(ym)), `${ym}-01`)
      .categoryTotals.map(c => ({ id: c.id, name: c.name, total: c.total }));

    return {
      month: ym,
      label: monthLabel(ym),
      days: days.map(d => ({ date: d.date, values: d.values, total: d.total, complete: d.complete })),
      byInstitution,
      byCategory,
      grandTotal: days.reduce((a, d) => a + d.total, 0),
      daysRecorded: days.length,
      daysExpected,
      complete: days.length === daysExpected && days.every(d => d.complete)
    };
  });

  return { from, to, institutions: range.institutions, months };
}

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------

// Institutions and applicable categories (drives the entry form & filters)
router.get('/config', async (req, res) => {
  try {
    const config = await loadConfig();
    if (config.length === 0) {
      return res.status(503).json({ message: 'Attendance is not configured. Run migrations/001_attendance_schema.sql.' });
    }
    res.status(200).json({ institutions: config });
  } catch (error) {
    console.error('Error fetching attendance config:', error);
    res.status(500).json({ message: 'Failed to fetch attendance configuration' });
  }
});

// Saved records for one date (used to restore the entry form for editing)
router.get('/date/:date', async (req, res) => {
  const { date } = req.params;
  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Invalid date. Expected YYYY-MM-DD.' });
  }
  try {
    const config = await loadConfig();
    if (config.length === 0) {
      return res.status(503).json({ message: 'Attendance is not configured. Run migrations/001_attendance_schema.sql.' });
    }
    const [rows] = await db.promise().query(
      `SELECT institution_id, category_id, headcount, updated_at
       FROM attendance_records WHERE attendance_date = ?`,
      [date]
    );
    const daily = buildDaily(config, rows, date);
    res.status(200).json({
      date,
      records: rows.map(r => ({
        institutionId: r.institution_id,
        categoryId: r.category_id,
        headcount: r.headcount,
        updatedAt: r.updated_at
      })),
      complete: daily.complete,
      expectedPairs: config.reduce((a, inst) => a + inst.categories.length, 0)
    });
  } catch (error) {
    console.error('Error fetching attendance for date:', error);
    res.status(500).json({ message: 'Failed to fetch attendance for the selected date' });
  }
});

// Save (insert or update) all entries for one date in a single transaction.
// Requires every applicable category to be present, including explicit zeros.
router.post('/save', async (req, res) => {
  const { date, entries } = req.body || {};
  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Invalid or missing date. Expected YYYY-MM-DD.' });
  }
  if (!Array.isArray(entries)) {
    return res.status(400).json({ message: 'entries must be an array' });
  }

  try {
    const config = await loadConfig();
    if (config.length === 0) {
      return res.status(503).json({ message: 'Attendance is not configured. Run migrations/001_attendance_schema.sql.' });
    }

    const applicable = new Map();
    config.forEach(inst => applicable.set(inst.id, new Set(inst.categories.map(c => c.id))));

    const entryMap = new Map();
    for (const e of entries) {
      const instId = parseId(e?.institutionId);
      const catId = parseId(e?.categoryId);
      const headcount = parseHeadcount(e?.headcount);
      if (!isId(instId) || !isId(catId)) {
        return res.status(400).json({ message: 'Each entry needs valid institutionId and categoryId' });
      }
      if (!applicable.get(instId)?.has(catId)) {
        return res.status(400).json({ message: `Category ${catId} does not apply to institution ${instId}` });
      }
      if (!isValidHeadcount(headcount)) {
        return res.status(400).json({
          message: `Headcount for institution ${instId}, category ${catId} must be a non-negative whole number (0 to ${MAX_HEADCOUNT})`,
          received: e?.headcount
        });
      }
      const key = `${instId}_${catId}`;
      if (entryMap.has(key)) {
        return res.status(400).json({ message: `Duplicate entry for institution ${instId}, category ${catId}` });
      }
      entryMap.set(key, headcount);
    }

    // A complete daily record needs every applicable category entered
    const missing = [];
    config.forEach(inst => inst.categories.forEach(cat => {
      if (!entryMap.has(`${inst.id}_${cat.id}`)) missing.push(`${inst.name} - ${cat.name}`);
    }));
    if (missing.length > 0) {
      return res.status(400).json({
        message: 'Attendance is incomplete. Enter all applicable counts (use 0 where a count is zero).',
        missing
      });
    }

    const values = config.flatMap(inst =>
      inst.categories.map(cat => [date, inst.id, cat.id, entryMap.get(`${inst.id}_${cat.id}`)])
    );

    // db.js exports a single shared mysql2 connection (not a pool), so the
    // transaction runs directly on db.promise() - getConnection() does not
    // exist on a plain connection. Saves are serialized on this connection,
    // which is acceptable for this application's usage pattern.
    const conn = db.promise();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO attendance_records (attendance_date, institution_id, category_id, headcount)
         VALUES ?
         ON DUPLICATE KEY UPDATE headcount = VALUES(headcount)`,
        [values]
      );
      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    }

    // Authoritative totals computed server-side from the saved values
    const records = values.map(([d, institutionId, categoryId, headcount]) => ({
      attendance_date: d, institution_id: institutionId, category_id: categoryId, headcount
    }));
    const daily = buildDaily(config, records, date);

    res.status(200).json({
      message: `Attendance saved for ${date}`,
      date,
      totals: {
        institutions: daily.institutions.map(i => ({ id: i.id, name: i.name, total: i.total })),
        categoryTotals: daily.categoryTotals,
        grandTotal: daily.grandTotal,
        complete: daily.complete
      }
    });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ message: 'Failed to save attendance. No partial records were kept.' });
  }
});

// Daily summary - authoritative totals for one date
router.get('/report/daily', async (req, res) => {
  const { date } = req.query;
  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Invalid or missing date. Expected YYYY-MM-DD.' });
  }
  try {
    const config = await loadConfig();
    if (config.length === 0) {
      return res.status(503).json({ message: 'Attendance is not configured. Run migrations/001_attendance_schema.sql.' });
    }
    const [rows] = await db.promise().query(
      'SELECT institution_id, category_id, headcount FROM attendance_records WHERE attendance_date = ?',
      [date]
    );
    res.status(200).json(buildDaily(config, rows, date));
  } catch (error) {
    console.error('Error building daily attendance report:', error);
    res.status(500).json({ message: 'Failed to build daily attendance report' });
  }
});

// Date-range report with optional institution/category filters
router.get('/report/range', async (req, res) => {
  const { from, to, institutionId, categoryId } = req.query;
  if (!isValidDateString(from) || !isValidDateString(to)) {
    return res.status(400).json({ message: 'Invalid or missing from/to. Expected YYYY-MM-DD.' });
  }
  if (from > to) {
    return res.status(400).json({ message: 'from must be on or before to' });
  }
  const instFilter = institutionId === undefined || institutionId === '' ? undefined : parseId(institutionId);
  const catFilter = categoryId === undefined || categoryId === '' ? undefined : parseId(categoryId);
  if (institutionId !== undefined && institutionId !== '' && !isId(instFilter)) {
    return res.status(400).json({ message: 'Invalid institutionId' });
  }
  if (categoryId !== undefined && categoryId !== '' && !isId(catFilter)) {
    return res.status(400).json({ message: 'Invalid categoryId' });
  }

  try {
    const config = await loadConfig();
    if (config.length === 0) {
      return res.status(503).json({ message: 'Attendance is not configured. Run migrations/001_attendance_schema.sql.' });
    }
    const filtered = filterConfig(config, instFilter, catFilter);
    if (!filtered) {
      return res.status(200).json({
        from, to,
        filters: { institutionId: instFilter || null, categoryId: catFilter || null },
        institutions: [], days: [],
        overall: { grandTotal: 0, byInstitution: [], daysRecorded: 0, complete: true }
      });
    }
    const records = await fetchRecords(from, to, instFilter, catFilter);
    const result = buildRange(filtered, records, from, to);
    result.filters = { institutionId: instFilter || null, categoryId: catFilter || null };
    res.status(200).json(result);
  } catch (error) {
    console.error('Error building range attendance report:', error);
    res.status(500).json({ message: 'Failed to build date-range attendance report' });
  }
});

// Monthly summary over a date range
router.get('/report/monthly', async (req, res) => {
  const { from, to, institutionId, categoryId } = req.query;
  if (!isValidDateString(from) || !isValidDateString(to)) {
    return res.status(400).json({ message: 'Invalid or missing from/to. Expected YYYY-MM-DD.' });
  }
  if (from > to) {
    return res.status(400).json({ message: 'from must be on or before to' });
  }
  const instFilter = institutionId === undefined || institutionId === '' ? undefined : parseId(institutionId);
  const catFilter = categoryId === undefined || categoryId === '' ? undefined : parseId(categoryId);
  if (institutionId !== undefined && institutionId !== '' && !isId(instFilter)) {
    return res.status(400).json({ message: 'Invalid institutionId' });
  }
  if (categoryId !== undefined && categoryId !== '' && !isId(catFilter)) {
    return res.status(400).json({ message: 'Invalid categoryId' });
  }

  try {
    const config = await loadConfig();
    if (config.length === 0) {
      return res.status(503).json({ message: 'Attendance is not configured. Run migrations/001_attendance_schema.sql.' });
    }
    const filtered = filterConfig(config, instFilter, catFilter);
    if (!filtered) {
      return res.status(200).json({
        from, to, institutions: [], months: [],
        filters: { institutionId: instFilter || null, categoryId: catFilter || null }
      });
    }
    const records = await fetchRecords(from, to, instFilter, catFilter);
    const result = buildMonthly(filtered, records, from, to);
    result.filters = { institutionId: instFilter || null, categoryId: catFilter || null };
    res.status(200).json(result);
  } catch (error) {
    console.error('Error building monthly attendance report:', error);
    res.status(500).json({ message: 'Failed to build monthly attendance report' });
  }
});

// Email the report as a PDF built from the same aggregation as the
// on-screen/printed reports (PDF attachment only, never Excel).
router.post('/send-report', async (req, res) => {
  const { recipientEmail, subject, message, reportType, date, from, to, institutionId, categoryId } = req.body || {};
  const type = reportType || 'daily';

  if (!recipientEmail) {
    return res.status(400).json({ message: 'Recipient email is required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (!['daily', 'range', 'monthly'].includes(type)) {
    return res.status(400).json({ message: 'reportType must be daily, range or monthly' });
  }
  if (type === 'daily' && !isValidDateString(date)) {
    return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) is required for the daily report' });
  }
  if (type !== 'daily') {
    if (!isValidDateString(from) || !isValidDateString(to)) {
      return res.status(400).json({ message: 'Valid from/to (YYYY-MM-DD) are required' });
    }
    if (from > to) {
      return res.status(400).json({ message: 'from must be on or before to' });
    }
  }
  const instFilter = institutionId === undefined || institutionId === '' || institutionId === null ? undefined : parseId(institutionId);
  const catFilter = categoryId === undefined || categoryId === '' || categoryId === null ? undefined : parseId(categoryId);
  if (institutionId !== undefined && institutionId !== '' && institutionId !== null && !isId(instFilter)) {
    return res.status(400).json({ message: 'Invalid institutionId' });
  }
  if (categoryId !== undefined && categoryId !== '' && categoryId !== null && !isId(catFilter)) {
    return res.status(400).json({ message: 'Invalid categoryId' });
  }

  try {
    const config = await loadConfig();
    if (config.length === 0) {
      return res.status(503).json({ message: 'Attendance is not configured. Run migrations/001_attendance_schema.sql.' });
    }
    const filtered = filterConfig(config, instFilter, catFilter);

    const instName = isId(instFilter) ? (config.find(i => i.id === instFilter)?.name || `Institution ${instFilter}`) : undefined;
    const catName = isId(catFilter) ? (config.flatMap(i => i.categories).find(c => c.id === catFilter)?.name || `Category ${catFilter}`) : undefined;

    let reportData;
    if (type === 'daily') {
      const [rows] = await db.promise().query(
        'SELECT institution_id, category_id, headcount FROM attendance_records WHERE attendance_date = ?',
        [date]
      );
      reportData = buildDaily(filtered || [], rows, date);
    } else {
      const records = await fetchRecords(from, to, instFilter, catFilter);
      reportData = type === 'range'
        ? buildRange(filtered || [], records, from, to)
        : buildMonthly(filtered || [], records, from, to);
    }

    const info = {
      reportType: type,
      date,
      from,
      to,
      institutionName: instName,
      categoryName: catName
    };
    const pdfBuffer = await generateAttendancePDF(reportData, info);

    const rangeStr = type === 'daily' ? date : `${from}_to_${to}`;
    const filename = generateReportFilename('Attendance Report', rangeStr);

    await sendEmail({
      to: recipientEmail,
      subject: subject || 'RMKStockMate - Attendance Report',
      text: message || 'Please find attached the Attendance Report.',
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    res.status(200).json({ message: `Report sent successfully to ${recipientEmail}`, filename });
  } catch (error) {
    console.error('Error sending attendance report:', error);
    const smtpCodes = ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNCLOSED'];
    if (error && smtpCodes.includes(error.code)) {
      return res.status(502).json({ message: 'Email delivery failed. Check SMTP configuration and try again.' });
    }
    res.status(500).json({ message: 'Failed to generate or send the attendance report' });
  }
});

module.exports = router;
