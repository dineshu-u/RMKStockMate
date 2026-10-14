import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// ---------- Parsing (Vendor List status) ----------
//
// Existing vendor records store validity as free text, e.g.:
//   2021-12-10 to 2026-07-18      (ISO)
//   19-12-2025 to 25-12-2026      (day-first, dashes)
//   19.12.2025 to 26.12.2026      (day-first, dots)
//   2025/02/22 TO 2030/02/27      (year-first, slashes, uppercase TO)
// The END date is the license expiry. Parsing must never throw; when the value
// is empty or unparseable we return null and the UI shows a neutral state.

// A token starting with a 4-digit year is year-first; everything else is
// treated day-first (matches every format observed in the data).
const parseDateToken = (token) => {
  const t = String(token ?? '').trim();
  if (!t) return null;
  const formats = /^\d{4}/.test(t)
    ? ['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY-M-D', 'YYYY/M/D']
    : ['DD-MM-YYYY', 'DD.MM.YYYY', 'DD/MM/YYYY', 'D-M-YYYY', 'D.M.YYYY', 'D/M/YYYY'];
  for (const fmt of formats) {
    const d = dayjs(t, fmt, true); // strict: rejects impossible dates like 2026-02-30
    if (d.isValid()) return d;
  }
  return null;
};

// Returns the parsed expiry (end) date, or null when unparseable.
export const parseValidityExpiry = (validity) => {
  if (validity == null) return null;
  const parts = String(validity).trim().split(/\s+to\s+/i);
  if (parts.length < 2) return null;
  return parseDateToken(parts[parts.length - 1]);
};

// ---------- License status (date-only, timezone-safe) ----------

// Status rules:
//   diff < 0        -> Expired (red)
//   0 .. 3 days     -> Expiring Soon (amber)  [today and the next 3 days]
//   more than 3     -> Valid (green)
//   unparseable     -> Invalid Date (gray)
export const getLicenseStatus = (validity, today = dayjs()) => {
  const expiry = parseValidityExpiry(validity);
  if (!expiry) return { tone: 'gray', label: 'Invalid Date', note: '' };

  const diff = expiry.startOf('day').diff(dayjs(today).startOf('day'), 'day');

  if (diff < 0) {
    return {
      tone: 'red',
      label: 'Expired',
      note: diff === -1 ? 'Expired yesterday' : `Expired ${Math.abs(diff)} days ago`,
    };
  }
  if (diff <= 3) {
    return {
      tone: 'amber',
      label: 'Expiring Soon',
      note: diff === 0 ? 'Expires today' : diff === 1 ? 'Expires tomorrow' : `Expires in ${diff} days`,
    };
  }
  return { tone: 'green', label: 'Valid', note: '' };
};

// ---------- Add/Edit Vendor input mask ----------
// Types digits only; hyphens and the exact " to " separator are inserted
// automatically: 2026100620271006 -> 2026-10-06 to 2027-10-06

const maskDate8 = (digits) => {
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

export const maskValidityInput = (raw) => {
  const digits = String(raw ?? '').replace(/\D+/g, '').slice(0, 16);
  const first = maskDate8(digits.slice(0, 8));
  if (digits.length <= 8) return first;
  return `${first} to ${maskDate8(digits.slice(8, 16))}`;
};

// ---------- Add/Edit Vendor strict validation ----------

export const VALIDITY_FORMAT_MESSAGE = 'Enter dates in YYYY-MM-DD to YYYY-MM-DD format.';

// Accepts ONLY the exact "YYYY-MM-DD to YYYY-MM-DD" shape (separator must be
// exactly " to "), with real calendar dates and end >= start.
// Returns '' when valid, otherwise a short error message.
export const validateValidityRange = (value) => {
  const v = String(value ?? '').trim();
  if (!v) return VALIDITY_FORMAT_MESSAGE;

  const match = v.match(/^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/);
  if (!match) return VALIDITY_FORMAT_MESSAGE;

  const start = dayjs(match[1], 'YYYY-MM-DD', true);
  if (!start.isValid()) return 'Invalid start date.';

  const end = dayjs(match[2], 'YYYY-MM-DD', true);
  if (!end.isValid()) return 'Invalid end date.';

  if (end.isBefore(start, 'day')) return 'End date cannot be earlier than start date.';
  return '';
};
