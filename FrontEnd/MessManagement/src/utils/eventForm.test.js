import { describe, it, expect } from 'vitest';
import * as mod from './eventForm';
import {
  INSTITUTIONS,
  MAX_ITEM_NAME_LENGTH,
  INSTITUTION_ENDPOINT,
  EVENT_ITEM_ENDPOINT,
  createItemRow,
  createMealSection,
  addMeal,
  updateMeal,
  removeMeal,
  addItem,
  updateItem,
  removeItem,
  deriveDayFromDate,
  sanitizePeopleInput,
  sanitizeQuantityInput,
  validateQuantity,
  normalizeInstitutions,
  normalizeEventItems,
  eventItemIdSet,
  normalizeItemName,
  findEventItemByName,
  validateEventItemDraft,
  filterEventItems,
  validateEventForm,
  buildEventPayload,
} from './eventForm';

// --- helpers ---------------------------------------------------------------

const catalogue = [
  { id: 7, name: 'Chicken Biriyani' },
  { id: 9, name: 'Tomato' },
  { id: 12, name: 'Curd' },
];

const makeState = (overrides = {}) => ({
  eventName: 'Graduation Day',
  institution: 'RMK',
  eventDate: '2026-10-13',
  noOfPeople: '250',
  mealSections: [
    {
      uid: 'meal-1',
      mealType: 'Lunch',
      items: [
        { uid: 'row-1', itemId: 7, name: 'Chicken Biriyani', quantity: '120', type: 'Non-Veg' },
      ],
    },
  ],
  ...overrides,
});

const validIds = () => eventItemIdSet(catalogue);

// --- endpoints -------------------------------------------------------------

describe('endpoints', () => {
  it('points the meal item selector at the event item catalogue, not the inventory master', () => {
    expect(EVENT_ITEM_ENDPOINT).toBe('/eventItems');
    expect(INSTITUTION_ENDPOINT).toBe('/attendance/config');

    // The inventory-backed item endpoint must no longer be part of this module.
    expect(mod.ITEM_ENDPOINT).toBeUndefined();
    expect(mod.normalizeStockItems).toBeUndefined();
    expect(mod.itemNameSet).toBeUndefined();
    expect(mod.filterStockItems).toBeUndefined();
  });
});

// --- normalisation of the event item catalogue -----------------------------

describe('normalizeEventItems', () => {
  it('reads the { items: [...] } response wrapper', () => {
    // Ids in catalogue-name order: Chicken Biriyani, Curd, Tomato.
    expect(normalizeEventItems({ items: catalogue }).map((item) => item.id)).toEqual([7, 12, 9]);
    expect(normalizeEventItems({ items: catalogue })).toHaveLength(3);
  });

  it('reads a bare array and a { data: [...] } wrapper', () => {
    expect(normalizeEventItems(catalogue)).toHaveLength(3);
    expect(normalizeEventItems({ data: catalogue })).toHaveLength(3);
  });

  it('returns an empty list for an empty catalogue (not an error)', () => {
    expect(normalizeEventItems({ items: [] })).toEqual([]);
    expect(normalizeEventItems(undefined)).toEqual([]);
    expect(normalizeEventItems({ items: null })).toEqual([]);
  });

  it('trims names and coerces the id to a number', () => {
    const [item] = normalizeEventItems({
      items: [{ id: '4', name: '  Tomato  ' }],
    });
    expect(item).toEqual({ id: 4, name: 'Tomato' });
  });

  it('drops rows that have no usable id, so nothing unpersistable is selectable', () => {
    const items = normalizeEventItems({
      items: [
        { name: 'No id' },
        { id: 0, name: 'Zero id' },
        { id: 'abc', name: 'Bad id' },
        { id: 3, name: '' },
        { id: 5, name: 'Valid' },
      ],
    });
    expect(items).toEqual([{ id: 5, name: 'Valid' }]);
  });

  it('de-duplicates by id and sorts by name', () => {
    const items = normalizeEventItems({
      items: [
        { id: 2, name: 'Zebra' },
        { id: 2, name: 'Zebra' },
        { id: 1, name: 'apple' },
      ],
    });
    expect(items).toEqual([
      { id: 1, name: 'apple' },
      { id: 2, name: 'Zebra' },
    ]);
  });
});

