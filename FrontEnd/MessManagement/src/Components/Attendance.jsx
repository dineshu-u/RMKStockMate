import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { HashLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = `${import.meta.env.VITE_RMK_MESS_URL}/attendance`;

const Container = styled.div`
  max-width: 1250px;
  margin: 0 auto;
  padding: 10px 15px 40px;

  h1 {
    color: #164863;
    text-align: center;
    margin: 0 0 20px 0;
    font-size: 2.1rem;
    font-weight: 700;
  }
`;

const DateBar = styled.div`
  background: #ffffff;
  padding: 18px 22px;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;

  .label {
    font-weight: 700;
    color: #164863;
    font-size: 1rem;
  }

  .hint {
    font-size: 0.85rem;
    color: #64748b;
  }
`;

const TotalsBanner = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 6px solid ${props => (props.complete ? '#059669' : '#f59e0b')};
  border-radius: 10px;
  padding: 16px 22px;
  margin-bottom: 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);

  .grand-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  h2 {
    margin: 0;
    color: #164863;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .grand-value {
    font-size: 1.9rem;
    font-weight: 800;
    color: #164863;
  }

  .status-note {
    font-size: 0.88rem;
    font-weight: 600;
    color: ${props => (props.complete ? '#059669' : '#b45309')};
  }

  .category-totals {
    display: flex;
    gap: 26px;
    flex-wrap: wrap;
    margin-top: 10px;
  }

  .cat-block {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 16px;
    min-width: 110px;
    text-align: center;

    h4 {
      margin: 0 0 3px;
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
    }

    p {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: #164863;
    }
  }
`;

const EntryTableWrapper = styled.div`
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 18px;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const EntryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 780px;
  font-family: Arial, sans-serif;

  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: center;
    font-size: 13.5px;
  }

  th {
    background-color: #164863;
    color: white;
    font-weight: 700;
    font-size: 13px;
    white-space: nowrap;
  }

  td.inst-name {
    text-align: left;
    font-weight: 700;
    color: #164863;
    white-space: nowrap;
    background: #f8fafc;
  }

  td.inst-total {
    font-weight: 800;
    color: #164863;
    background: #f1f5f9;
  }

  td.na-cell {
    color: #94a3b8;
    font-size: 12px;
    background: #fafafa;
  }

  tfoot td {
    background: #e2e8f0;
    font-weight: 800;
    color: #164863;
  }

  tfoot td.row-label {
    text-align: left;
  }
`;

const CountInput = styled.input`
  width: 90px;
  padding: 7px 8px;
  border: 2px solid ${props => (props.$entered ? '#164863' : '#f59e0b')};
  border-radius: 6px;
  font-size: 0.95rem;
  text-align: center;
  font-weight: 600;
  color: #164863;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #4caf50;
    box-shadow: 0 0 6px rgba(76, 175, 80, 0.4);
  }

  &::placeholder {
    color: #f59e0b;
    font-weight: 500;
  }
`;

const SaveButton = styled.button`
  background-color: #164863;
  color: white;
  border: none;
  padding: 13px 34px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 700;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #0d3449;
  }

  &:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 60px;
`;

const ErrorBanner = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 14px 20px;
  border-radius: 8px;
  font-weight: 600;
  margin: 20px 0;
`;

