import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import axios from 'axios';
import dayjs from 'dayjs';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SearchableSelect from './SearchableSelect';

const API_URL = import.meta.env.VITE_RMK_MESS_URL;

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages'];
const ITEM_TYPES = ['Veg', 'Non-Veg', 'Common'];

// Approved institutions. The list is refreshed from the attendance
// configuration API on load; these values match the seeded
// attendance_institutions table and act as the offline fallback.
const FALLBACK_INSTITUTIONS = [
  'RMK',
  'RMD',
  'RMK-CET',
  'RMK Residential',
  'RMK Mat. School',
  'SDPC',
  'RMK School / Thiruverkadu',
  'RMK Pathasala',
];

const MAX_NO_OF_PEOPLE = 2147483647; // upper bound of a MySQL INT column

// ---------------------------------------------------------------------
// Pure validation - returns an errors object whose keys are inserted in
// document order, so the first key is the first invalid field.
// ---------------------------------------------------------------------
const validateState = ({ eventName, institution, eventDate, noOfPeople, mealSections }) => {
  const errs = {};
  const addErr = (key, msg) => {
    if (!errs[key]) errs[key] = msg;
  };

  if (!eventName.trim()) addErr('eventName', 'Event name is required.');
  if (!institution) addErr('institution', 'Please select an institution.');
  if (!eventDate || !dayjs.isDayjs(eventDate) || !eventDate.isValid()) {
    addErr('eventDate', 'Please select a valid date.');
  }

  if (String(noOfPeople).trim() === '') {
    addErr('noOfPeople', 'Number of people is required.');
  } else {
    const n = Number(noOfPeople);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > MAX_NO_OF_PEOPLE) {
      addErr('noOfPeople', 'Enter a positive whole number.');
    }
  }

  if (mealSections.length === 0) addErr('meals', 'Add at least one meal.');

  mealSections.forEach((section) => {
    if (!section.mealType) addErr(`${section.id}-mealType`, 'Select a meal type.');
    section.items.forEach((item) => {
      if (!item.name) addErr(`${item.id}-name`, 'Select or add an event item.');
      const q = String(item.quantity).trim();
      if (q === '') {
        addErr(`${item.id}-quantity`, 'Quantity is required.');
      } else {
        const num = Number(q);
        if (!Number.isFinite(num) || num <= 0) {
          addErr(`${item.id}-quantity`, 'Quantity must be a number greater than 0.');
        }
      }
      if (!item.type) addErr(`${item.id}-type`, 'Select a type.');
    });
  });

  return errs;
};

const isBlankItem = (item) =>
  !item.name && String(item.quantity).trim() === '' && !item.type;

const isBlankMeal = (section) =>
  !section.mealType && section.items.every(isBlankItem);

const cleanQuantity = (raw) => {
  let out = '';
  let dotSeen = false;
  for (const ch of String(raw)) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === '.' && !dotSeen) {
      out += ch;
      dotSeen = true;
    }
  }
  return out;
};

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  border-radius: 8px;
  background: #ffffff;
`;

const Section = styled.div`
  margin-bottom: 10px;
`;

const Heading = styled.h1`
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
  color: #164863;
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
  color: #164863;
`;

const EventDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  margin-bottom: 20px;
  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Label = styled.label`
  font-weight: bold;
  color: #164863;
  font-size: 0.95rem;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${(props) => (props.$invalid ? '#d32f2f' : '#ccc')};
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
    background: #f4f7f9;
    color: #46617a;
    cursor: default;
  }
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid ${(props) => (props.$invalid ? '#d32f2f' : '#ccc')};
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

const FieldError = styled.span`
  color: #d32f2f;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 4px 0 0;
`;

const FormError = styled.div`
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 12px;
`;

