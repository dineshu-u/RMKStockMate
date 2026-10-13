// Server-side validation for POST /event/addevent.
//
// Why this exists: the events.institution / no_of_people columns are free text
// and the live table already contains rows such as institution "RMKEC <RMD,",
// no_of_people "1000 people" and a hand-typed day, because the endpoint accepted
// anything. This module rejects malformed payloads with a 400 instead of storing
// them, without changing the request or response contract for valid payloads.
//
// Kept dependency-free and framework-free so it can be reasoned about (and
// tested) on its own.

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages'];
const ITEM_TYPES = ['Veg', 'Non-Veg', 'Common'];

const MAX_NAME_LENGTH = 255;
const MAX_INSTITUTION_LENGTH = 255;
const MAX_PEOPLE_LENGTH = 7;

// True for a real calendar date in YYYY-MM-DD form (rejects 2026-02-30).
const isValidDateString = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Day label for a YYYY-MM-DD date, computed in UTC so no timezone can shift it.
const weekdayFromDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
};

const isPositiveNumberString = (value) => {
  const raw = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) return false;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0;
};

// Returns { valid: true, day } or { valid: false, message }.
// `day` is the day to store: the submitted label when present, otherwise derived
// from event_date (the column is nullable and always derivable from the date).
const validateEventPayload = (body) => {
  const payload = body && typeof body === 'object' ? body : {};
  const { event_name, institution, event_date, meal_details, day, no_of_people } = payload;

  const eventName = String(event_name ?? '').trim();
  if (!eventName) return { valid: false, message: 'event_name is required.' };
  if (eventName.length > MAX_NAME_LENGTH) {
    return { valid: false, message: `event_name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const institutionName = String(institution ?? '').trim();
  if (!institutionName) return { valid: false, message: 'institution is required.' };
  if (institutionName.length > MAX_INSTITUTION_LENGTH) {
    return {
      valid: false,
      message: `institution must be ${MAX_INSTITUTION_LENGTH} characters or fewer.`,
    };
  }

  if (!isValidDateString(event_date)) {
    return { valid: false, message: 'event_date is required and must be a valid YYYY-MM-DD date.' };
  }

  const people = String(no_of_people ?? '').trim();
  if (!people) return { valid: false, message: 'no_of_people is required.' };
  if (!/^\d+$/.test(people) || people.length > MAX_PEOPLE_LENGTH) {
    return { valid: false, message: 'no_of_people must be a positive whole number.' };
  }
  if (Number(people) < 1) {
    return { valid: false, message: 'no_of_people must be at least 1.' };
  }

  if (!Array.isArray(meal_details) || meal_details.length === 0) {
    return { valid: false, message: 'meal_details must contain at least one meal.' };
  }

  for (let i = 0; i < meal_details.length; i += 1) {
    const meal = meal_details[i];
    const label = `meal_details[${i}]`;
    if (!meal || typeof meal !== 'object') {
      return { valid: false, message: `${label} must be an object.` };
    }
    if (!MEAL_TYPES.includes(meal.mealType)) {
      return {
        valid: false,
        message: `${label}.mealType must be one of: ${MEAL_TYPES.join(', ')}.`,
      };
    }
    if (!Array.isArray(meal.items) || meal.items.length === 0) {
      return { valid: false, message: `${label}.items must contain at least one item.` };
    }
    for (let j = 0; j < meal.items.length; j += 1) {
      const item = meal.items[j];
      const itemLabel = `${label}.items[${j}]`;
      if (!item || typeof item !== 'object') {
        return { valid: false, message: `${itemLabel} must be an object.` };
      }
      if (!String(item.name ?? '').trim()) {
        return { valid: false, message: `${itemLabel}.name is required.` };
      }
      if (!isPositiveNumberString(item.quantity)) {
        return {
          valid: false,
          message: `${itemLabel}.quantity must be a positive number.`,
        };
      }
      if (!ITEM_TYPES.includes(item.type)) {
        return {
          valid: false,
          message: `${itemLabel}.type must be one of: ${ITEM_TYPES.join(', ')}.`,
        };
      }
    }
  }

  const submittedDay = String(day ?? '').trim();
  return { valid: true, day: submittedDay || weekdayFromDate(event_date) };
};

module.exports = { validateEventPayload, MEAL_TYPES, ITEM_TYPES, weekdayFromDate };
