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
    font-size: 18px;
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

  td input {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px;
    font-size: 14px;
    width: 90%;
  }

  td select {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px;
    font-size: 12px;
    min-width: 180px;
  }

  .sno {
    min-width: 50px;
  }

  @media print {
    th, td {
      font-size: 11px; 
      padding:5px; 
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

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/comparison/report`, {
      params: {
        fdate: fromDate,
        tdate: toDate
      }
    })
    .then(res => {
      const fetchedData = res.data || [];
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
      setLoading(false);
    });
  }, [fromDate, toDate]);

  const formatNumber = (number) => {
    return Number(number).toFixed(2);
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
        <h2>From: {fromDate}</h2>
        <h2>To: {toDate}</h2>
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
          {data.map((row, index) => (
            <tr key={index}>
              <td>{row.item_name}</td>
              <td>{row.item_category}</td>
              {months.map(month => (
                <React.Fragment key={month}>
                  <td>{(row[`${month}_quantity`] ?? '-') === '-' ? '-' : row[`${month}_quantity`].toFixed(2)}</td>
                  <td>{(row[`${month}_amount`] ?? '-') === '-' ? '-' : row[`${month}_amount`].toFixed(2)}</td>
                </React.Fragment>
              ))}
            </tr>
          ))}
          <tr>
            <td><strong>Total</strong></td>
            {months.map(month => {
              const totalAmount = data.reduce((acc, row) => acc + (Number(row[`${month}_amount`] ?? 0) || 0), 0);
              return (
                <React.Fragment key={month}>
                  <td>-</td> {/* No total for quantity */}
                  <td>{formatNumber(totalAmount.toFixed(2))}</td>
                </React.Fragment>
              );
            })}
          </tr>
        </tbody>
      </ItemTable>
          <Footer>
                Copyright © 2024. All rights reserved to DEPARTMENT of INFORMATION TECHNOLOGY - RMKEC
            </Footer>
    </Container>
  );
});
