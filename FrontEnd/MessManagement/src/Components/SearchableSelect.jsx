import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { FaChevronDown, FaPlus, FaTimes } from 'react-icons/fa';

// Lightweight, keyboard-accessible searchable select (combobox) used for the
// Institution and event Item fields on the Add Event form.
//
// Deliberately dependency-free: the app already ships styled-components and
// react-icons but does not use @mui/material anywhere, so importing a heavy
// Autocomplete component for two fields would be out of place.
//
// It can optionally offer a "+ Add \"...\"" action as the last row of the list
// (see allowCreate / onCreateNew), which only appears while the typed query has
// no exact match in the loaded options.

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Control = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid ${(p) => (p.$invalid ? '#d9534f' : '#ccc')};
  border-radius: 4px;
  background: white;

  &:focus-within {
    border-color: #007bff;
    box-shadow: 0 0 5px #164863;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  padding: 10px;
  font-size: 1rem;
  background: transparent;
  color: #164863;

  &:disabled {
    background: #f4f4f4;
    cursor: not-allowed;
  }
`;

// Selected-value chips shown inside the control when `multiple` is enabled.
const Chips = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 5px 6px;
  min-width: 0;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #e8f1f7;
  color: #164863;
  border-radius: 14px;
  padding: 3px 8px 3px 10px;
  font-size: 0.8rem;
  white-space: nowrap;

  button {
    border: none;
    background: transparent;
    color: #164863;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    font-size: 0.72rem;

    &:hover {
      color: #b00020;
    }
  }
`;

const IconButton = styled.button`
  border: none;
  background: transparent;
  color: #164863;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  font-size: 0.85rem;

  &:hover {
    color: #1d4f6f;
  }
`;

const Popup = styled.ul`
  position: absolute;
  z-index: 30;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
`;

const Option = styled.li`
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: ${(p) => (p.$active ? '#e8f1f7' : 'transparent')};

  .label {
    color: #164863;
    font-size: 0.95rem;
  }

  .meta {
    color: #64748b;
    font-size: 0.78rem;
  }
`;

const StatusRow = styled.li`
  padding: 10px;
  color: #64748b;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;

  button {
    border: 1px solid #164863;
    background: white;
    color: #164863;
    border-radius: 14px;
    padding: 3px 12px;
    font-size: 0.8rem;
    cursor: pointer;
  }
`;

// Same normalization the catalogue uses (trim + collapse internal whitespace) so
// the "already exists" decision cannot disagree with the server's duplicate rule.
const normalizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const CreateRow = styled.li`
  padding: 9px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #164863;
  font-size: 0.92rem;
  font-weight: 700;
  border-top: 1px solid #ecf2f6;
  background: ${(p) => (p.$active ? '#e8f1f7' : 'transparent')};

  svg {
    flex-shrink: 0;
  }
`;

const defaultFilter = (options, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) || String(o.meta ?? '').toLowerCase().includes(q)
  );
};