const Attendance = () => {
  const [config, setConfig] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attDate, setAttDate] = useState(dayjs());
  const [values, setValues] = useState({});
  const [savedValues, setSavedValues] = useState({});
  const [savedDate, setSavedDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_URL}/config`)
      .then(response => {
        setConfig(response.data.institutions || []);
        setLoadingConfig(false);
      })
      .catch(error => {
        console.error('Error fetching attendance config:', error);
        setLoadError(error.response?.data?.message || 'Failed to load attendance configuration.');
        setLoadingConfig(false);
      });
  }, []);

  const cellKey = (instId, catId) => `${instId}_${catId}`;

  // All applicable (institution, category) pairs in column order
  const categoryColumns = useMemo(() => {
    const cols = [];
    const seen = new Set();
    config.forEach(inst =>
      inst.categories.forEach(cat => {
        if (!seen.has(cat.id)) {
          seen.add(cat.id);
          cols.push({ id: cat.id, name: cat.name });
        }
      })
    );
    return cols;
  }, [config]);

  const applicablePairs = useMemo(
    () => config.flatMap(inst => inst.categories.map(cat => cellKey(inst.id, cat.id))),
    [config]
  );

  const enteredCount = applicablePairs.filter(k => values[k] !== undefined && values[k] !== '').length;
  const missingCount = applicablePairs.length - enteredCount;
  const isComplete = applicablePairs.length > 0 && missingCount === 0;

  const institutionTotals = useMemo(
    () =>
      config.map(inst => ({
        id: inst.id,
        name: inst.name,
        total: inst.categories.reduce(
          (a, cat) => a + (parseInt(values[cellKey(inst.id, cat.id)] || '', 10) || 0),
          0
        ),
        complete: inst.categories.every(cat => {
          const v = values[cellKey(inst.id, cat.id)];
          return v !== undefined && v !== '';
        })
      })),
    [config, values]
  );

  const categoryTotals = useMemo(
    () =>
      categoryColumns.map(col => ({
        ...col,
        total: config.reduce(
          (a, inst) => a + (parseInt(values[cellKey(inst.id, col.id)] || '', 10) || 0),
          0
        )
      })),
    [config, categoryColumns, values]
  );

  const grandTotal = useMemo(
    () => institutionTotals.reduce((a, inst) => a + inst.total, 0),
    [institutionTotals]
  );

  const isDirty = useMemo(() => {
    const keys = new Set([...Object.keys(values), ...Object.keys(savedValues)]);
    for (const k of keys) {
      if ((values[k] || '') !== (savedValues[k] || '')) return true;
    }
    return false;
  }, [values, savedValues]);

  const hasAnySaved = savedDate === attDate.format('YYYY-MM-DD');

  // Warn before losing unsaved edits
  useEffect(() => {
    const handler = e => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const loadSavedDate = dateStr => {
    setLoadingDate(true);
    axios
      .get(`${API_URL}/date/${dateStr}`)
      .then(response => {
        const next = {};
        (response.data.records || []).forEach(r => {
          next[cellKey(r.institutionId, r.categoryId)] = String(r.headcount);
        });
        setValues(next);
        setSavedValues(next);
        setSavedDate(response.data.records && response.data.records.length > 0 ? dateStr : null);
        setLoadingDate(false);
      })
      .catch(error => {
        console.error('Error loading saved attendance:', error);
        toast.error(error.response?.data?.message || 'Failed to load saved attendance.');
        setLoadingDate(false);
      });
  };

  // Restore any saved records for the initially selected date
  useEffect(() => {
    loadSavedDate(attDate.format('YYYY-MM-DD'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = nv => {
    if (!nv) return;
    const dateStr = nv.format('YYYY-MM-DD');
    if (dateStr === attDate.format('YYYY-MM-DD')) return;
    if (isDirty && !window.confirm('You have unsaved attendance changes. Discard them and switch date?')) {
      return;
    }
    setAttDate(nv);
    loadSavedDate(dateStr);
  };

  const handleCountChange = (instId, catId, raw) => {
    // digits only - structurally rejects negatives, decimals and text
    const cleaned = raw.replace(/\D/g, '').slice(0, 7);
    setValues(prev => ({ ...prev, [cellKey(instId, catId)]: cleaned }));
  };

  const handleSave = () => {
    if (saving) return;
    if (applicablePairs.length === 0) {
      toast.error('Attendance is not configured.');
      return;
    }
    if (!isComplete) {
      toast.error(`Attendance is incomplete. ${missingCount} entry(ies) missing. Enter all counts (0 is valid).`);
      return;
    }
    const entries = config.flatMap(inst =>
      inst.categories.map(cat => ({
        institutionId: inst.id,
        categoryId: cat.id,
        headcount: parseInt(values[cellKey(inst.id, cat.id)], 10)
      }))
    );
    setSaving(true);
    axios
      .post(`${API_URL}/save`, { date: attDate.format('YYYY-MM-DD'), entries })
      .then(response => {
        toast.success(response.data.message || 'Attendance saved.');
        setSavedValues({ ...values });
        setSavedDate(attDate.format('YYYY-MM-DD'));
        setSaving(false);
      })
      .catch(error => {
        console.error('Error saving attendance:', error);
        toast.error(error.response?.data?.message || 'Failed to save attendance.');
        setSaving(false);
      });
  };

  if (loadingConfig) {
    return (
      <Container>
        <h1>Attendance</h1>
        <LoadingWrapper>
          <HashLoader color="#164863" size={60} />
        </LoadingWrapper>
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container>
        <h1>Attendance</h1>
        <ErrorBanner>{loadError}</ErrorBanner>
      </Container>
    );
  }

  return (
    <Container>
      <h1>Daily Attendance Entry</h1>

      <DateBar>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Attendance Date"
            value={attDate}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
        <span className="hint">
          {loadingDate
            ? 'Loading saved attendance...'
            : hasAnySaved
              ? 'Saved records for this date are loaded below - edit and save to update.'
              : 'No saved attendance for this date yet.'}
        </span>
      </DateBar>

      <TotalsBanner complete={isComplete}>
        <div className="grand-row">
          <h2>
            Total Headcount - All Institutions ({attDate.format('YYYY-MM-DD')})
          </h2>
          <div style={{ textAlign: 'right' }}>
            <div className="grand-value">{grandTotal.toLocaleString()}</div>
            <div className="status-note">
              {isComplete
                ? 'Complete - all applicable entries recorded'
                : `Incomplete - ${missingCount} of ${applicablePairs.length} entries missing (not final)`}
            </div>
          </div>
        </div>
        <div className="category-totals">
          {categoryTotals.map(col => (
            <div className="cat-block" key={col.id}>
              <h4>{col.name}</h4>
              <p>{col.total.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </TotalsBanner>

      <EntryTableWrapper>
        <EntryTable>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Institution</th>
              {categoryColumns.map(col => (
                <th key={col.id}>{col.name}</th>
              ))}
              <th>Institution Total</th>
            </tr>
          </thead>
          <tbody>
            {config.map(inst => (
              <tr key={inst.id}>
                <td className="inst-name">{inst.name}</td>
                {categoryColumns.map(col => {
                  const cat = inst.categories.find(c => c.id === col.id);
                  if (!cat) {
                    return (
                      <td className="na-cell" key={col.id} title="Category does not apply to this institution">
                        N/A
                      </td>
                    );
                  }
                  const key = cellKey(inst.id, col.id);
                  return (
                    <td key={col.id}>
                      <CountInput
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={7}
                        $entered={values[key] !== undefined && values[key] !== ''}
                        placeholder="—"
                        value={values[key] || ''}
                        onChange={e => handleCountChange(inst.id, col.id, e.target.value)}
                      />
                    </td>
                  );
                })}
                <td className="inst-total">
                  {institutionTotals.find(t => t.id === inst.id)?.total.toLocaleString() || '0'}
                  {!institutionTotals.find(t => t.id === inst.id)?.complete && ' *'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="row-label">ALL INSTITUTIONS TOTAL</td>
              {categoryTotals.map(col => (
                <td key={col.id}>{col.total.toLocaleString()}</td>
              ))}
              <td>{grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </EntryTable>
      </EntryTableWrapper>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, margin: '24px 0' }}>
        <SaveButton onClick={handleSave} disabled={saving || loadingDate}>
          {saving ? 'Saving...' : isDirty ? 'Save Attendance' : 'Saved - Save Again'}
        </SaveButton>
      </div>

      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        * marks institutions with missing entries. "—" placeholder = not entered yet (a blank is never saved as 0).
        Enter 0 explicitly where the count is zero.
      </p>

      <ToastContainer position="top-right" autoClose={4000} />
    </Container>
  );
};

export default Attendance;
