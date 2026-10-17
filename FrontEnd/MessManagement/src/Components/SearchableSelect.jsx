import { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Control = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid ${(props) => (props.$invalid ? '#d32f2f' : '#ccc')};
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  &:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 5px #164863;
  }
  &:disabled {
    background: #f4f4f4;
    cursor: not-allowed;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 6px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  &:hover {
    color: #164863;
  }
`;

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 260px;
  overflow-y: auto;
`;

const Option = styled.li`
  padding: 8px 10px;
  cursor: pointer;
  font-size: 0.95rem;
  color: #333;
  &[aria-selected='true'] {
    background: #e8f0fe;
    color: #164863;
    font-weight: 600;
  }
  &[aria-active='true'] {
    background: #d7e6f7;
  }
`;

const OptionMeta = styled.span`
  display: block;
  font-size: 0.78rem;
  color: #6b7a86;
  font-weight: 400;
  margin-top: 2px;
`;

const AddOption = styled.li`
  padding: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  color: #164863;
  font-weight: 600;
  border-top: 1px dashed #c9d6df;
  background: #f7fafc;
  display: flex;
  align-items: center;
  gap: 6px;
  &:hover,
  &[aria-active='true'] {
    background: #e8f0fe;
    color: #0b3954;
  }
  &[aria-disabled='true'] {
    cursor: wait;
    opacity: 0.7;
  }
`;

const StatusItem = styled.li`
  padding: 10px;
  font-size: 0.9rem;
  color: #555;
  cursor: default;
  text-align: center;
`;

const ErrorItem = styled.li`
  padding: 10px;
  font-size: 0.9rem;
  color: #d32f2f;
  cursor: default;
  text-align: center;
`;

const RetryButton = styled.button`
  display: inline-block;
  margin-top: 6px;
  padding: 4px 12px;
  border: 1px solid #164863;
  background: white;
  color: #164863;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  &:hover {
    background: #164863;
    color: white;
  }
`;

const ErrorText = styled.span`
  color: #d32f2f;
  font-size: 0.85rem;
  margin-top: 4px;
  font-weight: 600;
`;

/**
 * Lightweight accessible searchable dropdown (WAI-ARIA combobox pattern).
 *
 * Props:
 *  - options: [{ value, label, meta }]   (value must be unique)
 *  - value: currently selected value ('' when none)
 *  - onChange(value)
 *  - loading / loadError / onRetry  → loading, error and retry states
 *  - emptyMessage → shown when no option matches the query
 *  - error → inline validation message (field-level)
 *  - placeholder, disabled, required
 */
const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Search…',
  loading = false,
  loadError = '',
  onRetry,
  emptyMessage = 'No matches found',
  error = '',
  disabled = false,
  required = false,
  name,
  ariaLabel,
  id,
  inputRef: externalInputRef,
  onAddNew,
  adding = false,
}) => {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const inputId = id || `${uid}-input`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const activeOptionRef = useRef(null);
  const inputRefObj = useRef(null);

  const setRefs = (el) => {
    inputRefObj.current = el;
    if (externalInputRef) {
      externalInputRef.current = el;
    }
  };

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.meta && opt.meta.toLowerCase().includes(q))
    );
  }, [options, query]);

  const trimmedQuery = query.trim().replace(/\s+/g, ' ');
  const exactMatchExists = useMemo(() => {
    if (!trimmedQuery) return false;
    const lower = trimmedQuery.toLowerCase();
    return options.some((opt) => opt.label.trim().toLowerCase() === lower || opt.value.trim().toLowerCase() === lower);
  }, [options, trimmedQuery]);

  const showAddOption = Boolean(onAddNew && trimmedQuery && !exactMatchExists && !loading && !loadError);

  const totalItemsCount = filtered.length + (showAddOption ? 1 : 0);
  const addOptionIndex = showAddOption ? filtered.length : -1;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (activeOptionRef.current) {
      activeOptionRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const openList = () => {
    if (disabled) return;
    setQuery('');
    setActiveIndex(options.length > 0 ? 0 : -1);
    setOpen(true);
  };

  const selectOption = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
    inputRefObj.current?.focus();
  };

  const handleAddNew = () => {
    if (!showAddOption || adding || !onAddNew) return;
    onAddNew(trimmedQuery);
    setOpen(false);
    setQuery('');
  };

  const clearSelection = () => {
    onChange('');
    setQuery('');
    inputRefObj.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          openList();
        } else {
          setActiveIndex((i) => {
            if (totalItemsCount === 0) return -1;
            const next = Math.min(i + 1, totalItemsCount - 1);
            return Math.max(next, 0);
          });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) {
          setActiveIndex((i) => Math.max(i - 1, 0));
        }
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActiveIndex(totalItemsCount > 0 ? 0 : -1);
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActiveIndex(totalItemsCount - 1);
        }
        break;
      case 'Enter':
        if (open && activeIndex >= 0) {
          e.preventDefault();
          if (activeIndex === addOptionIndex) {
            handleAddNew();
          } else if (filtered[activeIndex]) {
            selectOption(filtered[activeIndex]);
          }
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
          setQuery('');
        }
        break;
      default:
        break;
    }
  };

  const displayValue = open ? query : selectedOption ? selectedOption.label : '';
  const describedBy = error ? `${uid}-error` : undefined;

  return (
    <Wrapper ref={wrapperRef}>
      <Control>
        <StyledInput
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0
              ? activeIndex === addOptionIndex
                ? `${uid}-opt-add`
                : `${uid}-opt-${activeIndex}`
              : undefined
          }
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          aria-required={required}
          autoComplete="off"
          disabled={disabled || adding}
          placeholder={placeholder}
          value={displayValue}
          $invalid={Boolean(error)}
          ref={setRefs}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={handleKeyDown}
        />
        {!disabled && selectedOption && (
          <ClearButton
            type="button"
            tabIndex={-1}
            aria-label={`Clear ${ariaLabel || 'selection'}`}
            onClick={clearSelection}
          >
            ✕
          </ClearButton>
        )}
      </Control>
      {open && (
        <Dropdown id={listboxId} role="listbox" aria-label={ariaLabel}>
          {loading && <StatusItem role="status">Loading…</StatusItem>}
          {!loading && loadError && (
            <ErrorItem>
              {loadError}
              {onRetry && (
                <div>
                  <RetryButton type="button" onClick={onRetry}>
                    Retry
                  </RetryButton>
                </div>
              )}
            </ErrorItem>
          )}
          {!loading && !loadError && filtered.length === 0 && !showAddOption && (
            <StatusItem>{emptyMessage}</StatusItem>
          )}
          {!loading &&
            !loadError &&
            filtered.map((opt, index) => (
              <Option
                key={opt.value}
                id={`${uid}-opt-${index}`}
                role="option"
                aria-selected={opt.value === value}
                aria-active={index === activeIndex}
                ref={index === activeIndex ? activeOptionRef : null}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(opt)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {opt.label}
                {opt.meta && <OptionMeta>{opt.meta}</OptionMeta>}
              </Option>
            ))}
          {showAddOption && (
            <AddOption
              id={`${uid}-opt-add`}
              role="option"
              aria-selected="false"
              aria-active={activeIndex === addOptionIndex}
              aria-disabled={adding}
              ref={activeIndex === addOptionIndex ? activeOptionRef : null}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddNew}
              onMouseEnter={() => setActiveIndex(addOptionIndex)}
            >
              {adding ? `Adding "${trimmedQuery}"…` : `+ Add "${trimmedQuery}"`}
            </AddOption>
          )}
        </Dropdown>
      )}
      {error && (
        <ErrorText id={`${uid}-error`} role="alert">
          {error}
        </ErrorText>
      )}
    </Wrapper>
  );
};

export default SearchableSelect;

SearchableSelect.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      meta: PropTypes.string,
    })
  ),
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  loading: PropTypes.bool,
  loadError: PropTypes.string,
  onRetry: PropTypes.func,
  emptyMessage: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  name: PropTypes.string,
  ariaLabel: PropTypes.string,
  id: PropTypes.string,
  inputRef: PropTypes.shape({ current: PropTypes.any }),
  onAddNew: PropTypes.func,
  adding: PropTypes.bool,
};
