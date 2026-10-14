// Server-side validation for the event item catalogue (POST /eventItems).
//
// Why this exists: event items are a small, curated catalogue of menu
// ingredients. A malformed create request would otherwise end up in the
// database (the inventory routes in this project accept anything) and every
// later event would inherit the mistake. This module is dependency-free so it
// can be reasoned about and tested on its own, mirroring utils/eventValidation.js.
//
// It deliberately knows nothing about the inventory tables: event items are a
// separate entity and creating one must never touch stock.

// Controlled unit list. The project has no pre-existing unit vocabulary (the
// inventory master `category` stores no unit at all, and the historical event
// rows embed units loosely inside the quantity text), so the list is explicit
// here and enforced on both ends rather than guessed per item.
const UNITS = [
  'kg',
  'g',
  'quintal',
  'l',
  'ml',
  'nos',
  'piece',
  'dozen',
  'packet',
  'box',
  'tin',
  'bottle',
  'can',
  'sachet',
  'bunch',
  'bundle',
  'plate',
  'cup',
];

const MAX_NAME_LENGTH = 150; // event_items.name VARCHAR(150)
const MAX_UNIT_LENGTH = 50; // event_items.unit VARCHAR(50)

// Display-name normalization used for duplicate detection and storage:
// surrounding whitespace is removed and internal whitespace runs collapse to a
// single space, so ' tomato ', 'Tomato' and 'TOMATE' style variations cannot
// become separate catalogue rows.
const normalizeItemName = (raw) => String(raw ?? '').replace(/\s+/g, ' ').trim();

const normalizeUnit = (raw) => String(raw ?? '').trim().toLowerCase();

// Returns { valid: true, name, unit } or { valid: false, message }.
const validateEventItemInput = (body) => {
  const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  const name = normalizeItemName(payload.name);
  if (!name) {
    return { valid: false, message: 'name is required.' };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, message: `name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const unit = normalizeUnit(payload.unit);
  if (!unit) {
    return { valid: false, message: 'unit is required.' };
  }
  if (unit.length > MAX_UNIT_LENGTH) {
    return { valid: false, message: `unit must be ${MAX_UNIT_LENGTH} characters or fewer.` };
  }
  if (!UNITS.includes(unit)) {
    return { valid: false, message: `unit must be one of: ${UNITS.join(', ')}.` };
  }

  return { valid: true, name, unit };
};

module.exports = {
  UNITS,
  MAX_NAME_LENGTH,
  MAX_UNIT_LENGTH,
  normalizeItemName,
  normalizeUnit,
  validateEventItemInput,
};
