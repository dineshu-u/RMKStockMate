import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import AddEvent from './AddEvent';

vi.mock('axios');

// --- fixtures --------------------------------------------------------------

const CONFIG_RESPONSE = {
  data: { institutions: [{ id: 1, name: 'RMK' }, { id: 2, name: 'RMD' }] },
};

const ITEMS_RESPONSE = {
  data: {
    items: [
      { id: 21, name: 'Tomato', unit: 'kg' },
      { id: 22, name: 'Onion', unit: 'kg' },
      { id: 23, name: 'Curd', unit: 'l' },
    ],
  },
};

const setupApi = ({ items = ITEMS_RESPONSE, itemsFail = false, post } = {}) => {
  axios.get.mockImplementation((url) => {
    if (String(url).endsWith('/attendance/config')) return Promise.resolve(CONFIG_RESPONSE);
    if (String(url).endsWith('/eventItems')) {
      return itemsFail
        ? Promise.reject(new Error('network down'))
        : Promise.resolve(items);
    }
    // Any other GET (e.g. the inventory item list) is a test failure.
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  axios.post.mockImplementation(
    post ??
      (() =>
        Promise.resolve({
          data: { message: 'ok', item: { id: 99, name: 'Tomato Paste', unit: 'kg' }, duplicate: false },
        }))
  );
};

const renderForm = async () => {
  // delay:null drops userEvent's artificial per-keystroke delay; these forms
  // type a lot and the delay is pure test runtime, not behaviour.
  const user = userEvent.setup({ delay: null });
  render(<AddEvent />);
  // The placeholder flips once the event item catalogue has loaded.
  await screen.findByPlaceholderText('Search event item');
  return user;
};

const pickInstitution = async (user, name = 'RMK') => {
  await user.click(screen.getByLabelText('Institution *'));
  await user.click(await screen.findByRole('option', { name }));
};

// There can be several item rows on the form, so every helper takes the row it
// should act on (defaults to the first row).
const openItemList = async (user, rowIndex = 0) => {
  const input = screen.getAllByPlaceholderText('Search event item')[rowIndex];
  await user.click(input);
  return input;
};

const selectExistingItem = async (user, name, rowIndex = 0) => {
  const input = await openItemList(user, rowIndex);
  await user.type(input, name);
  await user.click(await screen.findByRole('option', { name: new RegExp(name) }));
};

const openCreateDialog = async (user, name, rowIndex = 0) => {
  const input = await openItemList(user, rowIndex);
  await user.type(input, name);
  await user.click(await screen.findByRole('option', { name: /Add / }));
  return screen.findByRole('dialog');
};

const unitField = () => screen.getByTitle('Unit taken from the selected event item');

const itemPostCalls = () =>
  axios.post.mock.calls.filter(([url]) => String(url).endsWith('/eventItems'));

beforeEach(() => {
  vi.clearAllMocks();
});

// --- loading and empty states ---------------------------------------------

describe('event item catalogue loading', () => {
  it('loads the event item catalogue from the event items endpoint', async () => {
    setupApi();
    const user = await renderForm();

    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/eventItems'));

    await openItemList(user);
    expect(await screen.findByRole('option', { name: /Tomato kg/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Onion kg/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Curd l/ })).toBeInTheDocument();
  });

  it('never asks the inventory item endpoint for the event item list', async () => {
    setupApi();
    await renderForm();

    const urls = axios.get.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/addItems'))).toBe(false);
    expect(urls.every((url) => url.endsWith('/attendance/config') || url.endsWith('/eventItems'))).toBe(
      true
    );
  });

  it('handles an empty catalogue without crashing and explains how to add the first item', async () => {
    setupApi({ items: { data: { items: [] } } });
    await renderForm();

    expect(screen.getByText(/event item list is empty/i)).toBeInTheDocument();
  });

  it('shows an error with a working retry when the catalogue cannot be loaded', async () => {
    setupApi({ itemsFail: true });
    const user = await renderForm();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not load the event item list/i);

    // Retrying against a working server clears the error and loads the list.
    setupApi();
    await user.click(within(alert.parentElement).getByRole('button', { name: /retry/i }));

    await waitFor(() =>
      expect(screen.queryByText(/could not load the event item list/i)).not.toBeInTheDocument()
    );
    await openItemList(user);
    expect(await screen.findByRole('option', { name: /Tomato kg/ })).toBeInTheDocument();
  });
});

// --- selecting an existing item -------------------------------------------

describe('selecting an existing event item', () => {
  it('finds the item by search and fills in its default unit', async () => {
    setupApi();
    const user = await renderForm();

    expect(unitField()).toHaveTextContent('—');

    await selectExistingItem(user, 'Tomato');

    expect(screen.getByPlaceholderText('Search event item')).toHaveValue('Tomato');
    expect(unitField()).toHaveTextContent('kg');
  });

  it('replaces the unit when a different item is selected', async () => {
    setupApi();
    const user = await renderForm();

    await selectExistingItem(user, 'Tomato');
    expect(unitField()).toHaveTextContent('kg');

    await selectExistingItem(user, 'Curd');
    expect(unitField()).toHaveTextContent('l');
    expect(screen.getByPlaceholderText('Search event item')).toHaveValue('Curd');
  });
});

// --- the "+ Add" affordance ------------------------------------------------

describe('add-missing-item affordance', () => {
  it('offers the create action when the search has no exact match', async () => {
    setupApi();
    const user = await renderForm();

    const input = await openItemList(user);
    await user.type(input, 'Tomato Paste');

    expect(await screen.findByRole('option', { name: /Add “Tomato Paste”/ })).toBeInTheDocument();
  });

  it('hides the create action when an equivalent item already exists', async () => {
    setupApi();
    const user = await renderForm();

    const input = await openItemList(user);
    await user.type(input, 'Tomato');

    expect(await screen.findByRole('option', { name: /Tomato kg/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Add / })).not.toBeInTheDocument();
  });

  it('treats whitespace and capitalization differences as an existing item', async () => {
    setupApi();
    const user = await renderForm();

    const input = await openItemList(user);
    await user.type(input, '  TOMATO ');

    expect(screen.queryByRole('option', { name: /Add / })).not.toBeInTheDocument();
  });
});

// --- creating an item ------------------------------------------------------

describe('creating a new event item', () => {
  it('creates the item, persists it, selects it and keeps the rest of the form', { timeout: 20000 }, async () => {
    setupApi();
    const user = await renderForm();

    // Pre-fill other parts of the form and add a second meal/row.
    await user.type(screen.getByLabelText('Event Name *'), 'Graduation Day');
    await pickInstitution(user);
    await user.type(screen.getByLabelText('Number of People *'), '250');
    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getAllByPlaceholderText('Search event item')).toHaveLength(2);

    // Select an item in the first row so we can prove it survives.
    await selectExistingItem(user, 'Onion', 0);

    const dialog = await openCreateDialog(user, 'Tomato Paste', 1);
    const nameInput = within(dialog).getByLabelText('Item Name *');
    expect(nameInput).toHaveValue('Tomato Paste'); // prefilled from the search query

    await user.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'kg');
    await user.click(within(dialog).getByRole('button', { name: /save item/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Posted to the event item catalogue with the typed values.
    expect(itemPostCalls()).toHaveLength(1);
    expect(itemPostCalls()[0][1]).toEqual({ name: 'Tomato Paste', unit: 'kg' });

    // The new item is selected in the row that opened the dialog.
    expect(screen.getAllByPlaceholderText('Search event item')[1]).toHaveValue('Tomato Paste');
    expect(screen.getAllByTitle('Unit taken from the selected event item')[1]).toHaveTextContent('kg');

    // Nothing else in the form was reset.
    expect(screen.getByLabelText('Event Name *')).toHaveValue('Graduation Day');
    // Multi-select: the chosen institution renders as a removable chip.
    expect(screen.getByRole('button', { name: /remove rmk/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Number of People *')).toHaveValue(250);
    expect(screen.getAllByPlaceholderText('Search event item')[0]).toHaveValue('Onion');
  });

  it('works when the catalogue is empty', async () => {
    setupApi({ items: { data: { items: [] } } });
    const user = await renderForm();

    expect(screen.getByText(/event item list is empty/i)).toBeInTheDocument();

    const dialog = await openCreateDialog(user, 'Turmeric');
    await user.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'g');
    await user.click(within(dialog).getByRole('button', { name: /save item/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemPostCalls()[0][1]).toEqual({ name: 'Turmeric', unit: 'g' });
  });

  it('validates the draft before sending anything', async () => {
    setupApi();
    const user = await renderForm();

    const dialog = await openCreateDialog(user, 'Tomato Paste');
    await user.click(within(dialog).getByRole('button', { name: /save item/i }));

    expect(await within(dialog).findByText('Select a unit.')).toBeInTheDocument();
    expect(itemPostCalls()).toHaveLength(0);

    // An empty name is rejected too.
    await user.clear(within(dialog).getByLabelText('Item Name *'));
    await user.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'kg');
    await user.click(within(dialog).getByRole('button', { name: /save item/i }));

    expect(await within(dialog).findByText('Item name is required.')).toBeInTheDocument();
    expect(itemPostCalls()).toHaveLength(0);
  });

  it('selects the existing record when the server reports a duplicate', async () => {
    // 'Tomatoes' has no exact match, so the create action is offered; the server
    // then reports that an equivalent item already exists (a race with another
    // user, or a name the client considered new).
    setupApi({
      post: () =>
        Promise.resolve({
          data: {
            message: '"Tomato" is already in the event item list.',
            item: { id: 21, name: 'Tomato', unit: 'kg' },
            duplicate: true,
            unitMismatch: false,
          },
        }),
    });
    const user = await renderForm();

    const dialog = await openCreateDialog(user, 'Tomatoes');
    await user.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'kg');
    await user.click(within(dialog).getByRole('button', { name: /save item/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByPlaceholderText('Search event item')).toHaveValue('Tomato');
    expect(unitField()).toHaveTextContent('kg');
  });

  it('keeps the typed name and unit when saving fails', async () => {
    setupApi({ post: () => Promise.reject({ response: { data: { message: 'Server exploded' } } }) });
    const user = await renderForm();

    await user.type(screen.getByLabelText('Event Name *'), 'Graduation Day');

    const dialog = await openCreateDialog(user, 'Tomato Paste');
    await user.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'kg');
    await user.click(within(dialog).getByRole('button', { name: /save item/i }));

    expect(await within(dialog).findByText('Server exploded')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Item Name *')).toHaveValue('Tomato Paste');
    expect(within(dialog).getByLabelText('Default Unit *')).toHaveValue('kg');
    // The event form itself is untouched.
    expect(screen.getByLabelText('Event Name *')).toHaveValue('Graduation Day');
  });

  it('sends only one create request when Save is clicked repeatedly', async () => {
    let resolvePost;
    setupApi({ post: () => new Promise((resolve) => { resolvePost = resolve; }) });
    const user = await renderForm();

    const dialog = await openCreateDialog(user, 'Tomato Paste');
    await user.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'kg');

    const save = within(dialog).getByRole('button', { name: /save item/i });
    await user.click(save);
    await user.click(save);
    await user.click(save);

    expect(itemPostCalls()).toHaveLength(1);

    resolvePost({ data: { item: { id: 99, name: 'Tomato Paste', unit: 'kg' }, duplicate: false } });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('offers a newly created item again after the form is reloaded', async () => {
    // First load: empty catalogue, the user creates the item from scratch.
    setupApi({ items: { data: { items: [] } } });
    const first = await renderForm();
    const dialog = await openCreateDialog(first, 'Turmeric');
    await first.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'g');
    await first.click(within(dialog).getByRole('button', { name: /save item/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The item is persisted server-side, so a fresh page load must offer it.
    cleanup();
    setupApi({ items: { data: { items: [{ id: 99, name: 'Turmeric', unit: 'g' }] } } });
    const second = await renderForm();
    await openItemList(second);

    expect(await screen.findByRole('option', { name: /Turmeric g/ })).toBeInTheDocument();
  });

  it('can be cancelled without changing the event form', async () => {
    setupApi();
    const user = await renderForm();

    const dialog = await openCreateDialog(user, 'Tomato Paste');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search event item')).toHaveValue('');
    expect(itemPostCalls()).toHaveLength(0);
  });
});

// --- inventory isolation ---------------------------------------------------

describe('inventory isolation', () => {
  it('does not touch inventory endpoints when an item is created and selected', async () => {
    setupApi();
    const user = await renderForm();

    await selectExistingItem(user, 'Tomato');
    const dialog = await openCreateDialog(user, 'Tomato Paste');
    await user.selectOptions(within(dialog).getByLabelText('Default Unit *'), 'kg');
    await user.click(within(dialog).getByRole('button', { name: /save item/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const writeUrls = axios.post.mock.calls.map(([url]) => String(url));
    expect(writeUrls.every((url) => url.endsWith('/eventItems'))).toBe(true);
  });
});

// --- submitting an event ---------------------------------------------------

describe('submitting an event', () => {
  const setEventDate = async (user, value = '13-10-2026') => {
    const input = document.getElementById('event-date');
    await user.click(input);
    await user.keyboard(value);
    await user.keyboard('{Enter}');
  };

  const fillRow = async (
    user,
    { mealLabel, itemName, quantity, type, mealIndex = 0, rowIndex = 0 }
  ) => {
    await user.selectOptions(screen.getAllByLabelText('Meal Type *')[mealIndex], mealLabel);

    const itemInputs = screen.getAllByPlaceholderText('Search event item');
    await user.click(itemInputs[rowIndex]);
    await user.type(itemInputs[rowIndex], itemName);
    await user.click(await screen.findByRole('option', { name: new RegExp(itemName) }));

    await user.type(screen.getAllByLabelText('Quantity *')[rowIndex], quantity);
    await user.selectOptions(screen.getAllByLabelText('Type *')[rowIndex], type);
  };

  it('posts the event with itemId, unit and the existing field names', async () => {
    setupApi({
      post: (url) =>
        String(url).endsWith('/eventItems')
          ? Promise.resolve({ data: { item: { id: 99, name: 'X', unit: 'kg' } } })
          : Promise.resolve({ data: 'Event details inserted successfully' }),
    });
    const user = await renderForm();

    await user.type(screen.getByLabelText('Event Name *'), 'Graduation Day');
    await pickInstitution(user);
    await setEventDate(user);
    await user.type(screen.getByLabelText('Number of People *'), '250');

    await fillRow(user, { mealLabel: 'Lunch', itemName: 'Tomato', quantity: '12', type: 'Veg' });

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(screen.getByLabelText('Event Name *')).toHaveValue(''));

    const [url, payload] = axios.post.mock.calls.find(([u]) => String(u).includes('/event/addevent'));
    expect(String(url)).toContain('/event/addevent');
    expect(payload.event_name).toBe('Graduation Day');
    expect(payload.institution).toBe('RMK');
    expect(payload.event_date).toBe('2026-10-13');
    expect(payload.day).toBe('Tuesday');
    expect(payload.no_of_people).toBe('250');
    expect(payload.meal_details[0].mealType).toBe('Lunch');
    expect(payload.meal_details[0].items[0]).toMatchObject({
      itemId: 21,
      name: 'Tomato',
      quantity: '12',
      type: 'Veg',
      unit: 'kg',
    });
  });

  it('submits several meals with several items each', { timeout: 20000 }, async () => {
    setupApi({
      post: (url) =>
        String(url).endsWith('/eventItems')
          ? Promise.resolve({ data: { item: { id: 99, name: 'X', unit: 'kg' } } })
          : Promise.resolve({ data: 'ok' }),
    });
    const user = await renderForm();

    await user.type(screen.getByLabelText('Event Name *'), 'Founders Day');
    await pickInstitution(user, 'RMD');
    await setEventDate(user);
    await user.type(screen.getByLabelText('Number of People *'), '90');

    await fillRow(user, {
      mealLabel: 'Breakfast',
      itemName: 'Tomato',
      quantity: '5',
      type: 'Veg',
      mealIndex: 0,
      rowIndex: 0,
    });
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await fillRow(user, {
      mealLabel: 'Breakfast',
      itemName: 'Curd',
      quantity: '8',
      type: 'Common',
      mealIndex: 0,
      rowIndex: 1,
    });

    // The second meal starts with a single (already empty) item row.
    await user.click(screen.getByRole('button', { name: /add meal type/i }));
    expect(screen.getAllByPlaceholderText('Search event item')).toHaveLength(3);
    await fillRow(user, {
      mealLabel: 'Dinner',
      itemName: 'Onion',
      quantity: '30',
      type: 'Veg',
      mealIndex: 1,
      rowIndex: 2,
    });

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(axios.post.mock.calls.some(([u]) => String(u).includes('/event/addevent'))).toBe(true));

    const [, payload] = axios.post.mock.calls.find(([u]) => String(u).includes('/event/addevent'));
    expect(payload.institution).toBe('RMD');
    expect(payload.meal_details).toHaveLength(2);
    expect(payload.meal_details[0].items.map((i) => i.itemId)).toEqual([21, 23]);
    expect(payload.meal_details[1].items.map((i) => i.itemId)).toEqual([22]);
    expect(payload.meal_details[0].items[1].unit).toBe('l');
  });

  it('sends only one event request when submit is triggered repeatedly', async () => {
    let resolveSubmit;
    setupApi({
      post: (url) =>
        String(url).endsWith('/eventItems')
          ? Promise.resolve({ data: { item: { id: 99, name: 'X', unit: 'kg' } } })
          : new Promise((resolve) => {
              resolveSubmit = resolve;
            }),
    });
    const user = await renderForm();

    await user.type(screen.getByLabelText('Event Name *'), 'Graduation Day');
    await pickInstitution(user);
    await setEventDate(user);
    await user.type(screen.getByLabelText('Number of People *'), '250');
    await fillRow(user, { mealLabel: 'Lunch', itemName: 'Tomato', quantity: '12', type: 'Veg' });

    const form = screen.getByLabelText('Event Name *').closest('form');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    // Further submits land before React has re-rendered the disabled button.
    fireEvent.submit(form);
    fireEvent.submit(form);

    const eventPosts = () =>
      axios.post.mock.calls.filter(([url]) => String(url).includes('/event/addevent'));
    expect(eventPosts()).toHaveLength(1);

    resolveSubmit({ data: 'Event details inserted successfully' });
    await waitFor(() => expect(screen.getByLabelText('Event Name *')).toHaveValue(''));
  });

  it('blocks submission and keeps the data when the catalogue failed to load', async () => {
    setupApi({ itemsFail: true });
    const user = await renderForm();

    await user.type(screen.getByLabelText('Event Name *'), 'Graduation Day');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(axios.post).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Event Name *')).toHaveValue('Graduation Day');
  });

  it('keeps the entered event when the submit request fails', async () => {
    setupApi({
      post: () => Promise.reject({ response: { data: { message: 'Nope' } } }),
    });
    const user = await renderForm();

    await user.type(screen.getByLabelText('Event Name *'), 'Graduation Day');
    await pickInstitution(user);
    await setEventDate(user);
    await user.type(screen.getByLabelText('Number of People *'), '250');
    await fillRow(user, { mealLabel: 'Lunch', itemName: 'Tomato', quantity: '12', type: 'Veg' });

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() =>
      expect(axios.post.mock.calls.some(([u]) => String(u).includes('/event/addevent'))).toBe(true)
    );
    expect(screen.getByLabelText('Event Name *')).toHaveValue('Graduation Day');
    expect(screen.getByLabelText('Number of People *')).toHaveValue(250);
  });
});
