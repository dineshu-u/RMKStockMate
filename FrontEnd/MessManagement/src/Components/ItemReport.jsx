import React, { useState, useEffect, forwardRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Logo from '../assets/Logo.png';
import { HashLoader } from 'react-spinners';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

const Container = styled.div`
  max-width: 1250px;
  margin: 0 auto;
  padding: 10px 15px 40px;

  @media print {
    margin: 10px;
    padding: 0;
    max-width: 100%;
  }

  h1 {
    color: #164863;
    text-align: center;
    margin: 0 0 20px 0;
    font-size: 2.1rem;
    font-weight: 700;
  }
`;

const ControlsWrapper = styled.div`
  background: #ffffff;
  padding: 22px;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  margin-bottom: 25px;
  border: 1px solid #e2e8f0;

  @media print {
    display: none;
  }
`;

const MultiSelectContainer = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MultiSelectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  label {
    font-weight: 700;
    color: #164863;
    font-size: 1.05rem;
  }

  .btn-group {
    display: flex;
    gap: 8px;
  }
`;

const SmallBtn = styled.button`
  background-color: ${props => props.secondary ? '#f1f5f9' : '#164863'};
  color: ${props => props.secondary ? '#475569' : '#ffffff'};
  border: 1px solid ${props => props.secondary ? '#cbd5e1' : '#164863'};
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.secondary ? '#e2e8f0' : '#0d3449'};
  }
`;

const SearchSelectRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const SelectInput = styled.select`
  padding: 10px 14px;
  border-radius: 6px;
  border: 2px solid #164863;
  font-size: 0.95rem;
  flex: 1;
  min-width: 250px;
  background-color: #f8fafc;
  outline: none;
  font-weight: 600;
  color: #164863;
  cursor: pointer;

  &:focus {
    border-color: #4caf50;
    box-shadow: 0 0 6px rgba(76, 175, 80, 0.4);
  }
`;

const ChipsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 38px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  align-items: center;
`;

const ItemChip = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: #164863;
  color: #ffffff;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.88rem;
  font-weight: 600;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  button {
    background: transparent;
    border: none;
    color: #ffffff;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: 2px;
    opacity: 0.85;

    &:hover {
      opacity: 1;
      color: #f87171;
    }
  }
`;

const EmptyChipsNotice = styled.span`
  color: #94a3b8;
  font-size: 0.9rem;
  font-style: italic;
  padding-left: 4px;
`;

const DatePickersRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 25px;
  flex-wrap: wrap;
`;

const PeriodCard = styled.div`
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 320px;

  h4 {
    margin: 0;
    font-size: 1rem;
    color: #164863;
    font-weight: 700;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
  }
`;

const DateFieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  span {
    width: 50px;
    font-weight: 700;
    color: #334155;
    font-size: 0.95rem;
  }

  .MuiFormControl-root {
    flex: 1;
  }
