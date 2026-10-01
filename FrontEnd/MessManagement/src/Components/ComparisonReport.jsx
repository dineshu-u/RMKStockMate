import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Logo from '../assets/Logo.png';
import axios from 'axios';
import { HashLoader } from 'react-spinners';

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
    border: 1px solid #ddd;
    padding: 10px;
    text-align: center;
    overflow-wrap: break-word;
    word-break: break-word;
    font-size: 16px;
  }

  th {
    background-color: #164863;
    color: white;
    font-size: 15px;
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

  h2 {
    margin: 0;
    font-size: 20px;
  }
`;

const Footer = styled.footer`
  text-align: center;
  padding: 10px;
  background-color: #164863;
  color: white;
  margin-top: 0px;
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
    font-size: 30px;
  }

  @media print {
    display: block;
  }
`;

export const ComparisonReport = React.forwardRef(({ fromDate, toDate }, ref) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState([]);

  // Use current year range as default if not passed from navigation
  const effectiveFromDate = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const effectiveToDate = toDate || new Date().toISOString().split('T')[0];

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/comparison/report`, {
      params: {
        fdate: effectiveFromDate,
        tdate: effectiveToDate
      }
    })
    .then(res => {
      const fetchedData = Array.isArray(res.data) ? res.data : [];
      setData(fetchedData);

      const monthSet = new Set();
      fetchedData.forEach(row => {
        Object.keys(row).forEach(key => {
          const monthMatch = key.match(/(\w+)_quantity/);
          if (monthMatch) {
            monthSet.add(monthMatch[1]);
          }
        });
      });

      setMonths([...monthSet]);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error fetching report data:", err);
      setData([]);
      setLoading(false);
    });
  }, [effectiveFromDate, effectiveToDate]);

  const formatNumber = (number) => {
    return Number(number || 0).toFixed(2);
  };

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
          <img src={Logo} alt="College Logo" />
          <h1>FOOD MANAGEMENT</h1>
        </div>
      </PrintHeader>
      <h1>Comparison Report</h1>
      <DateRange>
        <h2>From: {effectiveFromDate}</h2>
        <h2>To: {effectiveToDate}</h2>
      </DateRange>
      <ItemTable>
        <thead>
          <tr>
            <th rowSpan="2">Item Name</th>
            <th rowSpan="2">Category</th>
            {months.map(month => (
              <th colSpan="2" key={month}>{month}</th>
            ))}
          </tr>
          <tr>
            {months.map(month => (
              <React.Fragment key={month}>
                <th>Quantity</th>
                <th>Amount</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <tr key={index}>
                <td>{row.item_name}</td>
                <td>{row.item_category}</td>
                {months.map(month => (
                  <React.Fragment key={month}>
                    <td>{formatNumber(row[`${month}_quantity`])}</td>
                    <td>{formatNumber(row[`${month}_amount`])}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={months.length > 0 ? months.length * 2 + 2 : 4}>No data available for selected range</td>
            </tr>
          )}
          {data.length > 0 && (
            <tr>
              <td><strong>Total</strong></td>
              <td></td>
              {months.map(month => {
                const totalAmount = data.reduce((acc, row) => acc + (Number(row[`${month}_amount`]) || 0), 0);
                return (
                  <React.Fragment key={month}>
                    <td>-</td>
                    <td><strong>{formatNumber(totalAmount)}</strong></td>
                  </React.Fragment>
                );
              })}
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