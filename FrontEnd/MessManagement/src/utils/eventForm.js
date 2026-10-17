import dayjs from 'dayjs';

// ---------------------------------------------------------------------------
// Approved option sets (verified against the live `food` database)
// ---------------------------------------------------------------------------

// Canonical institution names. These are the names already stored in the
// existing attendance_institutions table (BackEnd/migrations/001_attendance_schema.sql)
// and used by the attendance entry form and its reports, so they are the single
// approved spelling set for the app.
//
// events.institution is free text and the legacy rows in the live database show
// exactly why this matters:
//   "RMKEC", "RMK MATRICULATION SCHOOL", "RMKEC <RMD,", "RMK PATASHALLA"
// The dropdown replaces those spelling variations with the canonical names.
export const INSTITUTIONS = [
  'RMK',
  'RMD',
  'RMK-CET',
  'RMK Residential',
  'RMK Mat. School',
  'SDPC',
  'RMK School / Thiruverkadu',
  'RMK Pathasala',
];

// Existing approved meal types and item types: values already stored in
// events.meal_details and rendered by EventDetail.jsx. Unchanged.
export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages'];
export const ITEM_TYPES = ['Veg', 'Non-Veg', 'Common'];

// Controlled unit list – must stay in sync with BackEnd/utils/eventItems.js UNITS.
export const EVENT_ITEM_UNITS = [
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

// Endpoints used by the form.
//  - /attendance/config -> { institutions: [{ id, name, categories }] }
//  - /eventItems        -> { items: [{ id, name }] }  (event item catalogue)
//
// The meal item list deliberately does NOT come from the inventory master list
// (/addItems/getItemCategory, backed by the `category` table). An event item is a
// menu ingredient recorded against an event; creating one must never create
// stock, change a balance or deduct inventory, and the two lists are different
// business entities even when names coincide.
export const INSTITUTION_ENDPOINT = '/attendance/config';
export const EVENT_ITEM_ENDPOINT = '/eventItems';

export const MAX_ITEM_NAME_LENGTH = 150;

// ---------------------------------------------------------------------------
// Row identity
// ---------------------------------------------------------------------------

let uidCounter = 0;
export const nextUid = () => `uid-${++uidCounter}`;

export const createItemRow = () => ({
  uid: nextUid(),
  // Identity of the selected event item. `name` is a display copy of the
  // catalogue record; itemId is what actually links the row to event_items.
  itemId: '',
  name: '',
  quantity: '',
  type: '',
});

export const createMealSection = () => ({
  uid: nextUid(),
  mealType: '',
  items: [createItemRow()],
});

// ---------------------------------------------------------------------------
// Date -> day derivation
// ---------------------------------------------------------------------------

// Derives the weekday name ('Tuesday') from the selected date's calendar value.
// dayjs reads the local calendar fields of a Date/dayjs value and parses a bare
// 'YYYY-MM-DD' string as local midnight, so there is no timezone off-by-one.
// Returns '' when the date is missing or invalid.
export const deriveDayFromDate = (dateValue) => {
  if (!dateValue) return '';
  const d = dayjs(dateValue);
  return d.isValid() ? d.format('dddd') : '';
};

// ---------------------------------------------------------------------------
// Number of people
// ---------------------------------------------------------------------------

// Keeps digits only, so pasted or typed garbage never reaches state. A pasted
// sign, decimal point or exponent ("-7", "12.5", "1e5") is cleared outright
// rather than silently reinterpreted as a different number.
export const sanitizePeopleInput = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/[-+eE]/.test(value)) return '';
  return value.replace(/\D+/g, '').slice(0, 7);
};

// Returns an error message, or '' when valid. Positive whole numbers only.
export const validatePeopleCount = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return 'Number of people is required.';
  if (!/^\d+$/.test(value)) return 'Enter a positive whole number (no decimals or symbols).';
  if (Number(value) < 1) return 'Number of people must be at least 1.';
  return '';
};

// ---------------------------------------------------------------------------
// Quantity
// ---------------------------------------------------------------------------

