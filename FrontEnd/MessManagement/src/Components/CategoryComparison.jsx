import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Logo from '../assets/Logo.png';
import axios from 'axios';
import { HashLoader } from 'react-spinners';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

const Container = styled.div`
  @media print {
    margin: 20px;
  }

  h1 {
    color: #164863;
    text-align: center;
  }
`;

const ItemTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
  table-layout: fixed;

  th, td {
    border: 1px solid #cbd5e1;
    padding: 10px;
    text-align: center;
    overflow-wrap: break-word;
    word-break: break-word;
    font-size: 15px;
  }

  th {
    background-color: #164863;
    color: white;
    font-size: 14px;
    font-weight: bold;
  }

  tbody tr {
    background-color: #f9f9f9;
  }

  tbody tr:nth-child(even) {
    background-color: #f1f1f1;
  }

  tbody tr:hover {
    background-color: #e0f7fa;
    color: #000;
  }

  @media print {
    th, td {
      font-size: 11px; 
      padding: 5px; 
    }
  }
`;

const DateRange = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  background: #f1f5f9;
  padding: 12px 20px;
  border-radius: 6px;
  border-left: 4px solid #164863;

  h3 {
    margin: 0;
    font-size: 15px;
    color: #164863;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const Footer = styled.footer`
  text-align: center;
  padding: 10px;
  background-color: #164863;
  color: white;
  margin-top: 15px;
  display: none;
  @media print {
    display: block;
  }
`;

const PrintHeader = styled.div`
  display: none;
  text-align: center;
  margin-bottom: 20px;

  img {
    width: 150px;
    height: auto;
    margin-bottom: 10px;
  }

  h1 {
    font-size: 26px;
  }

  @media print {
    display: block;
  }