const MealSection = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  padding: 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  background-color: #ffffff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
`;

const MealHeader = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const MealTypeGroup = styled.div`
  flex: 1 1 220px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ItemCount = styled.span`
  align-self: flex-end;
  color: #46617a;
  font-size: 0.85rem;
  font-weight: 600;
  background: #eef3f7;
  border-radius: 12px;
  padding: 4px 10px;
  white-space: nowrap;
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
  white-space: nowrap;
  transition: background-color 0.3s, transform 0.2s;
  &:hover:not(:disabled) {
    background-color: #1d4f6f;
    transform: scale(1.05);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const DangerButton = styled(Button)`
  background-color: #b91c1c;
  &:hover:not(:disabled) {
    background-color: #991b1b;
  }
`;

const RemoveRowButton = styled.button`
  width: 34px;
  height: 34px;
  align-self: center;
  border: 1px solid #e5b8b8;
  border-radius: 50%;
  background: white;
  color: #b91c1c;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  &:hover {
    background: #fef2f2;
  }
  &:focus-visible {
    outline: 2px solid #164863;
    outline-offset: 2px;
  }
`;

const ItemHeaderRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) minmax(110px, 0.9fr) minmax(130px, 1fr) 34px;
  gap: 10px;
  padding: 0 2px 6px;
  span {
    font-size: 0.8rem;
    font-weight: bold;
    color: #46617a;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  @media (max-width: 680px) {
    display: none;
  }
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) minmax(110px, 0.9fr) minmax(130px, 1fr) 34px;
  gap: 10px;
  align-items: start;
  padding: 6px 2px;
  border-bottom: 1px dashed #e8edf1;
  &:last-of-type {
    border-bottom: none;
  }
  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    border: 1px solid #e8edf1;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
  }
`;

const Spacer = styled.span`
  @media (max-width: 680px) {
    display: none;
  }
`;

