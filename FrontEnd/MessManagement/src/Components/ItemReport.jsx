import React, { useState, useEffect, forwardRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Logo from '../assets/Logo.png';
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
    font-size: 12px;
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

const PrintHeader = styled.div`
  display: none;
  text-align: center;

  img {
    width: 150px;
    height: auto;
  }

  h1 {
    font-size: 30px;
  }

  @media print {
    display: block;
    padding:5px; 
    font-size:11px;
  }
`;

const Dropdown = styled.select`
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
  margin-bottom: 20px;
  font-size: 1rem;
  width: 100%;
  max-width: 300px;
  margin: 20px auto;
  display: block;
`;

const TableContainer = styled.div`
  min-height: 300px;
  position: relative;
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

const TotalsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding: 10px;
  background-color: #e0f7fa;
  border: 1px solid #164863;
  border-radius: 8px;
  font-weight: bold;
  font-size: 18px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  div {
    flex: 1;
    text-align: center;

    &:first-child {
      border-right: 1px solid #164863;
    }

    span {
      display: block;
      margin-top: 5px;
      font-size: 14px;
      color: #164863;
    }
  }
`;

export const ItemReport = forwardRef(({ fromDate, toDate }, ref) => {
  const [selectedItem, setSelectedItem] = useState('');
  const [items, setItems] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/item/getItems`)
      .then(response => {
        setItems(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching items:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedItem) {
      axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/item/report`, {
        params: {
          item: selectedItem,
          fdate: fromDate,
          tdate: toDate
        }
      })
        .then(response => {
          if (response.data.length === 0) {
            setData([{
              item: selectedItem,
              RMK_quantity: 0,
              RMK_amount: 0,
              RMD_quantity: 0,
              RMD_amount: 0,
              RMKCET_quantity: 0,
              RMKCET_amount: 0,
              RMKSCHOOL_quantity: 0,
              RMKSCHOOL_amount: 0,
              Issued_quantity: 0,
              Issued_amount: 0,
              Purchased_quantity: 0,
              Purchased_amount: 0,
            }]);
          } else {
            setData(response.data);
          }
        })
        .catch(error => {
          console.error('Error fetching item data:', error);
          setData([{
            item: selectedItem,
            RMK_quantity: 0,
            RMK_amount: 0,
            RMD_quantity: 0,
            RMD_amount: 0,
            RMKCET_quantity: 0,
            RMKCET_amount: 0,
            RMKSCHOOL_quantity: 0,
            RMKSCHOOL_amount: 0,
            Issued_quantity: 0,
            Issued_amount: 0,
            Purchased_quantity: 0,
            Purchased_amount: 0,
          }]);
        });
    } else {
      setData([]);
    }
  }, [selectedItem, fromDate, toDate]);

  const handleItemChange = (e) => {
    setSelectedItem(e.target.value);
    setData([]); 
  };

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
  const purchaseTotal = data.reduce((acc, row) => acc + (row.Purchased_amount ?? 0), 0).toFixed(2);
  const issueTotal = data.reduce((acc, row) => acc + ((row.RMK_amount ?? 0) + (row.RMD_amount ?? 0) + (row.RMKCET_amount ?? 0) + (row.RMKSCHOOL_amount ?? 0)), 0).toFixed(2);
  
  return (
    <Container ref={ref} className="print-container">
      <PrintHeader>
        <div className="content">
          <img src={Logo} alt="College Logo" />
          <h1>FOOD MANAGEMENT SYSTEM</h1>
        </div>
      </PrintHeader>
      <h1>Item-Wise Report</h1>
      <Dropdown value={selectedItem} onChange={handleItemChange}>
        <option value="">Select Item</option>
        {items.map((item, index) => (
          <option key={index} value={item.item}>
            {item.item}
          </option>
        ))}
      </Dropdown>
      <DateRange>
        <h2>From: {fromDate}</h2>
        <h2>To: {toDate}</h2>
      </DateRange>
      <TableContainer>
        <ItemTable>
          <thead>
            <tr>
              <th rowSpan="2">Item Name</th>
              <th colSpan="2">Purchased</th>
              <th colSpan="2">RMK</th>
              <th colSpan="2">RMD</th>
              <th colSpan="2">RMKCET</th>
              <th colSpan="2">School</th>
              <th colSpan="2">Issued</th>
              <th colSpan="2">Closing</th>
              
            </tr>
            <tr>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Quantity</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{row.item}</td>
                <td>{row.Purchased_quantity}</td>
                <td>{row.Purchased_amount}</td>
                <td>{row.RMK_quantity}</td>
                <td>{row.RMK_amount}</td>
                <td>{row.RMD_quantity}</td>
                <td>{row.RMD_amount}</td>
                <td>{row.RMKCET_quantity}</td>
                <td>{row.RMKCET_amount}</td>
                <td>{row.RMKSCHOOL_quantity}</td>
                <td>{row.RMKSCHOOL_amount}</td>
                <td>{row.RMK_quantity + row.RMD_quantity + row.RMKCET_quantity + row.RMKSCHOOL_quantity}</td>
                <td>{row.RMK_amount + row.RMD_amount + row.RMKCET_amount + row.RMKSCHOOL_amount}</td>
                <td>{formatNumber(Math.max(0, row.Purchased_quantity - (row.RMK_quantity + row.RMD_quantity + row.RMKCET_quantity + row.RMKSCHOOL_quantity)))}</td>
                <td>{formatNumber(Math.max(0, row.Purchased_amount - (row.RMK_amount + row.RMD_amount + row.RMKCET_amount + row.RMKSCHOOL_amount)))}</td>

              </tr>
            ))}
          </tbody>
        </ItemTable>
      </TableContainer>
      <TotalsContainer>
      <div>
        Total Purchase Amount
        <span>{purchaseTotal}</span>
      </div>
      <div>
        Total Issue Amount
        <span>{issueTotal}</span>
      </div>
    </TotalsContainer>
    <Footer>
                Copyright © 2024. All rights reserved to DEPARTMENT of INFORMATION TECHNOLOGY - RMKEC
            </Footer>
    </Container>
  );
});