`;

export const CategoryComparison = React.forwardRef(({ fromDate, toDate, fromDate1, toDate1, fromDate2, toDate2 }, ref) => {
  const location = useLocation();
  const navState = location?.state || {};

  // Extract from props or router location state
  const propF1 = fromDate1 || navState.fromDate1;
  const propT1 = toDate1 || navState.toDate1;
  const propF2 = fromDate2 || navState.fromDate2;
  const propT2 = toDate2 || navState.toDate2;
  const propF = fromDate || navState.fromDate;
  const propT = toDate || navState.toDate;

  const [reportType, setReportType] = useState('periods');
  const [data, setData] = useState([]);
  const [periodInfo, setPeriodInfo] = useState({ period1: null, period2: null });
  const [monthsList, setMonthsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback defaults
  const defaultF1 = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
  const defaultT1 = dayjs().subtract(1, 'month').startOf('month').add(3, 'day').format('YYYY-MM-DD');
  const defaultF2 = dayjs().startOf('month').format('YYYY-MM-DD');
  const defaultT2 = dayjs().startOf('month').add(3, 'day').format('YYYY-MM-DD');

  const activeF1 = propF1 || defaultF1;
  const activeT1 = propT1 || defaultT1;
  const activeF2 = propF2 || defaultF2;
  const activeT2 = propT2 || defaultT2;

  useEffect(() => {
    let params = {};
    if (propF1 && propT1 && propF2 && propT2) {
      params = { fdate1: propF1, tdate1: propT1, fdate2: propF2, tdate2: propT2 };
    } else if (propF && propT) {
      params = { fdate: propF, tdate: propT };
    } else {
      params = { fdate1: activeF1, tdate1: activeT1, fdate2: activeF2, tdate2: activeT2 };
    }

    setLoading(true);
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/categorycomparison/category-report`, { params })
      .then(res => {
        const resp = res.data;
        if (resp && resp.type === 'periods') {
          setReportType('periods');
          setData(resp.data || []);
          setPeriodInfo({ period1: resp.period1, period2: resp.period2 });
        } else if (resp && resp.type === 'months') {
          setReportType('months');
          setData(resp.data || []);
          setMonthsList(resp.months || []);
        } else if (Array.isArray(resp)) {
          setData(resp);
          const monthSet = new Set();
          if (resp.length > 0) {
            Object.keys(resp[0]).forEach(key => {
              const monthMatch = key.match(/(\w+)_amount/);
              if (monthMatch) monthSet.add(monthMatch[1]);
            });
          }
          setMonthsList([...monthSet]);
          setReportType('months');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching category comparison data:", err);
        setData([]);
        setLoading(false);
      });
  }, [propF1, propT1, propF2, propT2, propF, propT]);

  const formatNumber = (number) => {
    return Number(number || 0).toFixed(2);
  };

  const p1Label = propF1 && propT1 
    ? `${propF1} to ${propT1}` 
    : (periodInfo.period1 ? `${periodInfo.period1.from} to ${periodInfo.period1.to}` : `${activeF1} to ${activeT1}`);

  const p2Label = propF2 && propT2 
    ? `${propF2} to ${propT2}` 
    : (periodInfo.period2 ? `${periodInfo.period2.from} to ${periodInfo.period2.to}` : `${activeF2} to ${activeT2}`);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
      }}>
        <HashLoader color="#164863" loading={loading} size={90} />
      </div>
    );
  }

  return (
    <Container ref={ref} className="print-container">
      <PrintHeader>
        <div className="content">
          <img src={Logo} alt="Logo" />
          <h1>FOOD MANAGEMENT SYSTEM</h1>
        </div>
      </PrintHeader>
      <h1>Category Comparison Report</h1>

      {reportType === 'periods' && (
        <DateRange>
          <h3>Period 1: {p1Label}</h3>
          <h3>Period 2: {p2Label}</h3>
        </DateRange>
      )}

      {reportType === 'months' && (
        <DateRange>
          <h3>From: {propF || activeF1}</h3>
          <h3>To: {propT || activeT2}</h3>
        </DateRange>
      )}

      <ItemTable>
        <thead>
          {reportType === 'periods' ? (
            <>
              <tr>
                <th rowSpan="2" style={{ width: '22%' }}>Category Name</th>
                <th colSpan="2" style={{ backgroundColor: '#1f5f86' }}>
                  Period 1 ({p1Label})
                </th>
                <th colSpan="2" style={{ backgroundColor: '#2a7890' }}>
                  Period 2 ({p2Label})
                </th>
                <th rowSpan="2" style={{ width: '15%' }}>Total Amount (₹)</th>
              </tr>
              <tr>
                <th>Quantity</th>
                <th>Amount (₹)</th>
                <th>Quantity</th>
                <th>Amount (₹)</th>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <th rowSpan="2" style={{ width: '20%' }}>Category Name</th>
                {monthsList.map(month => (
                  <th colSpan="2" key={month}>{month}</th>
                ))}
                <th rowSpan="2" style={{ width: '15%' }}>Total Amount (₹)</th>
              </tr>
              <tr>
                {monthsList.map(month => (
                  <React.Fragment key={month}>
                    <th>Quantity</th>
                    <th>Amount (₹)</th>
                  </React.Fragment>
                ))}
              </tr>
            </>
          )}
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{row.category_name}</td>
                {reportType === 'periods' ? (
                  <>
                    <td>{formatNumber(row.period1_quantity)}</td>
                    <td>{formatNumber(row.period1_amount)}</td>
                    <td>{formatNumber(row.period2_quantity)}</td>
                    <td>{formatNumber(row.period2_amount)}</td>
                    <td style={{ fontWeight: 'bold' }}>{formatNumber(row.total_amount)}</td>
                  </>
                ) : (
                  <>
                    {monthsList.map(month => (
                      <React.Fragment key={month}>
                        <td>{formatNumber(row[`${month}_quantity`])}</td>
                        <td>{formatNumber(row[`${month}_amount`])}</td>
                      </React.Fragment>
                    ))}
                    <td style={{ fontWeight: 'bold' }}>{formatNumber(row.total_amount)}</td>
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={reportType === 'periods' ? 6 : monthsList.length * 2 + 2}>
                No category purchase data found for selected periods.
              </td>
            </tr>
          )}

          {data.length > 0 && (
            <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
              <td style={{ textAlign: 'left' }}><strong>Total</strong></td>
              {reportType === 'periods' ? (
                <>
                  <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r.period1_quantity || 0), 0))}</strong></td>
                  <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r.period1_amount || 0), 0))}</strong></td>
                  <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r.period2_quantity || 0), 0))}</strong></td>
                  <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r.period2_amount || 0), 0))}</strong></td>
                  <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r.total_amount || 0), 0))}</strong></td>
                </>
              ) : (
                <>
                  {monthsList.map(month => (
                    <React.Fragment key={month}>
                      <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r[`${month}_quantity`] || 0), 0))}</strong></td>
                      <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r[`${month}_amount`] || 0), 0))}</strong></td>
                    </React.Fragment>
                  ))}
                  <td><strong>{formatNumber(data.reduce((acc, r) => acc + Number(r.total_amount || 0), 0))}</strong></td>
                </>
              )}
            </tr>
          )}
        </tbody>
      </ItemTable>
      <Footer>
        Copyright © 2024. All rights reserved to DEPARTMENT of INFORMATION TECHNOLOGY - RMKEC
      </Footer>
    </Container>
  );
});