import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import axios from 'axios';
import dayjs from 'dayjs';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaExclamationCircle, FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
import SearchableSelect from './SearchableSelect';
import {
  INSTITUTIONS,
  MEAL_TYPES,
  ITEM_TYPES,
  EVENT_ITEM_UNITS,
  INSTITUTION_ENDPOINT,
  EVENT_ITEM_ENDPOINT,
  createMealSection,
  deriveDayFromDate,
  sanitizePeopleInput,
  sanitizeQuantityInput,
  addMeal,
  updateMeal,
  removeMeal,
  addItem,
  updateItem,
  removeItem,
  normalizeInstitutions,
  normalizeEventItems,
  eventItemIdSet,
  filterEventItems,
  normalizeItemName,
  validateEventItemDraft,
  validateEventForm,
  buildEventPayload,
} from '../utils/eventForm';

const API_URL = import.meta.env.VITE_RMK_MESS_URL;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  border-radius: 8px;
  background: #ffffff;
`;

const Section = styled.div`
  margin-bottom: 8px;
`;

const Heading = styled.h1`
  font-size: 1.4rem;
  font-weight: bold;
  margin: 0 0 16px 0;
  color: #164863;
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: bold;
  margin: 0 0 6px 0;
  color: #164863;
`;

const Hint = styled.p`
  margin: 0 0 12px 0;
  color: #64748b;
  font-size: 0.82rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Label = styled.label`
  font-weight: bold;
  color: #164863;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${(p) => (p['aria-invalid'] ? '#d9534f' : '#ccc')};
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 5px #164863;
  }

  &:read-only {
    background: #f4f4f4;
    color: #334155;
  }
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid ${(p) => (p['aria-invalid'] ? '#d9534f' : '#ccc')};
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
  }
`;

const ErrorText = styled.p`
  margin: 0;
  color: #b00020;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border: 1px solid #f0c36d;
  border-left: 5px solid #f0c36d;
  background: #fffbf0;
  color: #7a5b00;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 0.88rem;
  margin-bottom: 12px;

  button {
    border: 1px solid #164863;
    background: white;
    color: #164863;
    border-radius: 16px;
    padding: 4px 14px;
    font-size: 0.82rem;
    cursor: pointer;
  }
`;

const MealSection = styled.div`
  border: 1px solid #ddd;
  padding: 14px;
  border-radius: 8px;
  margin-bottom: 14px;
  background-color: #ffffff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  scroll-margin-top: 90px;
`;

const MealHeader = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;

  .meal-type {
    width: 190px;
  }
`;

const ItemCount = styled.span`
  color: #64748b;
  font-size: 0.82rem;
  margin-left: auto;
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns:
    minmax(0, 3fr) minmax(110px, 1.1fr) minmax(140px, 1.2fr)
    130px;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 14px 0;
  }
`;

const ItemGridHead = styled(ItemGrid)`
  border-bottom: 1px solid #ddd;
  padding: 6px 0;
  color: #164863;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;

  @media (max-width: 720px) {
    display: none;
  }
`;

const Cell = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

// On desktop each row is identified by the column header, so the per-field label
// is only visually hidden (still exposed to screen readers); on mobile the row
// stacks and the labels become visible.
const CellLabel = styled(Label)`
  @media (min-width: 721px) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

const Button = styled.button`
  padding: 8px 14px;
  cursor: pointer;
  background-color: #164863;
  text-align: center;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: background-color 0.3s, transform 0.2s;

  &:hover:not(:disabled) {
    background-color: #1d4f6f;
    transform: scale(1.03);
  }

  &:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
  }
`;

const GhostButton = styled(Button)`
  background-color: #ffffff;
  color: #164863;
  border: 1px solid #164863;

  &:hover:not(:disabled) {
    background-color: #eef4f8;
  }
`;

const DangerButton = styled(Button)`
  background-color: #ffffff;
  color: #b00020;
  border: 1px solid #e2a0a8;
  border-radius: 8px;
  padding: 8px 10px;

  &:hover:not(:disabled) {
    background-color: #fdf2f3;
  }
`;

const RemoveButton = styled(Button)`
  background-color: #ffffff;
  color: #b00020;
  border: 1px solid #e2a0a8;
  border-radius: 6px;
  padding: 9px 10px;

  &:hover:not(:disabled) {
    background-color: #fdf2f3;
  }
`;