`;

const ActionButton = styled.button`
  background-color: #164863;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 700;
  height: fit-content;
  align-self: center;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;

  &:hover {
    background-color: #0d3449;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const GlobalInfoBanner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  background: #f1f5f9;
  padding: 14px 24px;
  border-radius: 8px;
  border-left: 5px solid #164863;

  .banner-title {
    h3 {
      margin: 0 0 4px;
      font-size: 1.15rem;
      color: #164863;
      font-weight: 700;
    }
    span {
      font-size: 0.88rem;
      color: #64748b;
      font-weight: 600;
    }
  }

  .periods-summary {
    display: flex;
    gap: 35px;

    .period-block {
      display: flex;
      flex-direction: column;
      gap: 3px;

      strong {
        color: #164863;
        font-size: 0.92rem;
        margin-bottom: 2px;
      }

      div {
        font-size: 0.88rem;
        color: #334155;
        font-weight: 500;
      }
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const ItemSection = styled.div`
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  page-break-inside: avoid;

  @media print {
    border: none;
    padding: 10px 0;
    box-shadow: none;
    margin-bottom: 25px;
  }
`;

const ItemSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #164863;
  padding-bottom: 8px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    color: #164863;
    font-size: 1.35rem;
    font-weight: 700;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  margin-bottom: 20px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
`;

const ItemTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
  min-width: 850px;

  th, td {
    border: 1px solid #cbd5e1;
    padding: 10px 8px;
    text-align: center;
    font-size: 13.5px;
  }

  th {
    background-color: #164863;
    color: white;
    font-size: 13px;
    font-weight: 700;
  }

  tbody tr {
    background-color: #ffffff;
  }

  tbody tr:nth-child(even) {
    background-color: #f8fafc;
  }

  tbody tr:hover {
    background-color: #f1f5f9;
  }

  @media print {
    th, td {
      font-size: 10px;
      padding: 4px 2px;
    }
  }
`;

const SummaryCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 15px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media print {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
`;

const SummaryCard = styled.div`
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 5px solid ${props => props.color || '#164863'};
  border-radius: 8px;
  padding: 12px 16px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  h4 {
    margin: 0 0 5px;
    font-size: 0.82rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: #164863;
  }

  span {
    display: block;
    margin-top: 4px;
    font-size: 0.85rem;
    color: #059669;
    font-weight: 600;
  }
`;

const ValidationAlert = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 14px 20px;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  margin: 20px 0;
  font-size: 1rem;
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
  }

  @media print {
    display: block;
  }
`;

const Footer = styled.footer`
  text-align: center;
  padding: 12px;
  background-color: #164863;
  color: white;
  margin-top: 25px;
  display: none;
  border-radius: 4px;
  font-size: 12px;

  @media print {
    display: block;
  }
`;

export const ItemReport = forwardRef(({ fromDate, toDate, fromDate1, toDate1, fromDate2, toDate2 }, ref) => {
  const location = useLocation();
  const navState = location?.state || {};

  // Extract dates from props OR router navigation state
  const propF1 = fromDate1 || navState.fromDate1;
  const propT1 = toDate1 || navState.toDate1;
  const propF2 = fromDate2 || navState.fromDate2;
  const propT2 = toDate2 || navState.toDate2;

  const parseDate = (d, fallback) => {
    if (!d) return fallback;
    const parsed = dayjs(d);
    return parsed.isValid() ? parsed : fallback;
  };

  const defaultF1 = dayjs().subtract(1, 'month').startOf('month');
  const defaultT1 = dayjs().subtract(1, 'month').startOf('month').add(3, 'day');
  const defaultF2 = dayjs().startOf('month');
  const defaultT2 = dayjs().startOf('month').add(3, 'day');

  // Master catalog
  const [itemsList, setItemsList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentSelectValue, setCurrentSelectValue] = useState('');
  
  // Results & Loading
  const [comparisonResults, setComparisonResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Global exact dates for Period 1 and Period 2
  const [f1, setF1] = useState(parseDate(propF1, defaultF1));
  const [t1, setT1] = useState(parseDate(propT1, defaultT1));
  const [f2, setF2] = useState(parseDate(propF2, defaultF2));
  const [t2, setT2] = useState(parseDate(propT2, defaultT2));

  // Sync state whenever props or navigation state change
  useEffect(() => {
    if (propF1) setF1(parseDate(propF1, defaultF1));
    if (propT1) setT1(parseDate(propT1, defaultT1));
    if (propF2) setF2(parseDate(propF2, defaultF2));
    if (propT2) setT2(parseDate(propT2, defaultT2));
  }, [propF1, propT1, propF2, propT2]);

  // Load master catalog on mount
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/item/getItems`)
      .then(response => {
        const list = Array.isArray(response.data) ? response.data : [];
        setItemsList(list);
        if (list.length > 0 && selectedItems.length === 0) {
          // Initialize with first item selected by default
          setSelectedItems([list[0].item]);
        }
      })
      .catch(error => {
        console.error('Error fetching items list:', error);
      });
  }, []);

  // Handler to add item to multi-select
  const handleAddItem = (itemName) => {
    if (!itemName) return;
    if (!selectedItems.includes(itemName)) {
      setSelectedItems(prev => [...prev, itemName]);
      setValidationError('');
    }
    setCurrentSelectValue('');
  };

  // Handler to remove item from multi-select
  const handleRemoveItem = (itemName) => {
    setSelectedItems(prev => prev.filter(i => i !== itemName));
  };

  const handleSelectAll = () => {
    setSelectedItems(itemsList.map(i => i.item));
    setValidationError('');
  };

  const handleClearAll = () => {
    setSelectedItems([]);
    setComparisonResults([]);
    setValidationError('Please select at least one item.');
  };

  // Fetch comparison data for all selected items in one API call
  const fetchMultiItemComparison = (itemsToFetch = selectedItems, customF1 = f1, customT1 = t1, customF2 = f2, customT2 = t2) => {
    if (!itemsToFetch || itemsToFetch.length === 0) {
      setValidationError('Please select at least one item.');
      setComparisonResults([]);
      return;
    }

    setValidationError('');
    setLoading(true);

    const fdate1Str = dayjs(customF1).isValid() ? dayjs(customF1).format('YYYY-MM-DD') : dayjs(f1).format('YYYY-MM-DD');
    const tdate1Str = dayjs(customT1).isValid() ? dayjs(customT1).format('YYYY-MM-DD') : dayjs(t1).format('YYYY-MM-DD');
    const fdate2Str = dayjs(customF2).isValid() ? dayjs(customF2).format('YYYY-MM-DD') : dayjs(f2).format('YYYY-MM-DD');
    const tdate2Str = dayjs(customT2).isValid() ? dayjs(customT2).format('YYYY-MM-DD') : dayjs(t2).format('YYYY-MM-DD');

    const params = {
      items: itemsToFetch.join(','),
      fdate1: fdate1Str,
      tdate1: tdate1Str,
      fdate2: fdate2Str,
      tdate2: tdate2Str
    };

    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/item/report`, { params })
      .then(response => {
        const resp = response.data;
        if (resp && resp.type === 'comparison' && Array.isArray(resp.items)) {
          setComparisonResults(resp.items);
        } else if (resp && resp.type === 'comparison') {
          setComparisonResults([resp]);
        } else if (Array.isArray(resp)) {
          setComparisonResults(resp.map(r => ({
            item: r.item || 'Item',
            period1: r,
            period2: r,
            difference: { purchaseQuantityDiff: 0, purchaseAmountDiff: 0, issuedQuantityDiff: 0, issuedAmountDiff: 0 }
          })));
        } else {
          setComparisonResults([]);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching item comparison:', error);
        setComparisonResults([]);
        setLoading(false);
      });
  };

  // Re-fetch whenever selectedItems list changes
  useEffect(() => {
    if (selectedItems.length > 0) {
      fetchMultiItemComparison(selectedItems, f1, t1, f2, t2);
    }
  }, [selectedItems, propF1, propT1, propF2, propT2]);

  const formatNumber = (num) => Number(num || 0).toFixed(2);

  const p1FromStr = f1 && dayjs(f1).isValid() ? dayjs(f1).format('YYYY-MM-DD') : '';
  const p1ToStr = t1 && dayjs(t1).isValid() ? dayjs(t1).format('YYYY-MM-DD') : '';
  const p2FromStr = f2 && dayjs(f2).isValid() ? dayjs(f2).format('YYYY-MM-DD') : '';
  const p2ToStr = t2 && dayjs(t2).isValid() ? dayjs(t2).format('YYYY-MM-DD') : '';

  return (
    <Container ref={ref} className="print-container">
      <PrintHeader>
        <div className="content">
          <img src={Logo} alt="College Logo" />
          <h1>FOOD MANAGEMENT SYSTEM</h1>
          <h2>Item-Wise Period Comparison Report</h2>
        </div>
      </PrintHeader>

      <h1>Item-Wise Comparison Report</h1>

      {/* Interactive Controls Bar */}
      <ControlsWrapper>
        {/* Multi-Item Selection Area */}
        <MultiSelectContainer>
          <MultiSelectHeader>
            <label>Select Items to Compare ({selectedItems.length} selected):</label>
            <div className="btn-group">
              <SmallBtn type="button" secondary onClick={handleSelectAll}>Select All</SmallBtn>
              <SmallBtn type="button" secondary onClick={handleClearAll}>Clear All</SmallBtn>
            </div>
          </MultiSelectHeader>

          <SearchSelectRow>
            <SelectInput 
              value={currentSelectValue} 
              onChange={(e) => handleAddItem(e.target.value)}
            >
              <option value="">-- Choose an item to add --</option>
              {itemsList.map((i, idx) => (
                <option key={idx} value={i.item} disabled={selectedItems.includes(i.item)}>
                  {i.item} ({i.category}) {selectedItems.includes(i.item) ? '✓' : ''}
                </option>
              ))}
            </SelectInput>
          </SearchSelectRow>

          {/* Selected Item Chips */}
          <ChipsWrapper>
            {selectedItems.length > 0 ? (
              selectedItems.map((item, idx) => (
                <ItemChip key={idx}>
                  <span>{item}</span>
                  <button type="button" onClick={() => handleRemoveItem(item)} title="Remove item">×</button>
                </ItemChip>
              ))
            ) : (
              <EmptyChipsNotice>No items selected. Choose items above to compare.</EmptyChipsNotice>
            )}
          </ChipsWrapper>
        </MultiSelectContainer>

        {/* Global Date Pickers with To placed directly below From */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePickersRow>
            <PeriodCard>
              <h4>Period 1 (Exact Dates)</h4>
              <DateFieldRow>
                <span>From:</span>
                <DatePicker
                  value={f1}
                  onChange={(nv) => setF1(nv)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small' } }}
                />
              </DateFieldRow>
              <DateFieldRow>
                <span>To:</span>
                <DatePicker
                  value={t1}
                  onChange={(nv) => setT1(nv)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small' } }}
                />
              </DateFieldRow>
            </PeriodCard>

            <PeriodCard>
              <h4>Period 2 (Exact Dates)</h4>
              <DateFieldRow>
                <span>From:</span>
                <DatePicker
                  value={f2}
                  onChange={(nv) => setF2(nv)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small' } }}
                />
              </DateFieldRow>
              <DateFieldRow>
                <span>To:</span>
                <DatePicker
                  value={t2}
                  onChange={(nv) => setT2(nv)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small' } }}
                />
              </DateFieldRow>
            </PeriodCard>

            <ActionButton onClick={() => fetchMultiItemComparison(selectedItems, f1, t1, f2, t2)}>
              Compare Periods
            </ActionButton>
          </DatePickersRow>
        </LocalizationProvider>
      </ControlsWrapper>

      {/* Global Date Banner */}
      <GlobalInfoBanner>
        <div className="banner-title">
          <h3>Period Comparison Overview</h3>
          <span>Comparing {comparisonResults.length} Item{comparisonResults.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="periods-summary">
          <div className="period-block">
            <strong>Period 1:</strong>
            <div>From: {p1FromStr}</div>
            <div>To: {p1ToStr}</div>
          </div>
          <div className="period-block">
            <strong>Period 2:</strong>
            <div>From: {p2FromStr}</div>
            <div>To: {p2ToStr}</div>
          </div>
        </div>
      </GlobalInfoBanner>

      {validationError && (
        <ValidationAlert>
          ⚠️ {validationError}
        </ValidationAlert>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <HashLoader color="#164863" loading={loading} size={60} />
        </div>
      ) : (
        <>
          {/* Vertical list of item comparison sections */}
          {comparisonResults.length > 0 ? (
            comparisonResults.map((itemResult, idx) => {
              const p1 = itemResult.period1 || {};
              const p2 = itemResult.period2 || {};
              const itemName = itemResult.item || `Item ${idx + 1}`;

              const p1Label = p1.fromDate && p1.toDate ? `${p1.fromDate} to ${p1.toDate}` : `${p1FromStr} to ${p1ToStr}`;
              const p2Label = p2.fromDate && p2.toDate ? `${p2.fromDate} to ${p2.toDate}` : `${p2FromStr} to ${p2ToStr}`;

              return (
                <ItemSection key={idx} className="item-section">
                  <ItemSectionHeader>
                    <h2>Item: {itemName}</h2>
                  </ItemSectionHeader>

                  {/* Comparison Table */}
                  <TableWrapper>
                    <ItemTable>
                      <thead>
                        <tr>
                          <th rowSpan="2" style={{ width: '18%' }}>Period / Range</th>
                          <th colSpan="2">Purchased</th>
                          <th colSpan="2">RMKEC</th>
                          <th colSpan="2">RMDEC</th>
                          <th colSpan="2">RMKCET</th>
                          <th colSpan="2">Schools</th>
                          <th colSpan="2">Total Issued</th>
                          <th colSpan="2">Closing Stock</th>
                        </tr>
                        <tr>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                          <th>Quantity</th>
                          <th>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Period 1 Row */}
                        <tr>
                          <td style={{ textAlign: 'left', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                            Period 1 ({p1Label})
                          </td>
                          <td>{formatNumber(p1.Purchased_quantity)}</td>
                          <td>{formatNumber(p1.Purchased_amount)}</td>
                          <td>{formatNumber(p1.RMK_quantity)}</td>
                          <td>{formatNumber(p1.RMK_amount)}</td>
                          <td>{formatNumber(p1.RMD_quantity)}</td>
                          <td>{formatNumber(p1.RMD_amount)}</td>
                          <td>{formatNumber(p1.RMKCET_quantity)}</td>
                          <td>{formatNumber(p1.RMKCET_amount)}</td>
                          <td>{formatNumber(p1.RMKSCHOOL_quantity)}</td>
                          <td>{formatNumber(p1.RMKSCHOOL_amount)}</td>
                          <td>{formatNumber(p1.Issued_quantity)}</td>
                          <td>{formatNumber(p1.Issued_amount)}</td>
                          <td>{formatNumber(p1.Closing_quantity)}</td>
                          <td>{formatNumber(p1.Closing_amount)}</td>
                        </tr>

                        {/* Period 2 Row */}
                        <tr>
                          <td style={{ textAlign: 'left', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                            Period 2 ({p2Label})
                          </td>
                          <td>{formatNumber(p2.Purchased_quantity)}</td>
                          <td>{formatNumber(p2.Purchased_amount)}</td>
                          <td>{formatNumber(p2.RMK_quantity)}</td>
                          <td>{formatNumber(p2.RMK_amount)}</td>
                          <td>{formatNumber(p2.RMD_quantity)}</td>
                          <td>{formatNumber(p2.RMD_amount)}</td>
                          <td>{formatNumber(p2.RMKCET_quantity)}</td>
                          <td>{formatNumber(p2.RMKCET_amount)}</td>
                          <td>{formatNumber(p2.RMKSCHOOL_quantity)}</td>
                          <td>{formatNumber(p2.RMKSCHOOL_amount)}</td>
                          <td>{formatNumber(p2.Issued_quantity)}</td>
                          <td>{formatNumber(p2.Issued_amount)}</td>
                          <td>{formatNumber(p2.Closing_quantity)}</td>
                          <td>{formatNumber(p2.Closing_amount)}</td>
                        </tr>

                        {/* Variance Row */}
                        <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
                          <td style={{ textAlign: 'left' }}>
                            <strong>Variance (Period 2 - Period 1)</strong>
                          </td>
                          <td style={{ color: Number(p2.Purchased_quantity || 0) >= Number(p1.Purchased_quantity || 0) ? '#059669' : '#dc2626' }}>
                            {formatNumber(Number(p2.Purchased_quantity || 0) - Number(p1.Purchased_quantity || 0))}
                          </td>
                          <td style={{ color: Number(p2.Purchased_amount || 0) >= Number(p1.Purchased_amount || 0) ? '#059669' : '#dc2626' }}>
                            {formatNumber(Number(p2.Purchased_amount || 0) - Number(p1.Purchased_amount || 0))}
                          </td>
                          <td>{formatNumber(Number(p2.RMK_quantity || 0) - Number(p1.RMK_quantity || 0))}</td>
                          <td>{formatNumber(Number(p2.RMK_amount || 0) - Number(p1.RMK_amount || 0))}</td>
                          <td>{formatNumber(Number(p2.RMD_quantity || 0) - Number(p1.RMD_quantity || 0))}</td>
                          <td>{formatNumber(Number(p2.RMD_amount || 0) - Number(p1.RMD_amount || 0))}</td>
                          <td>{formatNumber(Number(p2.RMKCET_quantity || 0) - Number(p1.RMKCET_quantity || 0))}</td>
                          <td>{formatNumber(Number(p2.RMKCET_amount || 0) - Number(p1.RMKCET_amount || 0))}</td>
                          <td>{formatNumber(Number(p2.RMKSCHOOL_quantity || 0) - Number(p1.RMKSCHOOL_quantity || 0))}</td>
                          <td>{formatNumber(Number(p2.RMKSCHOOL_amount || 0) - Number(p1.RMKSCHOOL_amount || 0))}</td>
                          <td style={{ color: Number(p2.Issued_quantity || 0) >= Number(p1.Issued_quantity || 0) ? '#059669' : '#dc2626' }}>
                            {formatNumber(Number(p2.Issued_quantity || 0) - Number(p1.Issued_quantity || 0))}
                          </td>
                          <td style={{ color: Number(p2.Issued_amount || 0) >= Number(p1.Issued_amount || 0) ? '#059669' : '#dc2626' }}>
                            {formatNumber(Number(p2.Issued_amount || 0) - Number(p1.Issued_amount || 0))}
                          </td>
                          <td>{formatNumber(Number(p2.Closing_quantity || 0) - Number(p1.Closing_quantity || 0))}</td>
                          <td>{formatNumber(Number(p2.Closing_amount || 0) - Number(p1.Closing_amount || 0))}</td>
                        </tr>
                      </tbody>
                    </ItemTable>
                  </TableWrapper>

                  {/* Quick Summary Cards */}
                  <SummaryCardsGrid>
                    <SummaryCard color="#2563eb">
                      <h4>Period 1 Purchase Total</h4>
                      <p>₹{formatNumber(p1.Purchased_amount)}</p>
                      <span>{formatNumber(p1.Purchased_quantity)} units / kg</span>
                    </SummaryCard>
                    <SummaryCard color="#0891b2">
                      <h4>Period 2 Purchase Total</h4>
                      <p>₹{formatNumber(p2.Purchased_amount)}</p>
                      <span>{formatNumber(p2.Purchased_quantity)} units / kg</span>
                    </SummaryCard>
                    <SummaryCard color={Number(p2.Purchased_amount || 0) - Number(p1.Purchased_amount || 0) >= 0 ? '#059669' : '#e11d48'}>
                      <h4>Purchase Value Variance</h4>
                      <p>
                        {Number(p2.Purchased_amount || 0) - Number(p1.Purchased_amount || 0) >= 0 ? '+' : ''}
                        ₹{formatNumber(Number(p2.Purchased_amount || 0) - Number(p1.Purchased_amount || 0))}
                      </p>
                      <span>
                        {Number(p2.Purchased_quantity || 0) - Number(p1.Purchased_quantity || 0) >= 0 ? '+' : ''}
                        {formatNumber(Number(p2.Purchased_quantity || 0) - Number(p1.Purchased_quantity || 0))} units
                      </span>
                    </SummaryCard>
                  </SummaryCardsGrid>
                </ItemSection>
              );
            })
          ) : (
            !validationError && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No comparison data available for the selected items and periods.
              </div>
            )
          )}
        </>
      )}

      <Footer>
        Copyright © 2024. All rights reserved to DEPARTMENT of INFORMATION TECHNOLOGY - RMKEC
      </Footer>
    </Container>
  );
});