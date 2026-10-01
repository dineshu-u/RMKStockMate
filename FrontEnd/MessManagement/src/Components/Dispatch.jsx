import React, { useState, useRef, useEffect } from 'react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import styled from 'styled-components';
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
  font-size: 13px;
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
  table-layout: auto;

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
    width: 90%;
    box-sizing: border-box;
    transition: border-color 0.3s, box-shadow 0.3s;
    background-color: #fff;
  }

  td input:focus {
    border-color: #164863;
    outline: none;
    box-shadow: 0 0 5px rgba(22, 72, 99, 0.3);
  }

  td input::placeholder {
    color: #888;
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

  /* Specific column widths */
  th:nth-child(4),
  td:nth-child(4) {
    width: 130px;
  }

  th:nth-child(5),
  td:nth-child(5) {
    width: 130px;
  }

  th:nth-child(6),
  td:nth-child(6) {
    width: 130px;
  }

  th:nth-child(7),
  td:nth-child(7) {
    width: 130px;
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
function Dispatch() {
  const [rows, setRows] = useState([{ id: Date.now(), sno: 1, item: '', quantity: '', currentQuantity: '', rmk: '', rmd: '', rmkcet: '', school: '' }]);
  const [items, setItems] = useState([]);
  const numRecordsRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.error("Please enter the date");
      return;
    }
  
    const dateFormatted = selectedDate.format('YYYY-MM-DD');
  
    const arr = rows.map(row => ({
      ItemName: row.item.toUpperCase(),
      CurrentQuantity: row.currentQuantity,
      RMK: row.rmk || 0, 
      RMD: row.rmd || 0, 
      RMKCET: row.rmkcet || 0, 
      SCHOOL: row.school || 0, 
      DATE: dateFormatted,
    }));
  
    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/dispatch/updateDispatch`, { ItemArray: arr });
      toast.success("Items updated successfully");
      setRows([{ id: Date.now(), sno: 1, item: '', quantity: '', currentQuantity: '', rmk: '', rmd: '', rmkcet: '', school: '' }]);
      setSelectedDate(null);
      numRecordsRef.current.value = '';
    } catch (error) {
      console.error("Error updating items:", error);
      toast.error("Error updating items. Please try again.");
    }
    finally {
      setLoading(false);  
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/dispatch/retrieve`);
        setItems(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };    
    fetchData();
  }, []);

  const handleAddRows = () => {
    const numberOfRows = parseInt(numRecordsRef.current.value, 10);
    if (numberOfRows > 0) {
      const lastSno = rows.length > 0 ? rows[rows.length - 1].sno : 0;
      const newRows = Array.from({ length: numberOfRows }, (_, index) => ({
        id: Date.now() + index,
        sno: lastSno + index + 1,
        item: '',
        quantity: '',
        currentQuantity: '',
        rmk: '',
        rmd: '',
        rmkcet: '',
        school: '',
      }));
      setRows(prevRows => [...prevRows, ...newRows]);
      numRecordsRef.current.value = '';
    }
  };

  const fetchTotalForItem = async (itemName) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/dispatch/getQuantity`, {
        itemName: itemName,
      });
      return parseFloat(response.data.quantity || 0); 
    } catch (error) {
      console.error("Error fetching quantity:", error);
      return 0; 
    }
  };
  
  const calculateCurrentQuantity = (row) => {
    const quantity = parseFloat(row.quantity || 0);
    const rmk = parseFloat(row.rmk || 0);
    const rmd = parseFloat(row.rmd || 0);
    const rmkcet = parseFloat(row.rmkcet || 0);
    const school = parseFloat(row.school || 0);
    return quantity - rmk - rmd - rmkcet - school;
};

  const handleAddOneRow = () => {
    const lastSno = rows.length > 0 ? rows[rows.length - 1].sno : 0;
    setRows(prevRows => [
      ...prevRows,
      { id: Date.now(), sno: lastSno + 1, quantity: '', amount: '' }
    ]);
  };

  const handleInputChange = async (id, field, value) => {
    if (field === 'item') {
      const newQuantity = await fetchTotalForItem(value);
      setRows(prevRows =>
        prevRows.map(row => {
          if (row.id === id) {
            return {
              ...row,
              item: value,
              quantity: newQuantity,
              rmk: '',
              rmd: '',
              rmkcet: '',
              school: '',
              currentQuantity: newQuantity, 
            };
          }
          return row;
        })
      );
    } else {
      setRows(prevRows =>
        prevRows.map(row => {
          if (row.id === id) {
            const updatedRow = { ...row, [field]: value };
            const currentQuantity = calculateCurrentQuantity(updatedRow);
  
            if (currentQuantity < 0) {
              toast.error("Dispatch quantity exceeds the current quantity.");
              return row; 
            }
  
            if (
              parseFloat(updatedRow.rmk || 0) > parseFloat(updatedRow.quantity) ||
              parseFloat(updatedRow.rmd || 0) > parseFloat(updatedRow.quantity) ||
              parseFloat(updatedRow.rmkcet || 0) > parseFloat(updatedRow.quantity) ||
              parseFloat(updatedRow.school || 0) > parseFloat(updatedRow.quantity)
          ) {
              toast.error("Quantities for RMK, RMD, RMKCET, and School cannot be more than the total quantity.");
              return row; 
          }
  
            return {
              ...updatedRow,
              currentQuantity: currentQuantity,
            };
          }
          return row;
        })
      );
    }
  };
  const handleDeleteRow = (id) => {
    setRows(prevRows => prevRows.filter(row => row.id !== id));
  };
  
  return (
    <Container>
      <h1>DISPATCH</h1>
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
              value={dayjs.isDayjs(selectedDate) ? selectedDate : null} // Ensuring date is a valid dayjs object
              onChange={(newValue) => setSelectedDate(newValue && dayjs.isDayjs(newValue) ? newValue : dayjs())}
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
            <th>Total Quantity</th>
            <th>RMKEC</th>
            <th>RMDEC</th>
            <th>RMKCET</th>
            <th>Schools</th>
            <th>Current Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td className='sno'>{row.sno}</td>
              <td>
                <select className="item-select" value={row.item} onChange={(e) => handleInputChange(row.id, 'item', e.target.value)}>
                  <option value="">SELECT</option>
                  {items.map((item, index) => (
                    <option key={index} value={item.item}>{item.item}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  className="item-input"
                  value={row.quantity}
                  placeholder="Total Quantity"
                  onChange={(e) => handleInputChange(row.id, 'quantity', e.target.value)}
                  readOnly
                />
              </td>
              <td>
                <input
                  type="number"
                  className="item-input"
                  value={row.rmk}
                  placeholder="Quantity"
                  onChange={(e) => handleInputChange(row.id, 'rmk', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="item-input"
                  value={row.rmd}
                  placeholder="Quantity"
                  onChange={(e) => handleInputChange(row.id, 'rmd', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="item-input"
                  value={row.rmkcet}
                  placeholder="Quantity"
                  onChange={(e) => handleInputChange(row.id, 'rmkcet', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="item-input"
                  value={row.school}
                  placeholder="Quantity"
                  onChange={(e) => handleInputChange(row.id, 'school', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="item-input"
                  value={row.currentQuantity}
                  placeholder="Current Quantity"
                  onChange={(e) => handleInputChange(row.id, 'currentQuantity', e.target.value)}
                />
              </td>
              <td>
              <DeleteButton onClick={() => handleDeleteRow(row.id)}>Delete</DeleteButton>
              </td>
            </tr>
          ))}
        </tbody>
      </ItemTable>
      <SubmitContainer>
        <SubmitButton className="add-button" onClick={handleAddOneRow}>Add</SubmitButton>
        <SubmitButton onClick={handleSubmit}  disabled={loading}>Submit</SubmitButton>
      </SubmitContainer>
      <ToastContainer />
    </Container>
  );
}

export default Dispatch;