// Allows digits with at most one decimal point while typing (no rounding, no
// silent conversion of what the user entered). A pasted sign or exponent is
// cleared instead of being turned into a positive number.
export const sanitizeQuantityInput = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/[-+eE]/.test(value)) return '';
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 4)}` : whole;
};

// Returns an error message, or '' when valid. Rejects empty, zero, negative,
// NaN/Infinity, scientific notation and malformed decimals. Decimals are allowed
// because events.meal_details is a JSON column and the live data already holds
// fractional-free strings such as "700"; integers stay integers, unrounded.
export const validateQuantity = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return 'Quantity is required.';
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return 'Enter a positive number (digits only, e.g. 12 or 12.5).';
  }
  if (Number(value) <= 0) return 'Quantity must be greater than 0.';
  return '';
};

// ---------------------------------------------------------------------------
// Meal / item state operations (all return new arrays; each row keeps its uid)
// ---------------------------------------------------------------------------

export const addMeal = (sections) => [...sections, createMealSection()];

export const updateMeal = (sections, mealUid, patch) =>
  sections.map((s) => (s.uid === mealUid ? { ...s, ...patch } : s));

export const removeMeal = (sections, mealUid) => sections.filter((s) => s.uid !== mealUid);

export const addItem = (sections, mealUid) =>
  sections.map((s) => (s.uid === mealUid ? { ...s, items: [...s.items, createItemRow()] } : s));

export const updateItem = (sections, mealUid, itemUid, patch) =>
  sections.map((s) =>
    s.uid === mealUid
      ? { ...s, items: s.items.map((it) => (it.uid === itemUid ? { ...it, ...patch } : it)) }
      : s
  );

export const removeItem = (sections, mealUid, itemUid) =>
  sections.map((s) =>
    s.uid === mealUid ? { ...s, items: s.items.filter((it) => it.uid !== itemUid) } : s
  );

// ---------------------------------------------------------------------------
// API response normalisation
// ---------------------------------------------------------------------------

// Institutions come from the existing attendance config endpoint. Accepts
// { institutions: [{ id, name }] } and tolerates a plain array of names/objects.
// Falls back to the approved constant list when the payload is unusable so the
// dropdown never renders empty.
export const normalizeInstitutions = (payload) => {
  const raw = Array.isArray(payload) ? payload : payload?.institutions;
  const names = (Array.isArray(raw) ? raw : [])
    .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter(Boolean);
  return names.length ? [...new Set(names)] : [...INSTITUTIONS];
};

// Normalises the event item catalogue from GET /eventItems.
// Accepts { items: [{ id, name }] }, a bare array, or { data: [...] } so a
// server response-wrapper change cannot silently empty the selector. A row
// without a usable id is dropped: it could be displayed but never persisted,
// and offering it would only fail at submit time.
export const normalizeEventItems = (payload) => {
  const raw = Array.isArray(payload) ? payload : payload?.items ?? payload?.data;
  const seen = new Set();
  const items = [];
  (Array.isArray(raw) ? raw : []).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const id = Number(entry.id ?? entry.itemId);
    const name = normalizeItemName(entry.name ?? entry.item ?? entry.itemName);
    if (!Number.isInteger(id) || id <= 0 || !name) return;
    if (seen.has(id)) return;
    seen.add(id);
    const unit = String(entry.unit ?? '').trim().toLowerCase() || null;
    items.push({ id, name, unit });
  });
  return items.sort((a, b) => a.name.localeCompare(b.name));
};

// Set of valid catalogue ids, used to reject stale or hand-typed selections.
// Identity is the id, never the display name.
export const eventItemIdSet = (items) => new Set((items ?? []).map((item) => item.id));

// The same display-name normalization the backend applies (trim, collapse
// internal whitespace), so the UI's "already exists" decision matches the
// server's duplicate rule instead of contradicting it.
export const normalizeItemName = (raw) => String(raw ?? '').replace(/\s+/g, ' ').trim();

// Case-insensitive lookup of an equivalent catalogue item.
export const findEventItemByName = (items, name) => {
  const target = normalizeItemName(name).toLowerCase();
  if (!target) return null;
  return (items ?? []).find((item) => item.name.toLowerCase() === target) ?? null;
};

// ---------------------------------------------------------------------------
// New event item draft (inline "+ Add ..." form)
// ---------------------------------------------------------------------------

// Returns { valid, errors, name, unit } for a draft, mirroring the server rules.
export const validateEventItemDraft = ({ name, unit }) => {
  const errors = { name: '', unit: '' };
  const cleanName = normalizeItemName(name);
  const cleanUnit = String(unit ?? '').trim().toLowerCase();

  if (!cleanName) {
    errors.name = 'Item name is required.';
  } else if (cleanName.length > MAX_ITEM_NAME_LENGTH) {
    errors.name = `Item name must be ${MAX_ITEM_NAME_LENGTH} characters or fewer.`;
  }

  if (!cleanUnit) {
    errors.unit = 'Unit is required.';
  } else if (!EVENT_ITEM_UNITS.includes(cleanUnit)) {
    errors.unit = 'Please select a valid unit.';
  }

  const valid = !errors.name && !errors.unit;
  return { valid, errors, name: cleanName, unit: cleanUnit };
};

// ---------------------------------------------------------------------------
// Client-side event item search (the catalogue is loaded once, so no request is
// made per keystroke)
// ---------------------------------------------------------------------------

export const filterEventItems = (items, query, limit = 50) => {
  const list = items ?? [];
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) {
    return { matches: list.slice(0, limit), total: list.length, truncated: list.length > limit };
  }
  const scored = [];
  list.forEach((item) => {
    const name = item.name.toLowerCase();
    let score;
    if (name.startsWith(q)) score = 0;
    else if (name.split(/[^a-z0-9]+/).some((word) => word.startsWith(q))) score = 1;
    else if (name.includes(q)) score = 2;
    else return;
    scored.push({ item, score });
  });
  scored.sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name));
  const matches = scored.map((s) => s.item);
  return {
    matches: matches.slice(0, limit),
    total: matches.length,
    truncated: matches.length > limit,
  };
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// Validates the whole event and returns { valid, errors, firstInvalidRef }.
//  - allowedItemIds: optional Set of valid event_items ids. Each meal item must
//    carry an id from this set, so a stale, hand-typed or renamed selection can
//    never be submitted. Identity is the id, not the display name.
//  - allowedInstitutions: optional list of institution names to accept
//    (defaults to the approved constant list).
export const validateEventForm = (
  { eventName, institution, eventDate, noOfPeople, mealSections },
  allowedItemIds,
  allowedInstitutions = INSTITUTIONS
) => {
  const errors = {
    eventName: '',
    institution: '',
    eventDate: '',
    noOfPeople: '',
    meals: {},
  };

  if (!String(eventName ?? '').trim()) errors.eventName = 'Event name is required.';

  // Institution validation: expect array of selected institution names
  if (!Array.isArray(institution) || institution.length === 0) {
    errors.institution = 'Please select at least one institution.';
  } else {
    const invalid = institution.find(
      (inst) => !allowedInstitutions.includes(inst)
    );
    if (invalid) {
      errors.institution = `Select an institution from the list. "${invalid}" is not allowed.`;
    }
  }

  if (!eventDate) {
    errors.eventDate = 'Event date is required.';
  } else if (!dayjs(eventDate).isValid()) {
    errors.eventDate = 'Enter a valid date.';
  }

  errors.noOfPeople = validatePeopleCount(noOfPeople);

  let firstInvalidRef = null;
  const pick = (ref) => {
    if (!firstInvalidRef && ref) firstInvalidRef = ref;
  };
  if (errors.eventName) pick('eventName');
  if (errors.institution) pick('institution');
  if (errors.eventDate) pick('eventDate');
  if (errors.noOfPeople) pick('noOfPeople');

  const sections = Array.isArray(mealSections) ? mealSections : [];
  if (sections.length === 0) {
    errors.meals.general = 'Add at least one meal to this event.';
    pick('meals');
  }

  sections.forEach((section) => {
    const mealErrors = { mealType: '', items: {} };
    if (!MEAL_TYPES.includes(section.mealType)) {
      mealErrors.mealType = 'Select a meal type.';
      pick(section.uid);
    }
    const items = Array.isArray(section.items) ? section.items : [];
    if (items.length === 0) {
      mealErrors.items.general = 'Add at least one item to this meal.';
      pick(section.uid);
    }
    items.forEach((item) => {
      const itemErrors = { name: '', quantity: '', type: '' };
      const itemId = Number(item.itemId);
      if (!Number.isInteger(itemId) || itemId <= 0) {
        itemErrors.name = 'Select an event item from the list.';
      } else if (allowedItemIds && !allowedItemIds.has(itemId)) {
        itemErrors.name = 'Select an item from the event item list.';
      }
      itemErrors.quantity = validateQuantity(item.quantity);
      if (!ITEM_TYPES.includes(item.type)) {
        itemErrors.type = 'Select a type.';
      }
      if (itemErrors.name || itemErrors.quantity || itemErrors.type) {
        mealErrors.items[item.uid] = itemErrors;
        pick(section.uid);
      }
    });

    const hasItemErrors = Object.keys(mealErrors.items).some((k) => k !== 'general');
    if (mealErrors.mealType || mealErrors.items.general || hasItemErrors) {
      errors.meals[section.uid] = mealErrors;
    }
  });

  const mealErrorKeys = Object.keys(errors.meals).filter((k) => k !== 'general');
  const valid =
    !errors.eventName &&
    !errors.institution &&
    !errors.eventDate &&
    !errors.noOfPeople &&
    !errors.meals.general &&
    mealErrorKeys.length === 0;

  return { valid, errors, firstInvalidRef };
};

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

// Builds the request body in the shape the existing backend expects:
//   { event_name, institution, event_date (YYYY-MM-DD), day, no_of_people,
//     meal_details: [{ mealType, items: [{ itemId, name, quantity, type }] }] }
// The internal row `uid` is stripped and quantities/people are sent as strings,
// matching the format already stored in the events table (varchar no_of_people,
// string quantities inside the meal_details JSON). `itemId` is a new key inside
// that JSON column: the existing screens and reports read name / quantity / type
// and are unaffected, and the historical rows simply have no itemId.
export const buildEventPayload = ({ eventName, institution, eventDate, noOfPeople, mealSections }) => {
  const d = dayjs(eventDate);
  return {
    event_name: String(eventName ?? '').trim(),
    institution: Array.isArray(institution) ? institution.join(', ') : String(institution ?? '').trim(),
    event_date: d.isValid() ? d.format('YYYY-MM-DD') : null,
    day: deriveDayFromDate(eventDate),
    no_of_people: String(noOfPeople ?? '').trim(),
    meal_details: (mealSections ?? []).map((section) => ({
      mealType: section.mealType,
      items: (section.items ?? []).map((item) => ({
        // Links the meal item to its event_items record; the display name is
        // sent alongside it so the stored record stays readable on its own.
        itemId: Number(item.itemId),
        name: String(item.name ?? '').trim(),
        quantity: String(item.quantity ?? '').trim(),
        type: item.type,
      })),
    })),
  };
};