describe('eventItemIdSet', () => {
  it('collects the catalogue ids for validation', () => {
    const ids = validIds();
    expect(ids.has(7)).toBe(true);
    expect(ids.has(9)).toBe(true);
    expect(ids.has(999)).toBe(false);
    expect(eventItemIdSet(undefined).size).toBe(0);
  });
});

// --- name normalisation and duplicate detection ----------------------------

describe('normalizeItemName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeItemName('  tomato  ')).toBe('tomato');
    expect(normalizeItemName('Red   Chilli')).toBe('Red Chilli');
    expect(normalizeItemName(undefined)).toBe('');
  });
});

describe('findEventItemByName', () => {
  it('matches ignoring case and surrounding whitespace', () => {
    expect(findEventItemByName(catalogue, '  tomato ')?.id).toBe(9);
    expect(findEventItemByName(catalogue, 'TOMATO')?.id).toBe(9);
    expect(findEventItemByName(catalogue, 'CURD')?.id).toBe(12);
  });

  it('returns null when there is no equivalent', () => {
    expect(findEventItemByName(catalogue, 'Potato')).toBeNull();
    expect(findEventItemByName(catalogue, '   ')).toBeNull();
  });
});

// --- draft validation for the inline add-item form -------------------------

describe('validateEventItemDraft', () => {
  it('accepts a valid draft and normalizes the name', () => {
    const result = validateEventItemDraft({ name: '  Tomato ' });
    expect(result.valid).toBe(true);
    expect(result.name).toBe('Tomato');
    expect(result.errors).toEqual({ name: '' });
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(validateEventItemDraft({ name: '' }).errors.name).toBe(
      'Item name is required.'
    );
    expect(validateEventItemDraft({ name: '   ' }).valid).toBe(false);
  });

  it('rejects an over-long name', () => {
    const draft = validateEventItemDraft({ name: 'x'.repeat(MAX_ITEM_NAME_LENGTH + 1) });
    expect(draft.valid).toBe(false);
    expect(draft.errors.name).toContain(String(MAX_ITEM_NAME_LENGTH));
  });
});

// --- search ----------------------------------------------------------------

describe('filterEventItems', () => {
  it('returns the whole catalogue for an empty query', () => {
    const result = filterEventItems(catalogue, '');
    expect(result.matches).toHaveLength(3);
    expect(result.truncated).toBe(false);
  });

  it('ranks prefix matches above contains matches', () => {
    const items = [
      { id: 1, name: 'Big Tomato' },
      { id: 2, name: 'Tomato' },
    ];
    expect(filterEventItems(items, 'tom').matches.map((i) => i.id)).toEqual([2, 1]);
  });

  it('reports truncation when the limit is exceeded', () => {
    const many = Array.from({ length: 60 }, (_, index) => ({
      id: index + 1,
      name: `Item ${index + 1}`,
    }));
    const result = filterEventItems(many, 'item', 50);
    expect(result.total).toBe(60);
    expect(result.truncated).toBe(true);
    expect(result.matches).toHaveLength(50);
  });
});

// --- row operations --------------------------------------------------------

describe('meal and item row operations', () => {
  it('creates rows with an empty itemId identity', () => {
    expect(createItemRow()).toMatchObject({ itemId: '', name: '', quantity: '', type: '' });
    expect(createItemRow()).not.toHaveProperty('unit');
    expect(createMealSection().items).toHaveLength(1);
  });

  it('keeps rows independent between meals', () => {
    const first = createMealSection();
    const sections = addMeal([first]);
    const withRow = addItem(sections, sections[1].uid);
    expect(withRow[0].items).toHaveLength(1); // first meal untouched
    expect(withRow[1].items).toHaveLength(2);
  });

  it('updating an item in one meal does not touch another meal', () => {
    const sections = addMeal([createMealSection()]);
    const target = sections[1].items[0];
    const updated = updateItem(sections, sections[1].uid, target.uid, { itemId: 9 });
    expect(updated[0].items[0].itemId).toBe('');
    expect(updated[1].items[0].itemId).toBe(9);
  });

  it('removes only the requested row and meal', () => {
    let sections = [createMealSection()];
    sections = addItem(sections, sections[0].uid);
    const removed = removeItem(sections, sections[0].uid, sections[0].items[0].uid);
    expect(removed[0].items).toHaveLength(1);

    const twoMeals = addMeal([createMealSection()]);
    expect(removeMeal(twoMeals, twoMeals[0].uid)).toHaveLength(1);
  });

  it('updates only the targeted meal', () => {
    const sections = addMeal(addMeal([createMealSection()]));
    const updated = updateMeal(sections, sections[1].uid, { mealType: 'Dinner' });
    expect(updated[0].mealType).toBe('');
    expect(updated[1].mealType).toBe('Dinner');
    expect(updated[2].mealType).toBe('');
  });
});