const SearchableSelect = ({
  id,
  value,
  onChange,
  multiple = false,
  options = [],
  placeholder = 'Select',
  disabled = false,
  invalid = false,
  describedBy,
  required = false,
  loading = false,
  loadError = '',
  onRetry,
  filterFn,
  limit,
  clearable = true,
  allowCreate = false,
  onCreateNew,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // In single mode `value` is one option value; in multiple mode it is an array.
  const selectedValues = useMemo(
    () => (multiple ? (Array.isArray(value) ? value : []) : value ? [value] : []),
    [multiple, value]
  );
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedValues.includes(o.value)),
    [options, selectedValues]
  );

  const results = useMemo(() => {
    if (filterFn) return filterFn(options, query);
    const filtered = defaultFilter(options, query);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [options, query, filterFn, limit]);

  const cleanQuery = normalizeText(query);

  // Offer the create action only when the typed name is genuinely missing: a
  // query that already matches an option exactly must not prompt a duplicate.
  const hasExactMatch = useMemo(() => {
    const target = cleanQuery.toLowerCase();
    return options.some((option) => normalizeText(option.label).toLowerCase() === target);
  }, [options, cleanQuery]);

  const showCreate = Boolean(allowCreate && onCreateNew && cleanQuery) && !hasExactMatch;

  // Keyboard navigation spans the result rows plus the optional create row.
  const optionCount = results.length + (showCreate ? 1 : 0);
  const activeRow = optionCount === 0 ? 0 : Math.min(activeIndex, optionCount - 1);

  // The text shown in the box: what the user is typing while the list is open,
  // otherwise the label of the current selection.
  const inputText = open ? query : multiple ? '' : selected?.label ?? '';
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const openList = () => {
    if (disabled) return;
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  };

  const closeList = () => {
    setOpen(false);
    setQuery('');
  };

  const commit = (option) => {
    if (!option) return;
    if (multiple) {
      const already = selectedValues.includes(option.value);
      onChange(
        already
          ? selectedValues.filter((v) => v !== option.value)
          : [...selectedValues, option.value]
      );
      // Keep the list open so several options can be picked in one go.
      setQuery('');
      setActiveIndex(0);
      inputRef.current?.focus();
      return;
    }
    onChange(option.value);
    closeList();
  };

  // Removes one chip (multiple mode) or clears the single selection.
  const removeValue = (val) => {
    onChange(multiple ? selectedValues.filter((v) => v !== val) : '');
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    const count = optionCount;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (count === 0) return;
      setActiveIndex((prev) => {
        const next = event.key === 'ArrowDown' ? prev + 1 : prev - 1;
        return (next + count) % count;
      });
      return;
    }
    if (event.key === 'Enter') {
      if (open) {
        event.preventDefault();
        if (showCreate && activeRow === results.length) {
          onCreateNew(cleanQuery);
          closeList();
          return;
        }
        commit(results[activeRow]);
      }
      return;
    }
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        closeList();
      }
      return;
    }
    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    }
    if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(Math.max(count - 1, 0));
    }
  };

  const showPopup = open;

  return (
    <Wrapper ref={wrapperRef}>
      <Control $invalid={invalid}>
        {multiple && selectedOptions.length > 0 && (
          <Chips>
            {selectedOptions.map((option) => (
              <Chip key={option.value}>
                {option.label}
                <button
                  type="button"
                  aria-label={`Remove ${option.label}`}
                  tabIndex={-1}
                  onClick={() => removeValue(option.value)}
                >
                  <FaTimes />
                </button>
              </Chip>
            ))}
          </Chips>
        )}
        <SearchInput
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showPopup}
          aria-controls={showPopup ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showPopup && optionCount
              ? activeRow === results.length && showCreate
                ? `${id}-create`
                : `${id}-option-${activeRow}`
              : undefined
          }
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={inputText}
          onFocus={openList}
          onClick={() => {
            if (!open) openList();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay so an option click is not swallowed; keyboard users keep the list open.
            window.setTimeout(() => {
              if (wrapperRef.current && !wrapperRef.current.contains(document.activeElement)) {
                closeList();
              }
            }, 120);
          }}
        />
        {clearable && !disabled && (multiple ? selectedValues.length > 0 : selected) && (
          <IconButton
            type="button"
            aria-label="Clear selection"
            tabIndex={-1}
            onClick={() => {
              onChange(multiple ? [] : '');
              closeList();
              inputRef.current?.focus();
            }}
          >
            <FaTimes />
          </IconButton>
        )}
        <IconButton
          type="button"
          aria-label={showPopup ? 'Close list' : 'Open list'}
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (showPopup) {
              closeList();
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
        >
          <FaChevronDown />
        </IconButton>
      </Control>

      {showPopup && (
        <Popup id={listboxId} role="listbox" aria-label={placeholder}>
          {loading && <StatusRow>Loading…</StatusRow>}

          {!loading && loadError && (
            <StatusRow>
              <span role="alert">{loadError}</span>
              {onRetry && (
                <button type="button" onClick={onRetry}>
                  Retry
                </button>
              )}
            </StatusRow>
          )}

          {!loading && !loadError && results.length === 0 && !showCreate && (
            <StatusRow>
              {options.length === 0
                ? 'No options available yet.'
                : 'No matches found. Check the spelling, or type a new item name.'}
            </StatusRow>
          )}

          {!loading &&
            !loadError &&
            results.map((option, index) => (
              <Option
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={
                  multiple ? selectedValues.includes(option.value) : option.value === value
                }
                $active={index === activeRow}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(option)}
              >
                <span className="label">{option.label}</span>
                {option.meta ? <span className="meta">{option.meta}</span> : null}
              </Option>
            ))}

          {!loading && !loadError && showCreate && (
            <CreateRow
              id={`${id}-create`}
              role="option"
              aria-selected={false}
              $active={activeRow === results.length}
              onMouseEnter={() => setActiveIndex(results.length)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onCreateNew(cleanQuery);
                closeList();
              }}
            >
              <FaPlus aria-hidden="true" />
              <span>Add “{cleanQuery}”</span>
            </CreateRow>
          )}
        </Popup>
      )}
    </Wrapper>
  );
};

export default SearchableSelect;
