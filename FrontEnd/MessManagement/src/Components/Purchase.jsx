import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { HashLoader } from 'react-spinners'; 
import dayjs from 'dayjs';
const Container = styled.div`
  h1 {
    color: #164863;
    text-align: center;
  }
`;

const FormContainer = styled.div`
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 450px;
`;

const Records = styled.div`
  display: flex;
  flex-direction: column;

  label {
    margin-left: 12px;
  }
`;

const InputNumber = styled.input`
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f4f4f4;
  margin-left: 10px;
  margin-top: 24px;
  width: 190px;
`;

const AddButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #164863;
  color: white;
  cursor: pointer;
  font-size: 14px;
  margin-top: 24px;
  margin-left: 10px;

  &:hover {
    background-color: #0a3d62;
  }
`;

const ItemTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;

  th, td {
    border: 1px solid #ddd;
    padding: 12px;
    text-align: left;
    transition: background-color 0.3s, color 0.3s;
  }

  th {
    background-color: #164863;
    color: white;
    font-size: 16px;
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
    padding: 8px;
    font-size: 14px;
  }

  td input:focus {
    outline: 2px solid #164863;
  }

  td select {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    font-size: 14px;
    width: 180px;
  }

  .sno {
    min-width: 50px;
  }
`;

const SubmitContainer = styled.div`
  margin-top: 20px;
  text-align: center;

  .add-button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    background-color: #164863;
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.2s;
    margin-right: 10px;

    &:hover {
      background-color: #0a3d62;
    }

    &:active {
      transform: scale(0.98);
    }
  }
`;

const SubmitButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #4caf50;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;

  &:hover {
    background-color: #45a049;
  }

  &:active {
    transform: scale(0.98);
  }
`;
const DeleteButton = styled.button`
  background-color: #d9534f; /* Bootstrap danger color */
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #c9302c; /* Darker shade on hover */
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    background-color: #e7e7e7; /* Light gray for disabled */
    color: #a9a9a9; /* Darker gray for text */
    cursor: not-allowed;
  }
`;
const Purchase = () => {
  const [rows, setRows] = useState([{ id: Date.now(), sno: 1, quantity: '', amount: '' }]);
  const numRecordsRef = useRef(null);
  const [date, setDate] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        console.log("Fetching items...");
        const response = await axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/purchase/getItems`);
        console.log("Items fetched:", response.data);
        setItems(response.data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };
    fetchItems();
  }, []);

  const fetchCategoryForItem = (itemName) => {
    const item = items.find(i => i.item === itemName);
    return item ? item.category : '';
  };
  const handleDeleteRow = (id) => {
    setRows(prevRows => prevRows.filter(row => row.id !== id));
  };
  
  const handleAddRows = () => {
    const numberOfRows = parseInt(numRecordsRef.current.value, 10);
    if (numberOfRows > 0) {
      const lastSno = rows.length > 0 ? rows[rows.length - 1].sno : 0;
      const newRows = Array.from({ length: numberOfRows }, (_, index) => ({
        id: Date.now() + index,
        sno: lastSno + index + 1,
        quantity: '',
        amount: '',
        item: '',
        category: ''
      }));
      setRows(prevRows => [...prevRows, ...newRows]);
      numRecordsRef.current.value = '';
    }
  };

  const handleInputChange = (id, field, value) => {
    if (field === 'item') {
      const category = fetchCategoryForItem(value);
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === id ? { ...row, [field]: value, category } : row
        )
      );
    } else {
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === id ? { ...row, [field]: value } : row
        )
      );
    }
  };

  const handleAddOneRow = () => {
    const lastSno = rows.length > 0 ? rows[rows.length - 1].sno : 0;
    setRows(prevRows => [
      ...prevRows,
      { id: Date.now(), sno: lastSno + 1, quantity: '', amount: '' }
    ]);
  };

  const handleSubmit = async () => {
    if (!date) {
      toast.error("Please enter the date.");
      return;
    }
  
    const invalidRows = rows.filter(row => !row.item || !row.quantity || !row.amount);
  
    if (invalidRows.length > 0) {
      toast.error("Please fill in all the fields for each row.");
      return;
    }
  
    const updatedRows = rows.map(row => ({
      ...row,
      amount: isNaN(row.amount) ? 0 : row.amount,
      quantity: isNaN(row.quantity) ? 0 : row.quantity,
      totalAmount: (isNaN(row.quantity) ? 0 : row.quantity) * (isNaN(row.amount) ? 0 : row.amount) // Calculate totalAmount
    }));
  
    const formattedDate = date.format('YYYY-MM-DD');
  
    const formattedRowsData = updatedRows.map(row => ({
      ...row,
      amount: isNaN(row.amount) ? 0 : row.amount,
      quantity: isNaN(row.quantity) ? 0 : row.quantity,
      totalAmount: isNaN(row.totalAmount) ? 0 : row.totalAmount
    }));
  
    try {
      setLoading(true);
      console.log("Submitting data...", { date: formattedDate, arr: formattedRowsData });
      const response = await axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/purchase/add`, {
        date: formattedDate,
        arr: formattedRowsData
      });
      console.log("Response from server:", response.data);
      toast.success("Items added successfully");
  
      setRows([{ id: Date.now(), sno: 1, quantity: '', amount: '' }]);
      setDate(null);
      numRecordsRef.current.value = '';
  
    } catch (error) {
      console.error("Error submitting data:", error);
      toast.error("Error submitting data");
    }
    finally {
      setLoading(false);  
    }
  };
  

  return (
    <Container>
      <h1>PURCHASE</h1>
      <FormContainer>
              {loading && (
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
        )}

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DemoContainer components={['DatePicker']}>
          <DatePicker
              label="Select date"
              className="date-picker"
              value={dayjs.isDayjs(date) ? date : null} // Ensuring date is a valid dayjs object
              onChange={(newDate) => setDate(newDate && dayjs.isDayjs(newDate) ? newDate : dayjs())}
              maxDate={dayjs()} // Use dayjs() for maxDate if you want today's date as the limit
              format="YYYY-MM-DD"
            />
          </DemoContainer>
        </LocalizationProvider>
        <Records>
          <InputNumber
            type='number'
            id='num-records'
            placeholder='No of rows to be added'
            ref={numRecordsRef}
          />
        </Records>
        <AddButton onClick={handleAddRows}>Add</AddButton>
      </FormContainer>
      <ItemTable>
        <thead>
          <tr>
            <th>SNo</th>
            <th>Select Item</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>Total Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className="sno">{row.sno}</td>
              <td>
                <select
                  value={row.item}
                  className="item-select"
                  onChange={(e) => handleInputChange(row.id, 'item', e.target.value)}
                >
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.item} value={item.item}>{item.item}</option>
                  ))}
                </select>
              </td>
              <td>{row.category}</td>
              <td>
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => handleInputChange(row.id, 'quantity', e.target.value)}
                  required
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) => handleInputChange(row.id, 'amount', e.target.value)
                  }
                  required
                />
              </td>
              <td>
                {row.quantity && row.amount ? row.quantity * row.amount : 0}
              </td>
              <td>
              <DeleteButton onClick={() => handleDeleteRow(row.id)}>Delete</DeleteButton>
              </td>
            </tr>
          ))}
        </tbody>
      </ItemTable>
      <SubmitContainer>
        <button className="add-button" onClick={handleAddOneRow}>Add One Row</button>
        <SubmitButton onClick={handleSubmit} disabled={loading} >Submit</SubmitButton>
      </SubmitContainer>
      <ToastContainer />
    </Container>
  );
};

export default Purchase;
