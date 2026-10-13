import React, { useState, useEffect, useRef } from 'react';
import ReactToPrint from 'react-to-print';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { HashLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Logo from '../assets/Logo.png';

const API_URL = `${import.meta.env.VITE_RMK_MESS_URL}/attendance`;

const Test = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
  z-index: 10;
  flex-wrap: wrap;
`;

const ReportContainer = styled.div`
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ActionButton = styled.button`
  background-color: #4caf50;
  border: none;
  color: white;
  padding: 12px 26px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;

  &:hover:not(:disabled) {
    background-color: #45a049;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ExportButton = styled.button`
  background-color: #2196f3;
  border: none;
  color: white;
  padding: 12px 26px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;

  &:hover:not(:disabled) {
    background-color: #1976d2;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  background-color: #ff9800;
  border: none;
  color: white;
  padding: 12px 26px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;

  &:hover:not(:disabled) {
    background-color: #f57c00;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ControlsBar = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 22px;
  width: 100%;
  max-width: 1250px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ViewTabs = styled.div`
  display: flex;
  gap: 10px;
`;

const TabButton = styled.button`
  padding: 9px 18px;
  border-radius: 6px;
  border: 1px solid ${props => (props.$active ? '#164863' : '#cbd5e1')};
  background-color: ${props => (props.$active ? '#164863' : '#f1f5f9')};
  color: ${props => (props.$active ? 'white' : '#475569')};
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    border-color: #164863;
  }
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;

  select {
    padding: 9px 12px;
    border: 2px solid #164863;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #164863;
    background: #f8fafc;
  }
`;

const PrintArea = styled.div`
  width: 100%;
  max-width: 1250px;
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;

  @media print {
    box-shadow: none;
    padding: 10px;
    max-width: 100%;
  }
`;

const PrintHeader = styled.div`
  display: none;
  text-align: center;
  margin-bottom: 15px;

  img {
    width: 140px;
    height: auto;
  }

  h1 {
    font-size: 24px;
    margin: 5px 0;
    color: #164863;
  }

  h2 {
    font-size: 18px;
    margin: 0 0 8px;
    color: #334155;
  }

  @media print {
    display: block;
  }
`;

const ScreenTitle = styled.h1`
  color: #164863;
  font-size: 1.6rem;
  margin: 0 0 16px;
  display: none;

  @media print {
    display: none;
  }
`;

const SummaryBanner = styled.div`
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 6px solid ${props => (props.$complete ? '#059669' : '#f59e0b')};
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  .title {
    font-weight: 700;
    color: #164863;
    font-size: 1.05rem;
  }

  .grand {
    font-size: 1.6rem;
    font-weight: 800;
    color: #164863;
  }

  .status {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${props => (props.$complete ? '#059669' : '#b45309')};
  }
`;

const ReportTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
  margin-bottom: 22px;

  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 8px;
    text-align: center;
    font-size: 13px;
  }

  th {
    background-color: #164863;
    color: white;
    font-weight: 700;
    white-space: nowrap;
  }

  td:first-child {
    text-align: left;
    font-weight: 700;
    color: #164863;
    white-space: nowrap;
    background: #f8fafc;
  }

  tr.total-row td {
    background: #e2e8f0;
    font-weight: 800;
    color: #164863;
  }

  tr.total-row td:first-child {
    text-align: left;
  }

  .na {
    color: #94a3b8;
    font-size: 12px;
  }

  .missing {
    color: #b45309;
    font-weight: 600;
  }

  .change-pos { color: #059669; font-weight: 700; }
  .change-neg { color: #dc2626; font-weight: 700; }

  @media print {
    th, td { font-size: 10px; padding: 4px 2px; }
  }
`;

const SectionHeading = styled.h3`
  color: #164863;
  margin: 18px 0 10px;
  border-bottom: 2px solid #164863;
  padding-bottom: 5px;
  font-size: 1.05rem;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: #64748b;
  padding: 40px;
  font-size: 1rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const FormGroup = styled.div`
  margin-bottom: 18px;

  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #334155;
    font-size: 0.9rem;
  }

  input, textarea {
    width: 100%;
    padding: 11px 13px;
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.95rem;
    box-sizing: border-box;
    font-family: inherit;
  }

  textarea { resize: vertical; min-height: 70px; }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  button {
    padding: 11px 22px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .cancel {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #475569;
  }

  .send {
    background: #164863;
    border: none;
    color: white;

    &:disabled { background: #94a3b8; cursor: not-allowed; }
  }
`;

const num = v => (v === null || v === undefined ? '' : Number(v).toLocaleString());

const PrintAttendanceReport = () => {
  const location = useLocation();
  const navState = location?.state || {};

  const contentRef = useRef(null);

  const [view, setView] = useState('daily');
  const [date, setDate] = useState(dayjs());
  const [fromDate, setFromDate] = useState(navState.fromDate ? dayjs(navState.fromDate) : dayjs().startOf('month'));
  const [toDate, setToDate] = useState(navState.toDate ? dayjs(navState.toDate) : dayjs());

  const [config, setConfig] = useState([]);
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('RMKStockMate - Attendance Report');
  const [message, setMessage] = useState('Please find attached the Attendance Report.');
  const [isSending, setIsSending] = useState(false);

  const allCategories = (() => {
    const seen = new Set();
    const list = [];
    config.forEach(inst =>
      inst.categories.forEach(cat => {
        if (!seen.has(cat.id)) {
          seen.add(cat.id);
          list.push({ id: cat.id, name: cat.name });
        }
      })
    );
    return list;
  })();

  useEffect(() => {
    axios
      .get(`${API_URL}/config`)
      .then(response => setConfig(response.data.institutions || []))
      .catch(error => {
        console.error('Error fetching attendance config:', error);
        toast.error(error.response?.data?.message || 'Failed to load attendance configuration.');
      });
  }, []);

  const buildParams = () => {
    const params = {};
    if (institutionFilter) params.institutionId = institutionFilter;
    if (categoryFilter) params.categoryId = categoryFilter;
    return params;
  };

  const fetchReport = (opts = {}) => {
    const v = opts.view || view;
    let url;
    const params = { ...buildParams(), ...(opts.params || {}) };

    if (v === 'daily') {
      const d = opts.date || date;
      if (!d) {
        toast.error('Please select a date.');
        return;
      }
      url = `${API_URL}/report/daily`;
      params.date = dayjs(d).format('YYYY-MM-DD');
    } else {
      const f = opts.from || fromDate;
      const t = opts.to || toDate;
      if (!f || !t) {
        toast.error('Please select both From and To dates.');
        return;
      }
      const fromStr = dayjs(f).format('YYYY-MM-DD');
      const toStr = dayjs(t).format('YYYY-MM-DD');
      if (fromStr > toStr) {
        toast.error('From date must be on or before To date.');
        return;
      }
      url = `${API_URL}/report/${v === 'range' ? 'range' : 'monthly'}`;
      params.from = fromStr;
      params.to = toStr;
    }

    setLoading(true);
    axios
      .get(url, { params })
      .then(response => {
        setReportData({ view: v, ...response.data });
        setLastFetch({ view: v, params });
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching attendance report:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch attendance report.');
        setReportData(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (config.length > 0) {
      fetchReport({ view: 'daily', date: dayjs() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleViewChange = v => {
    setView(v);
    if (config.length > 0) fetchReport({ view: v });
  };

  // ---------------- Export to Excel ----------------

  const handleExport = () => {
    if (!contentRef.current) return;
    const tables = contentRef.current.querySelectorAll('table');
    if (tables.length === 0) {
      toast.warning('No report data available to export');
      return;
    }
    const wb = XLSX.utils.book_new();
    tables.forEach((table, idx) => {
      let sheetName = table.closest('[data-sheetname]')?.getAttribute('data-sheetname') || `Sheet_${idx + 1}`;
      sheetName = sheetName.replace(/[\\/*?:[\]]/g, '').slice(0, 31);
      if (wb.SheetNames.includes(sheetName)) {
        const base = sheetName.slice(0, 27);
        let n = 2;
        while (wb.SheetNames.includes(`${base}_${n}`)) n += 1;
        sheetName = `${base}_${n}`;
      }
      const ws = XLSX.utils.table_to_sheet(table);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Attendance_Report.xlsx');
  };

  // ---------------- Send by email ----------------

  const openSendModal = () => {
    if (!reportData) {
      toast.error('Fetch a report first.');
      return;
    }
    setSubject(`RMKStockMate - Attendance Report (${view})`);
    setIsSendModalOpen(true);
  };

  const handleSendReport = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!lastFetch) {
      toast.error('Fetch a report first.');
      return;
    }
    setIsSending(true);
    try {
      // Send with the exact parameters of the last fetch so the emailed PDF
      // always matches the displayed report
      const params = {
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
        reportType: lastFetch.view,
        ...lastFetch.params
      };

      await axios.post(`${API_URL}/send-report`, params);
      toast.success(`Report sent successfully to ${recipientEmail}`);
      setIsSendModalOpen(false);
      setRecipientEmail('');
    } catch (error) {
      console.error('Error sending attendance report:', error);
      toast.error(error.response?.data?.message || 'Failed to send report.');
    } finally {
      setIsSending(false);
    }
  };

  // ---------------- Renderers ----------------

  const renderDaily = data => {
    const catIds = [];
    const catNames = {};
    data.institutions.forEach(inst =>
      inst.categories.forEach(cat => {
        if (catNames[cat.id] === undefined) {
          catNames[cat.id] = cat.name;
          catIds.push(cat.id);
        }
      })
    );
    return (
      <>
        <SummaryBanner $complete={data.complete}>
          <div>
            <div className="title">Daily Summary - {data.date}</div>
            <div className="status">
              {data.recordedPairs === 0
                ? 'No attendance recorded for this date'
                : data.complete
                  ? 'Complete - all applicable entries recorded'
                  : `Incomplete - totals are not final (${data.recordedPairs} of ${data.institutions.reduce((a, i) => a + i.categories.length, 0)} entries recorded)`}
            </div>
          </div>
          <div className="grand">Grand Total: {num(data.grandTotal)}</div>
        </SummaryBanner>
        <div data-sheetname={`Daily ${data.date}`}>
          <ReportTable>
            <thead>
              <tr>
                <th>Institution</th>
                {catIds.map(id => (
                  <th key={id}>{catNames[id]}</th>
                ))}
                <th>Institution Total</th>
              </tr>
            </thead>
            <tbody>
              {data.institutions.map(inst => (
                <tr key={inst.id}>
                  <td>{inst.name}</td>
                  {catIds.map(id => {
                    const cat = inst.categories.find(c => c.id === id);
                    if (!cat) return <td key={id} className="na">N/A</td>;
                    if (cat.headcount === null || cat.headcount === undefined) {
                      return <td key={id} className="missing">—</td>;
                    }
                    return <td key={id}>{num(cat.headcount)}</td>;
                  })}
                  <td>{num(inst.total)}{!inst.complete ? ' *' : ''}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>ALL INSTITUTIONS TOTAL</td>
                {catIds.map(id => {
                  const t = data.categoryTotals.find(c => c.id === id);
                  return <td key={id}>{t ? num(t.total) : ''}{t && t.missingCount > 0 ? ' *' : ''}</td>;
                })}
                <td>{num(data.grandTotal)}</td>
              </tr>
            </tbody>
          </ReportTable>
        </div>
        {data.complete === false && (
          <p style={{ color: '#b45309', fontSize: '0.85rem' }}>
            — = entry not recorded yet. N/A = category does not apply. * = totals include unrecorded entries.
          </p>
        )}
      </>
    );
  };

  const renderRange = data => (
    <>
      <SummaryBanner $complete={data.overall.complete}>
        <div>
          <div className="title">Date Range - {data.from} to {data.to}</div>
          <div className="status">
            {data.overall.daysRecorded === 0
              ? 'No attendance records found in this range'
              : `${data.overall.daysRecorded} day(s) recorded - ${data.overall.complete ? 'all complete' : 'some days are incomplete'}`}
          </div>
        </div>
        <div className="grand">Range Total: {num(data.overall.grandTotal)}</div>
      </SummaryBanner>
      {data.days.length > 0 ? (
        <div data-sheetname="Date Range">
          <ReportTable>
            <thead>
              <tr>
                <th>Date</th>
                {data.institutions.map(i => (
                  <th key={i.id}>{i.name}</th>
                ))}
                <th>{data.filters?.categoryId ? 'Filtered Total' : 'Day Total'}</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {data.days.map(day => (
                <tr key={day.date}>
                  <td>{day.date}{!day.complete ? ' *' : ''}</td>
                  {day.values.map((v, idx) => (
                    <td key={idx}>{v === null || v === undefined ? <span className="missing">—</span> : num(v)}</td>
                  ))}
                  <td>{num(day.total)}</td>
                  <td>
                    {day.change === null || day.change === undefined ? (
                      ''
                    ) : (
                      <span className={day.change >= 0 ? 'change-pos' : 'change-neg'}>
                        {day.change > 0 ? '+' : ''}
                        {num(day.change)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td>RANGE TOTAL</td>
                {data.overall.byInstitution.map(i => (
                  <td key={i.id}>{num(i.total)}</td>
                ))}
                <td>{num(data.overall.grandTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </ReportTable>
        </div>
      ) : (
        <EmptyMessage>No attendance records found for the selected range and filters.</EmptyMessage>
      )}
    </>
  );

  const renderMonthly = data => (
    <>
      <SummaryBanner $complete={data.months.every(m => m.complete)}>
        <div>
          <div className="title">Monthly Summary - {data.from} to {data.to}</div>
          <div className="status">
            {data.months.length === 0 ? 'No attendance records found in this range' : `${data.months.length} month(s) with records`}
          </div>
        </div>
      </SummaryBanner>
      {data.months.length === 0 ? (
        <EmptyMessage>No attendance records found for the selected range and filters.</EmptyMessage>
      ) : (
        data.months.map(month => (
          <div key={month.month} data-sheetname={`Summary ${month.month}`}>
            <SectionHeading>{month.label}</SectionHeading>
            <ReportTable>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Total Headcount</th>
                  <th>Days Recorded</th>
                </tr>
              </thead>
              <tbody>
                {month.byInstitution.map(i => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{num(i.total)}</td>
                    <td>{i.daysRecorded}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>ALL INSTITUTIONS TOTAL</td>
                  <td>{num(month.grandTotal)}</td>
                  <td>
                    {month.daysRecorded} of {month.daysExpected}
                  </td>
                </tr>
              </tbody>
            </ReportTable>

            <SectionHeading>{month.label} - Daily Totals</SectionHeading>
            <ReportTable>
              <thead>
                <tr>
                  <th>Date</th>
                  {data.institutions.map(i => (
                    <th key={i.id}>{i.name}</th>
                  ))}
                  <th>Day Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {month.days.map(day => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    {day.values.map((v, idx) => (
                      <td key={idx}>{v === null || v === undefined ? <span className="missing">—</span> : num(v)}</td>
                    ))}
                    <td>{num(day.total)}</td>
                    <td>{day.complete ? 'Complete' : 'Incomplete'}</td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          </div>
        ))
      )}
    </>
  );

  return (
    <Test>
      <ButtonContainer>
        <ReactToPrint
          trigger={() => <ActionButton>Print Attendance Report</ActionButton>}
          content={() => contentRef.current}
        />
        <ExportButton onClick={handleExport}>Export to Excel</ExportButton>
        <SendButton onClick={openSendModal}>Send Report</SendButton>
      </ButtonContainer>

      <ControlsBar>
        <ViewTabs>
          <TabButton $active={view === 'daily'} onClick={() => handleViewChange('daily')}>Daily Summary</TabButton>
          <TabButton $active={view === 'range'} onClick={() => handleViewChange('range')}>Date Range</TabButton>
          <TabButton $active={view === 'monthly'} onClick={() => handleViewChange('monthly')}>Monthly Summary</TabButton>
        </ViewTabs>
        <FiltersRow>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {view === 'daily' ? (
              <>
                <DatePicker
                  label="Attendance Date"
                  value={date}
                  onChange={nv => setDate(nv)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small' } }}
                />
                <ActionButton style={{ padding: '9px 18px', fontSize: '0.9rem' }} onClick={() => fetchReport({ view: 'daily' })}>
                  Fetch
                </ActionButton>
              </>
            ) : (
              <>
                <DatePicker
                  label="From Date"
                  value={fromDate}
                  onChange={nv => setFromDate(nv)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small' } }}
                />
                <DatePicker
                  label="To Date"
                  value={toDate}
                  onChange={nv => setToDate(nv)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small' } }}
                />
                <ActionButton
                  style={{ padding: '9px 18px', fontSize: '0.9rem' }}
                  onClick={() => fetchReport({ view })}
                >
                  Fetch
                </ActionButton>
              </>
            )}
          </LocalizationProvider>
          <select value={institutionFilter} onChange={e => setInstitutionFilter(e.target.value)}>
            <option value="">All Institutions</option>
            {config.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </FiltersRow>
      </ControlsBar>

      <ReportContainer>
        <PrintArea>
          <div ref={contentRef}>
            <PrintHeader>
              <img src={Logo} alt="College Logo" />
              <h1>FOOD MANAGEMENT SYSTEM</h1>
              <h2>Attendance Report ({view === 'daily' ? 'Daily Summary' : view === 'range' ? 'Date Range' : 'Monthly Summary'})</h2>
            </PrintHeader>
            <ScreenTitle>Attendance Report</ScreenTitle>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <HashLoader color="#164863" size={60} />
              </div>
            ) : reportData ? (
              reportData.view === 'daily'
                ? renderDaily(reportData)
                : reportData.view === 'range'
                  ? renderRange(reportData)
                  : renderMonthly(reportData)
            ) : (
              <EmptyMessage>Select filters and fetch a report to view attendance data.</EmptyMessage>
            )}
          </div>
        </PrintArea>
      </ReportContainer>

      {isSendModalOpen && (
        <ModalOverlay onClick={() => setIsSendModalOpen(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#164863', margin: '0 0 8px' }}>Send Attendance Report</h2>
            <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '0.9rem' }}>
              The currently fetched report ({lastFetch?.view}
              {lastFetch?.view === 'daily'
                ? `: ${lastFetch?.params?.date}`
                : `: ${lastFetch?.params?.from} to ${lastFetch?.params?.to}`})
              will be emailed as a PDF attachment.
            </p>
            <FormGroup>
              <label>To (Recipient Email) *</label>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                autoFocus
              />
            </FormGroup>
            <FormGroup>
              <label>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} />
            </FormGroup>
            <FormGroup>
              <label>Message (Optional)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} />
            </FormGroup>
            <ModalActions>
              <button className="cancel" onClick={() => setIsSendModalOpen(false)} disabled={isSending}>
                Cancel
              </button>
              <button className="send" onClick={handleSendReport} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send Report'}
              </button>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}

      <ToastContainer position="top-right" autoClose={4000} />
    </Test>
  );
};

export default PrintAttendanceReport;