const SubmitButton = styled(Button)`
  background-color: #4caf50;
  border-radius: 6px;
  padding: 11px 26px;
  font-size: 1rem;

  &:hover:not(:disabled) {
    background-color: #45a049;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// --- inline "add event item" dialog -----------------------------------------

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 60;
`;

const ModalPanel = styled.div`
  background: #ffffff;
  border-radius: 10px;
  padding: 18px 20px 16px;
  width: 100%;
  max-width: 430px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  color: #164863;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 2px;
`;

const ItemError = ({ id, message }) =>
  message ? (
    <ErrorText id={id} role="alert">
      <FaExclamationCircle aria-hidden="true" /> {message}
    </ErrorText>
  ) : null;

const formatApiError = (error, fallback = 'There was an error submitting the form. Please try again.') => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  return data.message || data.error || fallback;
};

const AddEvent = () => {
  const [eventName, setEventName] = useState('');
  const [institution, setInstitution] = useState([]); // multi-select: array of institution names
  const [eventDate, setEventDate] = useState(null);
  const [noOfPeople, setNoOfPeople] = useState('');
  const [mealSections, setMealSections] = useState([createMealSection()]);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Institutions: loaded from the existing attendance config endpoint (the app's
  // single source of institution names), with the approved list as fallback.
  const [institutions, setInstitutions] = useState(INSTITUTIONS);
  const [institutionsLoading, setInstitutionsLoading] = useState(true);
  const [institutionsNotice, setInstitutionsNotice] = useState('');

  // Event items: the event meal ingredient catalogue (GET /eventItems). Kept
  // separate from the inventory master list on purpose.
  const [eventItems, setEventItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState('');

  // The inline "add a missing item" dialog. null when closed.
  const [addItemDraft, setAddItemDraft] = useState(null);

  const mealsRef = useRef(null);
  // Synchronous guard: `submitting` state alone cannot stop a second submit that
  // happens before React re-renders the disabled button.
  const submitLockRef = useRef(false);

  const day = deriveDayFromDate(eventDate);

  const loadInstitutions = useCallback(async () => {
    setInstitutionsLoading(true);
    setInstitutionsNotice('');
    try {
      const response = await axios.get(`${API_URL}${INSTITUTION_ENDPOINT}`);
      setInstitutions(normalizeInstitutions(response.data));
    } catch (error) {
      console.error('Error fetching institutions:', error);
      setInstitutions(INSTITUTIONS);
      setInstitutionsNotice('Could not load institutions from the server; showing the approved list.');
    } finally {
      setInstitutionsLoading(false);
    }
  }, []);

  const loadEventItems = useCallback(async () => {
    setItemsLoading(true);
    setItemsError('');
    try {
      const response = await axios.get(`${API_URL}${EVENT_ITEM_ENDPOINT}`);
      setEventItems(normalizeEventItems(response.data));
    } catch (error) {
      console.error('Error fetching event items:', error);
      setEventItems([]);
      setItemsError('Could not load the event item list. Check the server connection and retry.');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
    loadEventItems();
  }, [loadInstitutions, loadEventItems]);

  // Escape closes the add-item dialog; the event form underneath is untouched.
  useEffect(() => {
    if (!addItemDraft) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setAddItemDraft(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [addItemDraft]);

  const institutionOptions = useMemo(
    () => institutions.map((name) => ({ value: name, label: name })),
    [institutions]
  );

  // The option value is the catalogue id (as a string, because a DOM value is a
  // string); the label is the name. Identity is never the display name.
  const itemOptions = useMemo(
    () =>
      eventItems.map((item) => ({
        value: String(item.id),
        label: item.unit ? `${item.name} (${item.unit})` : item.name,
      })),
    [eventItems]
  );

  const allowedItemIds = useMemo(() => eventItemIdSet(eventItems), [eventItems]);

  // Ranked client-side filtering (no request per keystroke: the whole catalogue
  // is already loaded and the app already filters lists client-side).
  const itemFilterFn = useCallback(
    (options, query) => {
      const { matches } = filterEventItems(eventItems, query, 50);
      const rank = new Map(matches.map((m, index) => [m.id, index]));
      return options
        .filter((option) => rank.has(Number(option.value)))
        .sort((a, b) => rank.get(Number(a.value)) - rank.get(Number(b.value)));
    },
    [eventItems]
  );

  const formState = { eventName, institution, eventDate, noOfPeople, mealSections };

  const { errors } = useMemo(
    () =>
      validateEventForm(
        { eventName, institution, eventDate, noOfPeople, mealSections },
        allowedItemIds,
        institutions
      ),
    [eventName, institution, eventDate, noOfPeople, mealSections, allowedItemIds, institutions]
  );

  // Errors are only shown after the first submit attempt, then stay live so a
  // corrected field clears immediately.
  const shownErrors = submitAttempted ? errors : null;

  const scrollToRef = useCallback((ref) => {
    if (!ref) return;
    if (ref === 'meals') {
      mealsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const element = document.getElementById(
      ref === 'eventName'
        ? 'event-name'
        : ref === 'institution'
          ? 'event-institution'
          : ref === 'eventDate'
            ? 'event-date'
            : ref === 'noOfPeople'
              ? 'event-people'
              : `meal-${ref}`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus?.({ preventScroll: true });
    }
  }, []);

  // Selecting an item stores its catalogue id and copies the item's display
  // name onto the row.
  const handleItemSelect = (mealUid, itemUid, selectedValue) => {
    const chosen = eventItems.find((item) => String(item.id) === String(selectedValue));
    setMealSections((prev) =>
      updateItem(prev, mealUid, itemUid, {
        itemId: chosen ? chosen.id : '',
        name: chosen ? chosen.name : '',
      })
    );
  };

  const openAddItem = (mealUid, itemUid, query) => {
    setAddItemDraft({
      mealUid,
      itemUid,
      name: normalizeItemName(query),
      unit: '',
      errors: { name: '', unit: '' },
      saving: false,
      error: '',
    });
  };

  const handleAddItemField = (patch) => {
    setAddItemDraft((prev) => (prev ? { ...prev, ...patch, error: '' } : prev));
  };

  const handleSaveNewItem = async () => {
    if (!addItemDraft || addItemDraft.saving) return;

    const validation = validateEventItemDraft({ name: addItemDraft.name, unit: addItemDraft.unit });
    if (!validation.valid) {
      setAddItemDraft((prev) => (prev ? { ...prev, errors: validation.errors } : prev));
      return;
    }

    setAddItemDraft((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));

    try {
      const response = await axios.post(`${API_URL}${EVENT_ITEM_ENDPOINT}`, {
        name: validation.name,
        unit: validation.unit,
      });

      const created = normalizeEventItems({ items: [response.data?.item] })[0];
      if (!created) throw new Error('The server did not return the saved item.');

      // Refresh the catalogue locally (without re-fetching) so the new item is
      // immediately selectable; a duplicate response is already in the list.
      setEventItems((prev) =>
        prev.some((item) => item.id === created.id)
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );

      // Select it in the row that opened the dialog. Everything else - other
      // meals, other rows, and every event field - is left as it was.
      setMealSections((prev) =>
        updateItem(prev, addItemDraft.mealUid, addItemDraft.itemUid, {
          itemId: created.id,
          name: created.name,
        })
      );

      if (response.data?.duplicate) {
        toast.info(response.data.message || 'That item already existed; it has been selected.');
      } else {
        toast.success(`"${created.name}" added to the event item list.`);
      }

      setAddItemDraft(null);
    } catch (error) {
      console.error('Error creating event item:', error);
      // Keep the typed name so the user can retry.
      setAddItemDraft((prev) =>
        prev
          ? {
              ...prev,
              saving: false,
              error: formatApiError(error, 'Could not save the item. Please try again.'),
            }
          : prev
      );
    }
  };

  const handleDeleteItem = (mealUid, itemUid) => {
    const meal = mealSections.find((s) => s.uid === mealUid);
    const item = meal?.items.find((i) => i.uid === itemUid);
    if (item && (item.itemId || item.quantity)) {
      if (!window.confirm('Remove this item from the meal?')) return;
    }
    setMealSections((prev) => removeItem(prev, mealUid, itemUid));
  };

  const handleDeleteMeal = (mealUid) => {
    const meal = mealSections.find((s) => s.uid === mealUid);
    const hasData =
      !!meal && (!!meal.mealType || meal.items.some((item) => item.itemId || item.quantity));
    if (hasData && !window.confirm('Delete this meal and all its items?')) return;
    setMealSections((prev) => removeMeal(prev, mealUid));
  };

  const resetForm = () => {
    setEventName('');
    setInstitution([]);
    setEventDate(null);
    setNoOfPeople('');
    setMealSections([createMealSection()]);
    setSubmitAttempted(false);
    setAddItemDraft(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLockRef.current) return; // guards against duplicate submissions
    submitLockRef.current = true;

    try {
      setSubmitAttempted(true);

      if (itemsError) {
        toast.error('The event item list is unavailable. Retry loading the items before submitting.');
        return;
      }

      const result = validateEventForm(formState, allowedItemIds, institutions);
      if (!result.valid) {
        scrollToRef(result.firstInvalidRef);
        toast.error('Please fix the highlighted fields before submitting.');
        return;
      }

      const payload = buildEventPayload(formState);
      setSubmitting(true);
      try {
        await axios.post(`${API_URL}/event/addevent`, payload);
        toast.success('Event added successfully.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        resetForm();
      } catch (error) {
        console.error('Error submitting the event:', error);
        // Entered values are preserved so the user can retry without retyping.
        toast.error(formatApiError(error));
      }
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const catalogueEmpty = !itemsLoading && !itemsError && eventItems.length === 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Form onSubmit={handleSubmit} noValidate>
        <Section>
          <Heading>Event Details</Heading>
          <Grid>
            <FormGroup>
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                type="text"
                name="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                aria-invalid={shownErrors?.eventName ? true : undefined}
                aria-describedby={shownErrors?.eventName ? 'event-name-error' : undefined}
                required
              />
              <ItemError id="event-name-error" message={shownErrors?.eventName} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="event-institution" id="event-institution-label">
                Institution *
              </Label>
              <SearchableSelect
                id="event-institution"
                multiple
                value={institution}
                onChange={setInstitution}
                options={institutionOptions}
                placeholder={institutionsLoading ? 'Loading institutions…' : 'Search & select institutions'}
                required
                loading={institutionsLoading}
                loadError={institutionsNotice}
                onRetry={loadInstitutions}
                invalid={!!shownErrors?.institution}
                describedBy={shownErrors?.institution ? 'event-institution-error' : undefined}
              />
              <ItemError id="event-institution-error" message={shownErrors?.institution} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="event-date">Event Date *</Label>
              <DatePicker
                value={eventDate}
                onChange={(newValue) =>
                  setEventDate(newValue && dayjs(newValue).isValid() ? newValue : null)
                }
                format="DD-MM-YYYY"
                slotProps={{
                  textField: {
                    id: 'event-date',
                    size: 'small',
                    fullWidth: true,
                    error: !!shownErrors?.eventDate,
                    helperText: shownErrors?.eventDate || undefined,
                  },
                }}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="event-day">Day</Label>
              <Input
                id="event-day"
                type="text"
                value={day}
                readOnly
                aria-readonly="true"
                placeholder="Auto-calculated from the date"
              />
              <VisuallyHidden aria-live="polite">
                {day ? `Day set to ${day}` : 'No day selected'}
              </VisuallyHidden>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="event-people">Number of People *</Label>
              <Input
                id="event-people"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={noOfPeople}
                onChange={(e) => setNoOfPeople(sanitizePeopleInput(e.target.value))}
                aria-invalid={shownErrors?.noOfPeople ? true : undefined}
                aria-describedby={shownErrors?.noOfPeople ? 'event-people-error' : undefined}
                required
              />
              <ItemError id="event-people-error" message={shownErrors?.noOfPeople} />
            </FormGroup>
          </Grid>
        </Section>

        <Section ref={mealsRef} id="event-meals">
          <SectionTitle>Meal Details</SectionTitle>

          {itemsLoading && <Banner>Loading event items…</Banner>}
          {!itemsLoading && itemsError && (
            <Banner>
              <span role="alert">{itemsError}</span>
              <button type="button" onClick={loadEventItems}>
                Retry
              </button>
            </Banner>
          )}
          {catalogueEmpty && (
            <Banner>
              <span>
                The event item list is empty. Type an item name in the Item box below and choose{' '}
                <strong>Add “…”</strong> to create the first one.
              </span>
            </Banner>
          )}

          {shownErrors?.meals?.general && (
            <ItemError id="event-meals-error" message={shownErrors.meals.general} />
          )}

          {mealSections.map((mealSection) => {
            const mealErrors = shownErrors?.meals?.[mealSection.uid];
            const filledItems = mealSection.items.filter((item) => item.itemId).length;
            return (
              <MealSection key={mealSection.uid} id={`meal-${mealSection.uid}`} tabIndex={-1}>
                <MealHeader>
                  <FormGroup className="meal-type">
                    <Label htmlFor={`meal-type-${mealSection.uid}`}>Meal Type *</Label>
                    <Select
                      id={`meal-type-${mealSection.uid}`}
                      value={mealSection.mealType}
                      onChange={(e) =>
                        setMealSections((prev) =>
                          updateMeal(prev, mealSection.uid, { mealType: e.target.value })
                        )
                      }
                      aria-invalid={mealErrors?.mealType ? true : undefined}
                      aria-describedby={
                        mealErrors?.mealType ? `meal-type-error-${mealSection.uid}` : undefined
                      }
                      required
                    >
                      <option value="">Select Meal Type</option>
                      {MEAL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                    <ItemError
                      id={`meal-type-error-${mealSection.uid}`}
                      message={mealErrors?.mealType}
                    />
                  </FormGroup>

                  <Button
                    type="button"
                    onClick={() => setMealSections((prev) => addItem(prev, mealSection.uid))}
                  >
                    <FaPlus aria-hidden="true" /> Add Item
                  </Button>
                  <DangerButton type="button" onClick={() => handleDeleteMeal(mealSection.uid)}>
                    <FaTrash aria-hidden="true" /> Delete Meal
                  </DangerButton>

                  <ItemCount>
                    {filledItems} of {mealSection.items.length} item
                    {mealSection.items.length === 1 ? '' : 's'} selected
                  </ItemCount>
                </MealHeader>

                {mealErrors?.items?.general && <ItemError message={mealErrors.items.general} />}

                {mealSection.items.length > 0 && (
                  <ItemGridHead aria-hidden="true">
                    <span>Item</span>
                    <span>Quantity</span>
                    <span>Type</span>
                    <span />
                  </ItemGridHead>
                )}

                {mealSection.items.map((item) => {
                  const itemErrors = mealErrors?.items?.[item.uid];
                  const base = `${mealSection.uid}-${item.uid}`;
                  return (
                    <ItemGrid key={item.uid}>
                      <Cell>
                        <CellLabel htmlFor={`item-name-${base}`}>Item *</CellLabel>
                        <SearchableSelect
                          id={`item-name-${base}`}
                          value={item.itemId ? String(item.itemId) : ''}
                          onChange={(value) =>
                            handleItemSelect(mealSection.uid, item.uid, value)
                          }
                          options={itemOptions}
                          placeholder={itemsLoading ? 'Loading event items…' : 'Search event item'}
                          required
                          loading={itemsLoading}
                          loadError={itemsError}
                          onRetry={loadEventItems}
                          filterFn={itemFilterFn}
                          allowCreate
                          onCreateNew={(query) => openAddItem(mealSection.uid, item.uid, query)}
                          invalid={!!itemErrors?.name}
                          describedBy={itemErrors?.name ? `item-name-error-${base}` : undefined}
                        />
                        <ItemError id={`item-name-error-${base}`} message={itemErrors?.name} />
                      </Cell>

                      <Cell>
                        <CellLabel htmlFor={`item-qty-${base}`}>Quantity *</CellLabel>
                        <Input
                          id={`item-qty-${base}`}
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(e) => {
                            const quantity = sanitizeQuantityInput(e.target.value);
                            setMealSections((prev) =>
                              updateItem(prev, mealSection.uid, item.uid, { quantity })
                            );
                          }}
                          aria-invalid={itemErrors?.quantity ? true : undefined}
                          aria-describedby={
                            itemErrors?.quantity ? `item-qty-error-${base}` : undefined
                          }
                        />
                        <ItemError id={`item-qty-error-${base}`} message={itemErrors?.quantity} />
                      </Cell>

                      <Cell>
                        <CellLabel htmlFor={`item-type-${base}`}>Type *</CellLabel>
                        <Select
                          id={`item-type-${base}`}
                          value={item.type}
                          onChange={(e) =>
                            setMealSections((prev) =>
                              updateItem(prev, mealSection.uid, item.uid, {
                                type: e.target.value,
                              })
                            )
                          }
                          aria-invalid={itemErrors?.type ? true : undefined}
                          aria-describedby={
                            itemErrors?.type ? `item-type-error-${base}` : undefined
                          }
                          required
                        >
                          <option value="">Select Type</option>
                          {ITEM_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </Select>
                        <ItemError id={`item-type-error-${base}`} message={itemErrors?.type} />
                      </Cell>

                      <Cell>
                        <RemoveButton
                          type="button"
                          aria-label={`Remove ${item.name || 'item'}`}
                          onClick={() => handleDeleteItem(mealSection.uid, item.uid)}
                        >
                          <FaTimes aria-hidden="true" /> Remove
                        </RemoveButton>
                      </Cell>
                    </ItemGrid>
                  );
                })}

                {mealSection.items.length > 0 && (
                  <GhostButton
                    type="button"
                    style={{ marginTop: '10px' }}
                    onClick={() => setMealSections((prev) => addItem(prev, mealSection.uid))}
                  >
                    <FaPlus aria-hidden="true" /> Add Item
                  </GhostButton>
                )}
              </MealSection>
            );
          })}

          <GhostButton type="button" onClick={() => setMealSections((prev) => addMeal(prev))}>
            <FaPlus aria-hidden="true" /> Add Meal Type
          </GhostButton>
        </Section>

        <Actions>
          <SubmitButton type="submit" disabled={submitting || itemsLoading}>
            {submitting ? 'Saving…' : 'Submit'}
          </SubmitButton>
        </Actions>
      </Form>

      {addItemDraft && (
        <ModalBackdrop
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddItemDraft(null);
          }}
        >
          <ModalPanel
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-event-item-title"
          >
            <ModalTitle id="add-event-item-title">Add a new event item</ModalTitle>
            <Hint style={{ margin: 0 }}>
              This adds the item to the event item list only. Inventory stock is not affected.
            </Hint>

            <FormGroup>
              <Label htmlFor="new-item-name">Item Name *</Label>
              <Input
                id="new-item-name"
                type="text"
                autoFocus
                maxLength={160}
                value={addItemDraft.name}
                onChange={(e) =>
                  setAddItemDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: e.target.value,
                          error: '',
                          errors: { ...prev.errors, name: '' },
                        }
                      : prev
                  )
                }
                aria-invalid={addItemDraft.errors.name ? true : undefined}
                aria-describedby={addItemDraft.errors.name ? 'new-item-name-error' : undefined}
              />
              <ItemError id="new-item-name-error" message={addItemDraft.errors.name} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="new-item-unit">Unit *</Label>
              <Select
                id="new-item-unit"
                value={addItemDraft.unit}
                onChange={(e) =>
                  setAddItemDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          unit: e.target.value,
                          error: '',
                          errors: { ...prev.errors, unit: '' },
                        }
                      : prev
                  )
                }
                aria-invalid={addItemDraft.errors.unit ? true : undefined}
                aria-describedby={addItemDraft.errors.unit ? 'new-item-unit-error' : undefined}
              >
                <option value="">Select a unit…</option>
                {EVENT_ITEM_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
              <ItemError id="new-item-unit-error" message={addItemDraft.errors.unit} />
            </FormGroup>

            {addItemDraft.error && <ItemError id="new-item-error" message={addItemDraft.error} />}

            <ModalActions>
              <GhostButton type="button" onClick={() => setAddItemDraft(null)}>
                Cancel
              </GhostButton>
              <SubmitButton
                type="button"
                onClick={handleSaveNewItem}
                disabled={addItemDraft.saving}
              >
                {addItemDraft.saving ? 'Saving…' : 'Save Item'}
              </SubmitButton>
            </ModalActions>
          </ModalPanel>
        </ModalBackdrop>
      )}

      <ToastContainer />
    </LocalizationProvider>
  );
};

export default AddEvent;