// --- quantities and people -------------------------------------------------

describe('quantity handling', () => {
  it('keeps digits and one decimal point while typing', () => {
    expect(sanitizeQuantityInput('12')).toBe('12');
    expect(sanitizeQuantityInput('12.5')).toBe('12.5');
    expect(sanitizeQuantityInput('12.5.6')).toBe('12.56');
    expect(sanitizeQuantityInput('12kg')).toBe('12');
  });

  it('clears pasted signs and exponents instead of reinterpreting them', () => {
    expect(sanitizeQuantityInput('-7')).toBe('');
    expect(sanitizeQuantityInput('1e5')).toBe('');
    expect(sanitizeQuantityInput('+3')).toBe('');
  });

  it('rejects empty, zero, negative and malformed quantities', () => {
    expect(validateQuantity('')).toBe('Quantity is required.');
    expect(validateQuantity('0')).toBe('Quantity must be greater than 0.');
    expect(validateQuantity('0.0')).toBe('Quantity must be greater than 0.');
    expect(validateQuantity('-5')).toBeTruthy();
    expect(validateQuantity('1e5')).toBeTruthy();
    expect(validateQuantity('12.')).toBeTruthy();
  });

  it('accepts whole numbers and decimals without rounding them', () => {
    expect(validateQuantity('12')).toBe('');
    expect(validateQuantity('12.5')).toBe('');
  });

  it('keeps digits and separators out, and clears text that could be an exponent', () => {
    expect(sanitizePeopleInput('1,200')).toBe('1200');
    // 'people' contains an 'e', which the sanitizer treats as a possible
    // exponent, so the paste is cleared rather than silently reinterpreted.
    expect(sanitizePeopleInput('1000 people')).toBe('');
  });
});

describe('deriveDayFromDate', () => {
  it('derives the weekday from the calendar date', () => {
    expect(deriveDayFromDate('2026-10-13')).toBe('Tuesday');
  });

  it('returns an empty string when there is no usable date', () => {
    expect(deriveDayFromDate(null)).toBe('');
    expect(deriveDayFromDate('not-a-date')).toBe('');
  });
});

// --- institution normalisation --------------------------------------------

describe('normalizeInstitutions', () => {
  it('reads the attendance config wrapper and falls back to the approved list', () => {
    expect(normalizeInstitutions({ institutions: [{ id: 4, name: 'RMK Residential' }] })).toEqual([
      'RMK Residential',
    ]);
    expect(normalizeInstitutions({ institutions: [] })).toEqual(INSTITUTIONS);
    expect(normalizeInstitutions(null)).toEqual(INSTITUTIONS);
  });
});

// --- full form validation --------------------------------------------------