const Holder = styled.div`
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const EmptyItemsNote = styled.p`
  color: #46617a;
  font-size: 0.9rem;
  margin: 4px 0 0;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(22, 72, 99, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const Dialog = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
`;

const DialogTitle = styled.h3`
  margin: 0 0 8px;
  color: #164863;
  font-size: 1.05rem;
`;

const DialogText = styled.p`
  margin: 0 0 16px;
  color: #333;
  font-size: 0.92rem;
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  button {
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.875rem;
    cursor: pointer;
    border: 1px solid #164863;
    background: white;
    color: #164863;
    &:hover {
      background: #eef3f7;
    }
    &.confirm {
      background: #b91c1c;
      border-color: #b91c1c;
      color: white;
      &:hover {
        background: #991b1b;
      }
    }
  }
`;

// ---------------------------------------------------------------------
// Confirmation dialog for destructive actions
// ---------------------------------------------------------------------
const ConfirmDialog = ({ title, message, confirmLabel, onConfirm, onCancel }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <Overlay onClick={onCancel}>
      <Dialog
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
        <DialogText id="confirm-dialog-desc">{message}</DialogText>
        <DialogActions>
          <button type="button" ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </DialogActions>
      </Dialog>
    </Overlay>
  );
};

ConfirmDialog.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------
// Add Event
// ---------------------------------------------------------------------
const AddEvent = () => {
  const idCounter = useRef(0);
  const nextId = (prefix) => `${prefix}-${++idCounter.current}`;
  const makeItem = () => ({ id: nextId('item'), name: '', quantity: '', type: '' });
  const makeMeal = () => ({ id: nextId('meal'), mealType: '', items: [makeItem()] });

  const [eventName, setEventName] = useState('');
  const [institution, setInstitution] = useState('');
  const [eventDate, setEventDate] = useState(null);
  const [day, setDay] = useState('');
  const [noOfPeople, setNoOfPeople] = useState('');
  const [mealSections, setMealSections] = useState(() => [makeMeal()]);
  const [errors, setErrors] = useState({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [institutions, setInstitutions] = useState(FALLBACK_INSTITUTIONS);
  const [eventItems, setEventItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  const fieldRefs = useRef({});
  const dateWrapRef = useRef(null);
  const mealsHeadingRef = useRef(null);
  const setFieldRef = (key) => (el) => {
    fieldRefs.current[key] = el;
  };

  // Approved institutions: prefer the live configuration source when it
  // responds, keep the approved fallback list otherwise.
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/attendance/config`)
      .then((res) => {
        if (cancelled) return;
        const names = (res?.data?.institutions || [])
          .map((inst) => inst?.name)
          .filter((n) => typeof n === 'string' && n.trim() !== '');
        if (names.length > 0) setInstitutions(names);
      })
      .catch(() => {
        // keep the approved fallback list
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEventItems = () => {
    setItemsLoading(true);
    setItemsError('');
    axios
      .get(`${API_URL}/event/items`)
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        setEventItems(data);
        setItemsLoading(false);
      })
      .catch(() => {
        setItemsError('Could not load event items.');
        setItemsLoading(false);
      });
  };

  useEffect(() => {
    loadEventItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddNewItem = (mealId, itemId, newItemName) => {
    const trimmed = newItemName.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // Check locally first to avoid unnecessary network call
    const existing = eventItems.find(
      (it) => it.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      changeItem(mealId, itemId, 'name', existing.name);
      return;
    }

    setAddingItem(true);
    axios
      .post(`${API_URL}/event/items`, { name: trimmed })
      .then((res) => {
        const created = res?.data?.item;
        if (created && created.name) {
          setEventItems((prev) => {
            const exists = prev.some((it) => it.id === created.id || it.name.toLowerCase() === created.name.toLowerCase());
            return exists ? prev : [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
          });
          changeItem(mealId, itemId, 'name', created.name);
          toast.success(`Event item "${created.name}" added successfully!`);
        }
      })
      .catch((err) => {
        if (err.response?.status === 409) {
          const existingItem = err.response?.data?.item;
          const matchedName = existingItem?.name || trimmed;
          changeItem(mealId, itemId, 'name', matchedName);
          toast.info(err.response?.data?.message || `"${matchedName}" already exists.`);
          if (existingItem) {
            setEventItems((prev) => {
              const exists = prev.some((it) => it.id === existingItem.id);
              return exists ? prev : [...prev, existingItem].sort((a, b) => a.name.localeCompare(b.name));
            });
          }
        } else {
          const errMsg = err.response?.data?.message || 'Failed to create event item.';
          toast.error(errMsg);
        }
      })
      .finally(() => {
        setAddingItem(false);
      });
  };

  const itemOptions = useMemo(
    () =>
      eventItems.map((s) => ({
        value: s.name,
        label: s.name,
      })),
    [eventItems]
  );

  const institutionOptions = useMemo(
    () => institutions.map((name) => ({ value: name, label: name })),
    [institutions]
  );

  // Derive the day from the selected date. dayjs formats in local time,
  // so the weekday always matches the picked calendar date.
  const handleDateChange = (newValue) => {
    setEventDate(newValue);
    if (newValue && dayjs.isDayjs(newValue) && newValue.isValid()) {
      setDay(newValue.format('dddd'));
    } else {
      setDay('');
    }
    revalidate({ eventDate: newValue });
  };

  const handlePeopleChange = (e) => {
    if (e.target.validity && e.target.validity.badInput) return;
    const v = e.target.value;
    if (v === '' || /^\d+$/.test(v)) {
      setNoOfPeople(v);
      revalidate({ noOfPeople: v });
    }
  };

  const revalidate = (next) => {
    if (!attemptedSubmit) return;
    setErrors(
      validateState({
        eventName,
        institution,
        eventDate,
        noOfPeople,
        mealSections,
        ...next,
      })
    );
  };

  // ----- meal / item state helpers (stable ids, explicit next state) -----
  const addMeal = () => {
    const next = [...mealSections, makeMeal()];
    setMealSections(next);
    revalidate({ mealSections: next });
  };

  const changeMealType = (mealId, value) => {
    const next = mealSections.map((m) =>
      m.id === mealId ? { ...m, mealType: value } : m
    );
    setMealSections(next);
    revalidate({ mealSections: next });
  };

  const addItem = (mealId) => {
    const next = mealSections.map((m) =>
      m.id === mealId ? { ...m, items: [...m.items, makeItem()] } : m
    );
    setMealSections(next);
    revalidate({ mealSections: next });
  };

  const changeItem = (mealId, itemId, field, value) => {
    const next = mealSections.map((m) =>
      m.id === mealId
        ? {
            ...m,
            items: m.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)),
          }
        : m
    );
    setMealSections(next);
    revalidate({ mealSections: next });
  };

  const removeItem = (mealId, itemId) => {
    const next = mealSections.map((m) =>
      m.id === mealId ? { ...m, items: m.items.filter((it) => it.id !== itemId) } : m
    );
    setMealSections(next);
    revalidate({ mealSections: next });
  };

  const removeMeal = (mealId) => {
    const next = mealSections.filter((m) => m.id !== mealId);
    setMealSections(next);
    revalidate({ mealSections: next });
  };

  const requestDeleteMeal = (section) => {
    if (isBlankMeal(section)) {
      removeMeal(section.id);
    } else {
      setPendingDelete({
        kind: 'meal',
        mealId: section.id,
        label: section.mealType || 'this meal',
      });
    }
  };

  const requestDeleteItem = (section, item) => {
    if (isBlankItem(item)) {
      removeItem(section.id, item.id);
    } else {
      setPendingDelete({
        kind: 'item',
        mealId: section.id,
        itemId: item.id,
        label: item.name || 'this item',
      });
    }
  };

  const focusFirstError = (errs) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    if (firstKey === 'eventDate') {
      const input = dateWrapRef.current?.querySelector('input');
      input?.focus();
      input?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (firstKey === 'meals') {
      mealsHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const el = fieldRefs.current[firstKey];
    if (el) {
      el.focus();
      el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  };

  const resetForm = () => {
    setEventName('');
    setInstitution('');
    setEventDate(null);
    setDay('');
    setNoOfPeople('');
    setMealSections([makeMeal()]);
    setErrors({});
    setAttemptedSubmit(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;

    setAttemptedSubmit(true);
    const errs = validateState({
      eventName,
      institution,
      eventDate,
      noOfPeople,
      mealSections,
    });
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      toast.error('Please fix the highlighted fields before submitting.');
      return;
    }

    const payload = {
      event_name: eventName.trim(),
      institution,
      event_date: eventDate.format('YYYY-MM-DD'),
      day,
      no_of_people: Number(noOfPeople),
      meal_details: mealSections.map((section) => ({
        mealType: section.mealType,
        items: section.items.map((item) => ({
          name: item.name,
          quantity: String(Number(String(item.quantity).trim())),
          type: item.type,
        })),
      })),
    };

    setSubmitting(true);
    axios
      .post(`${API_URL}/event/addevent`, payload)
      .then(() => {
        toast.success('Event added successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        resetForm();
      })
      .catch((error) => {
        const serverMessage =
          error?.response?.data?.message || error?.response?.data?.error;
        toast.error(
          typeof serverMessage === 'string' && serverMessage
            ? serverMessage
            : 'There was an error submitting the form. Please try again.'
        );
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <>
      <Form onSubmit={handleSubmit} noValidate>
        <Section>
          <Heading>Event Details</Heading>
          <EventDetailsGrid>
            <FieldGroup>
              <Label htmlFor="event-name">Event Name:</Label>
              <Input
                id="event-name"
                type="text"
                name="eventName"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  revalidate({ eventName: e.target.value });
                }}
                aria-invalid={Boolean(errors.eventName)}
                aria-describedby={errors.eventName ? 'error-eventName' : undefined}
                ref={setFieldRef('eventName')}
              />
              {errors.eventName && (
                <FieldError id="error-eventName" role="alert">
                  {errors.eventName}
                </FieldError>
              )}
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="institution-input">Institution:</Label>
              <SearchableSelect
                id="institution-input"
                options={institutionOptions}
                value={institution}
                onChange={(value) => {
                  setInstitution(value);
                  revalidate({ institution: value });
                }}
                placeholder="Search institution…"
                ariaLabel="Institution"
                required
                error={errors.institution}
                emptyMessage="No institution matches your search"
                inputRef={setFieldRef('institution')}
              />
            </FieldGroup>

            <FieldGroup>
              <Label id="event-date-label">Date:</Label>
              <div ref={dateWrapRef} role="group" aria-labelledby="event-date-label">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={eventDate}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        id: 'event-date-input',
                        fullWidth: true,
                        error: Boolean(errors.eventDate),
                        helperText: errors.eventDate || undefined,
                        FormHelperTextProps: { role: 'alert' },
                        inputProps: { 'aria-label': 'Event date' },
                      },
                    }}
                  />
                </LocalizationProvider>
              </div>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="event-day">Day:</Label>
              <Input
                id="event-day"
                type="text"
                value={day}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
                aria-label="Day (calculated automatically from the selected date)"
                placeholder="Auto-filled from date"
              />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="no-of-people">Number of People:</Label>
              <Input
                id="no-of-people"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={noOfPeople}
                onChange={handlePeopleChange}
                aria-invalid={Boolean(errors.noOfPeople)}
                aria-describedby={errors.noOfPeople ? 'error-noOfPeople' : undefined}
                ref={setFieldRef('noOfPeople')}
              />
              {errors.noOfPeople && (
                <FieldError id="error-noOfPeople" role="alert">
                  {errors.noOfPeople}
                </FieldError>
              )}
            </FieldGroup>
          </EventDetailsGrid>
        </Section>

        <Section>
          <SectionTitle ref={mealsHeadingRef}>Meal Details</SectionTitle>
          {errors.meals && (
            <FormError role="alert">{errors.meals}</FormError>
          )}
          {mealSections.map((section) => (
            <MealSection
              key={section.id}
              role="group"
              aria-label={`Meal section: ${section.mealType || 'Unnamed meal'}`}
            >
              <MealHeader>
                <MealTypeGroup>
                  <Label htmlFor={`meal-type-${section.id}`}>Meal Type:</Label>
                  <Select
                    id={`meal-type-${section.id}`}
                    value={section.mealType}
                    onChange={(e) => changeMealType(section.id, e.target.value)}
                    $invalid={Boolean(errors[`${section.id}-mealType`])}
                    aria-invalid={Boolean(errors[`${section.id}-mealType`])}
                    aria-describedby={
                      errors[`${section.id}-mealType`]
                        ? `error-${section.id}-mealType`
                        : undefined
                    }
                    ref={setFieldRef(`${section.id}-mealType`)}
                  >
                    <option value="">Select Meal Type</option>
                    {MEAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                  {errors[`${section.id}-mealType`] && (
                    <FieldError id={`error-${section.id}-mealType`} role="alert">
                      {errors[`${section.id}-mealType`]}
                    </FieldError>
                  )}
                </MealTypeGroup>
                <ItemCount>
                  {section.items.length} item{section.items.length === 1 ? '' : 's'}
                </ItemCount>
                <Button type="button" onClick={() => addItem(section.id)}>
                  Add Item
                </Button>
                <DangerButton type="button" onClick={() => requestDeleteMeal(section)}>
                  Delete Meal
                </DangerButton>
              </MealHeader>

              <ItemHeaderRow aria-hidden="true">
                <span>Item</span>
                <span>Quantity</span>
                <span>Type</span>
                <Spacer />
              </ItemHeaderRow>

              {section.items.map((item, itemIdx) => (
                <ItemRow key={item.id}>
                  <FieldGroup>
                    <SearchableSelect
                      options={itemOptions}
                      value={item.name}
                      loading={itemsLoading}
                      loadError={itemsError}
                      onRetry={loadEventItems}
                      onChange={(value) => changeItem(section.id, item.id, 'name', value)}
                      onAddNew={(typedName) => handleAddNewItem(section.id, item.id, typedName)}
                      adding={addingItem}
                      placeholder="Search event item…"
                      ariaLabel={`Item ${itemIdx + 1} in ${section.mealType || 'meal'}`}
                      required
                      error={errors[`${item.id}-name`]}
                      emptyMessage="No event item matches your search"
                      inputRef={setFieldRef(`${item.id}-name`)}
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      placeholder="Qty"
                      aria-label={`Quantity for item ${itemIdx + 1} in ${section.mealType || 'meal'}`}
                      value={item.quantity}
                      onChange={(e) => {
                        if (e.target.validity && e.target.validity.badInput) return;
                        changeItem(
                          section.id,
                          item.id,
                          'quantity',
                          cleanQuantity(e.target.value)
                        );
                      }}
                      $invalid={Boolean(errors[`${item.id}-quantity`])}
                      aria-invalid={Boolean(errors[`${item.id}-quantity`])}
                      aria-describedby={
                        errors[`${item.id}-quantity`]
                          ? `error-${item.id}-quantity`
                          : undefined
                      }
                      ref={setFieldRef(`${item.id}-quantity`)}
                    />
                    {errors[`${item.id}-quantity`] && (
                      <FieldError id={`error-${item.id}-quantity`} role="alert">
                        {errors[`${item.id}-quantity`]}
                      </FieldError>
                    )}
                  </FieldGroup>
                  <FieldGroup>
                    <Select
                      value={item.type}
                      onChange={(e) => changeItem(section.id, item.id, 'type', e.target.value)}
                      aria-label={`Type for item ${itemIdx + 1} in ${section.mealType || 'meal'}`}
                      $invalid={Boolean(errors[`${item.id}-type`])}
                      aria-invalid={Boolean(errors[`${item.id}-type`])}
                      aria-describedby={
                        errors[`${item.id}-type`] ? `error-${item.id}-type` : undefined
                      }
                      ref={setFieldRef(`${item.id}-type`)}
                    >
                      <option value="">Select Type</option>
                      {ITEM_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                    {errors[`${item.id}-type`] && (
                      <FieldError id={`error-${item.id}-type`} role="alert">
                        {errors[`${item.id}-type`]}
                      </FieldError>
                    )}
                  </FieldGroup>
                  <RemoveRowButton
                    type="button"
                    aria-label={`Remove item ${itemIdx + 1} from ${section.mealType || 'meal'}`}
                    onClick={() => requestDeleteItem(section, item)}
                  >
                    ✕
                  </RemoveRowButton>
                </ItemRow>
              ))}

              {itemsError && !itemsLoading && (
                <EmptyItemsNote role="alert">
                  Event items could not be loaded. Existing selections are kept — use
                  Retry on any item field to load the list again.
                </EmptyItemsNote>
              )}
            </MealSection>
          ))}
        </Section>

        <Holder>
          <Button type="button" onClick={addMeal}>
            Add Meal Type
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </Holder>
      </Form>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === 'meal' ? 'Delete this meal?' : 'Remove this item?'}
          message={
            pendingDelete.kind === 'meal'
              ? `"${pendingDelete.label}" and all of its items will be removed from this event.`
              : `"${pendingDelete.label}" will be removed from this event.`
          }
          confirmLabel={pendingDelete.kind === 'meal' ? 'Delete Meal' : 'Remove Item'}
          onConfirm={() => {
            if (pendingDelete.kind === 'meal') {
              removeMeal(pendingDelete.mealId);
            } else {
              removeItem(pendingDelete.mealId, pendingDelete.itemId);
            }
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <ToastContainer />
    </>
  );
};

export default AddEvent;
