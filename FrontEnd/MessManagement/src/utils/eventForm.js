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
  'RMK H/School',
  'RMK Mat. School',
  'SDPC',
  'RMK School / Thiruverkadu',
  'RMK Pathasala',
];

// Existing approved meal types and item types: values already stored in
// events.meal_details and rendered by EventDetail.jsx. Unchanged.
export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages'];
export const ITEM_TYPES = ['Veg', 'Non-Veg', 'Common'];

// Existing endpoints reused by the form (no new APIs were introduced).
//  - /attendance/config        -> { institutions: [{ id, name, categories }] }
//  - /addItems/getItemCategory -> [{ item, category }]   (master stock item list)
export const INSTITUTION_ENDPOINT = '/attendance/config';
export const ITEM_ENDPOINT = '/addItems/getItemCategory';

// ---------------------------------------------------------------------------
// Row identity
// ---------------------------------------------------------------------------

let uidCounter = 0;
export const nextUid = () => `uid-${++uidCounter}`;

export const createItemRow = () => ({
  uid: nextUid(),
  name: '',
  quantity: '',
  type: '',
  category: '',
  unit: '',
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

// Normalises the stock item list from the existing item endpoints.
// Handles [{ item, category }], { success, data: [{ itemName, quantity, category }] }
// and [{ item }]. Items are identified by their name because that is the identity
// used by every stock table (category.item, current.item, purchase.item) and by
// the events payload itself. A unit is only carried through if the stock record
// actually exposes one (none of the current stock tables do).
export const normalizeStockItems = (payload) => {
  const raw = Array.isArray(payload) ? payload : payload?.data;
  const seen = new Set();
  const items = [];
  (Array.isArray(raw) ? raw : []).forEach((entry) => {
    if (!entry) return;
    const name = String(typeof entry === 'string' ? entry : entry.item ?? entry.itemName ?? '').trim();
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    items.push({
      name,
      category: String(entry.category ?? '').trim(),
      unit: String(entry.unit ?? entry.units ?? entry.uom ?? '').trim(),
    });
  });
  return items.sort((a, b) => a.name.localeCompare(b.name));
};

// Set of valid item names, used to reject stale or hand-typed item names.
export const itemNameSet = (items) => new Set((items ?? []).map((i) => i.name));

// ---------------------------------------------------------------------------
// Client-side item search (the app already filters the same list client-side,
// so no extra request is made per keystroke)
// ---------------------------------------------------------------------------

export const filterStockItems = (items, query, limit = 50) => {
  const list = items ?? [];
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) {
    return { matches: list.slice(0, limit), total: list.length, truncated: list.length > limit };
  }
  const scored = [];
  list.forEach((item) => {
    const name = item.name.toLowerCase();
    const category = (item.category || '').toLowerCase();
    let score;
    if (name.startsWith(q)) score = 0;
    else if (name.split(/[^a-z0-9]+/).some((word) => word.startsWith(q))) score = 1;
    else if (name.includes(q)) score = 2;
    else if (category.includes(q)) score = 3;
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
//  - itemNames: optional Set of valid stock item names; when supplied, every item
//    name must belong to it (blocks stale or hand-typed items).
//  - allowedInstitutions: optional list of institution names to accept
//    (defaults to the approved constant list).
export const validateEventForm = (
  { eventName, institution, eventDate, noOfPeople, mealSections },
  itemNames,
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

  if (!institution) {
    errors.institution = 'Please select an institution.';
  } else if (!allowedInstitutions.includes(institution)) {
    errors.institution = 'Select an institution from the list.';
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
      const name = String(item.name ?? '').trim();
      if (!name) {
        itemErrors.name = 'Select a stock item.';
      } else if (itemNames && !itemNames.has(name)) {
        itemErrors.name = 'Select an item from the stock list.';
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

// Builds the request body in the EXACT shape the existing backend expects:
//   { event_name, institution, event_date (YYYY-MM-DD), day, no_of_people,
//     meal_details: [{ mealType, items: [{ name, quantity, type }] }] }
// Internal uid/category/unit keys are stripped and quantities/people are sent as
// strings, matching the format already stored in the events table (varchar
// no_of_people, string quantities inside the meal_details JSON).
export const buildEventPayload = ({ eventName, institution, eventDate, noOfPeople, mealSections }) => {
  const d = dayjs(eventDate);
  return {
    event_name: String(eventName ?? '').trim(),
    institution,
    event_date: d.isValid() ? d.format('YYYY-MM-DD') : null,
    day: deriveDayFromDate(eventDate),
    no_of_people: String(noOfPeople ?? '').trim(),
    meal_details: (mealSections ?? []).map((section) => ({
      mealType: section.mealType,
      items: (section.items ?? []).map((item) => ({
        name: String(item.name ?? '').trim(),
        quantity: String(item.quantity ?? '').trim(),
        type: item.type,
      })),
    })),
  };
};