describe('validateEventForm', () => {
  it('accepts a complete event', () => {
    const result = validateEventForm(makeState(), validIds());
    expect(result.valid).toBe(true);
  });

  it('requires an event item to be selected', () => {
    const state = makeState({
      mealSections: [
        {
          uid: 'meal-1',
          mealType: 'Lunch',
          items: [{ uid: 'row-1', itemId: '', name: 'Typed by hand', quantity: '1', type: 'Veg' }],
        },
      ],
    });
    const result = validateEventForm(state, validIds());
    expect(result.valid).toBe(false);
    expect(result.errors.meals['meal-1'].items['row-1'].name).toBe(
      'Select an event item from the list.'
    );
  });

  it('rejects a stale itemId that is not in the loaded catalogue', () => {
    const state = makeState();
    state.mealSections[0].items[0].itemId = 4242;
    const result = validateEventForm(state, validIds());
    expect(result.valid).toBe(false);
    expect(result.errors.meals['meal-1'].items['row-1'].name).toBe(
      'Select an item from the event item list.'
    );
  });

  it('rejects every invalid quantity form', () => {
    ['', '0', '-1', 'abc', '1e5'].forEach((quantity) => {
      const state = makeState();
      state.mealSections[0].items[0].quantity = quantity;
      const result = validateEventForm(state, validIds());
      expect(result.valid).toBe(false);
      expect(result.errors.meals['meal-1'].items['row-1'].quantity).toBeTruthy();
    });
  });

  it('requires a type for every item', () => {
    const state = makeState();
    state.mealSections[0].items[0].type = '';
    const result = validateEventForm(state, validIds());
    expect(result.valid).toBe(false);
    expect(result.errors.meals['meal-1'].items['row-1'].type).toBe('Select a type.');
  });

  it('requires the header fields', () => {
    const result = validateEventForm(
      makeState({ eventName: '', noOfPeople: '', eventDate: null, institution: '' }),
      validIds()
    );
    expect(result.valid).toBe(false);
    expect(result.errors.eventName).toBeTruthy();
    expect(result.errors.institution).toBe('Please select an institution.');
    expect(result.errors.eventDate).toBeTruthy();
    expect(result.errors.noOfPeople).toBeTruthy();
  });

  it('rejects an institution outside the allowed list', () => {
    const result = validateEventForm(makeState({ institution: 'RMKEC <RMD,' }), validIds());
    expect(result.valid).toBe(false);
    expect(result.errors.institution).toBe('Select an institution from the list.');
  });

  it('rejects an event with no meals or no items', () => {
    expect(validateEventForm(makeState({ mealSections: [] }), validIds()).errors.meals.general).toBe(
      'Add at least one meal to this event.'
    );

    const emptyItems = makeState({
      mealSections: [{ uid: 'meal-1', mealType: 'Lunch', items: [] }],
    });
    expect(
      validateEventForm(emptyItems, validIds()).errors.meals['meal-1'].items.general
    ).toBe('Add at least one item to this meal.');
  });

  it('requires a meal type', () => {
    const state = makeState();
    state.mealSections[0].mealType = '';
    const result = validateEventForm(state, validIds());
    expect(result.valid).toBe(false);
    expect(result.errors.meals['meal-1'].mealType).toBe('Select a meal type.');
  });

  it('reports the first invalid field so the form can scroll to it', () => {
    const result = validateEventForm(makeState({ eventName: '' }), validIds());
    expect(result.firstInvalidRef).toBe('eventName');
  });
});

// --- payload ---------------------------------------------------------------

describe('buildEventPayload', () => {
  it('sends the catalogue id with each meal item', () => {
    const payload = buildEventPayload(makeState());
    expect(payload.meal_details).toEqual([
      {
        mealType: 'Lunch',
        items: [
          {
            itemId: 7,
            name: 'Chicken Biriyani',
            quantity: '120',
            type: 'Non-Veg',
          },
        ],
      },
    ]);
    expect(payload.meal_details[0].items[0]).not.toHaveProperty('unit');
  });

  it('keeps the existing field names and string formats', () => {
    const payload = buildEventPayload(makeState());
    expect(payload.event_name).toBe('Graduation Day');
    expect(payload.institution).toBe('RMK');
    expect(payload.event_date).toBe('2026-10-13');
    expect(payload.day).toBe('Tuesday');
    expect(payload.no_of_people).toBe('250');
    expect(typeof payload.no_of_people).toBe('string');
    expect(typeof payload.meal_details[0].items[0].quantity).toBe('string');
  });

  it('strips the internal row uid', () => {
    const payload = buildEventPayload(makeState());
    expect(payload.meal_details[0].items[0]).not.toHaveProperty('uid');
  });

  it('supports several meals with several items each', () => {
    const state = makeState({
      mealSections: [
        {
          uid: 'm1',
          mealType: 'Breakfast',
          items: [
            { uid: 'a', itemId: 9, name: 'Tomato', quantity: '2', type: 'Veg' },
            { uid: 'b', itemId: 12, name: 'Curd', quantity: '5', type: 'Common' },
          ],
        },
        {
          uid: 'm2',
          mealType: 'Dinner',
          items: [{ uid: 'c', itemId: 7, name: 'Chicken Biriyani', quantity: '80', type: 'Non-Veg' }],
        },
      ],
    });
    const payload = buildEventPayload(state);
    expect(payload.meal_details).toHaveLength(2);
    expect(payload.meal_details[0].items).toHaveLength(2);
    expect(payload.meal_details[1].items[0].itemId).toBe(7);
  });
});
