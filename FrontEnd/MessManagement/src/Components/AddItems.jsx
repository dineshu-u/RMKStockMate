import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Container = styled.div`
  padding: 0px;
  text-align: center;
`;

const Heading = styled.h1`
  color: #164863;
  margin-bottom: 20px;
`;

const SubHeading=styled.h3`
  color: #164863;
  margin-top: 20px;
`;

const Table = styled.table`
  width: 80%;
  border-collapse: collapse;
  text-align: center;
  margin-left: 140px;
`;

const Th = styled.th`
  background-color: #164863;
  color: white;
  padding: 10px;
  text-align: left;
  border: 1px solid #ddd;
  width: 200px;
  max-width: 200px;
`;

const Td = styled.td`
  padding: 10px;
  border: 1px solid #ddd;
  width: 200px;
  max-width: 200px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: 2px solid #164863;
  }
`;

const Select = styled.select`
  width: 80%;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
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

const ErrorText = styled.div`
  color: red;
  margin-top: 20px;
  font-size: 32px;
`;

const AddItems = () => {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState([]);
  const [itemsAvail, setItemsAvail] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/addItems/getCategory`);
        setItems(response.data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    const fetchItemsAvail = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/addItems/getItemCategory`);
        setItemsAvail(response.data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
    fetchItemsAvail();
  }, []);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setItemName(value);
    if (value) {
      const filtered = itemsAvail.filter(item =>
        item.item.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems([]);
    }
  };

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
  };

  const handleSubmit = async () => {
    if (!category) {
      toast.error("Please select a category before adding.");
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/addItems/insert`, { itemName, category });
      toast.success("Item added successfully");
      
      setItemName("");
      setCategory("");
      setFilteredItems([]);
    } catch (error) {
      toast.error(error.response ? error.response.data : 'An error occurred while adding the item.');
    }
  };

  return (
    <Container>
      <Heading>Add Items</Heading>
      <Table>
        <thead>
          <tr>
            <Th>SNo</Th>
            <Th>Select Item</Th>
            <Th>Category</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>1</Td>
            <Td><Input value={itemName} placeholder="ITEM" onChange={handleInputChange} /></Td>
            <Td>
              <Select value={category} onChange={handleCategoryChange}>
                <option value="" disabled>Select Category</option>
                {items.map((item, idx) => (
                  <option key={idx} value={item.category}>
                    {item.category}
                  </option>
                ))}
              </Select>
            </Td>
          </tr>
        </tbody>
      </Table>
      <SubmitContainer>
        <SubmitButton onClick={handleSubmit}>Add</SubmitButton>
      </SubmitContainer>
      <SubHeading>Existing Items That Match</SubHeading>
      {filteredItems.length > 0 && (
        <Table className="table table-bordered">
          <thead>
            <tr>
              <Th>Item Name</Th>
              <Th>Category</Th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => (
              <tr key={idx}>
                <Td>{item.item}</Td>
                <Td>{item.category}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ToastContainer />
    </Container>
  );
};

export default AddItems;
