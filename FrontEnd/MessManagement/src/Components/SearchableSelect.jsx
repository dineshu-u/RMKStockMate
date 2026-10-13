import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { FaChevronDown, FaTimes } from 'react-icons/fa';

// Lightweight, keyboard-accessible searchable select (combobox) used for the
// Institution and stock Item fields on the Add Event form.
//
// Deliberately dependency-free: the app already ships styled-components and
// react-icons but does not use @mui/material anywhere, so importing a heavy
// Autocomplete component for two fields would be out of place.

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
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const results = useMemo(() => {
    if (filterFn) return filterFn(options, query);
    const filtered = defaultFilter(options, query);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [options, query, filterFn, limit]);

  // The text shown in the box: what the user is typing while the list is open,
  // otherwise the label of the current selection.
  const inputText = open ? query : selected?.label ?? '';
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
    onChange(option.value);
    closeList();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    const count = results.length;
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
        commit(results[activeIndex]);
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
            showPopup && results.length ? `${id}-option-${activeIndex}` : undefined
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
        {clearable && selected && !disabled && (
          <IconButton
            type="button"
            aria-label="Clear selection"
            tabIndex={-1}
            onClick={() => {
              onChange('');
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

          {!loading && !loadError && results.length === 0 && (
            <StatusRow>
              {options.length === 0 ? 'No options available.' : 'No matches found.'}
            </StatusRow>
          )}

          {!loading &&
            !loadError &&
            results.map((option, index) => (
              <Option
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                $active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(option)}
              >
                <span className="label">{option.label}</span>
                {option.meta ? <span className="meta">{option.meta}</span> : null}
              </Option>
            ))}
        </Popup>
      )}
    </Wrapper>
  );
};

export default SearchableSelect;
