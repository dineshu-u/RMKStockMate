import React, { useState, useEffect,useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FaSearch, FaEdit, FaTrash } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { FaPrint } from 'react-icons/fa';
import Logo from '../assets/Logo.png';
const PrintButton = styled.button`
  align-self: flex-end;
  margin-bottom: 20px;
  padding: 10px 20px;
  font-size: 1rem;
  color: #fff;
  background-color: #164863;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  &:hover {
    background-color: #0d3449;
  }
`;
const PrintHeader = styled.div`
  display: none;
  margin-bottom: 20px;

  .content {
    margin-left: 180px;
  }

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

const Container = styled.div`
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 20px;
  color: #164863;
`;

const SearchInput = styled.input`
  padding: 10px;
  margin-bottom: 20px;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.3s;

  &:focus {
    border-color: #164863;
    outline: none;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
`;

const TableHeader = styled.th`
  padding: 10px;
  background: #f4f4f4;
  border: 1px solid #ddd;
  text-align: left;
`;

const TableData = styled.td`
  padding: 10px;
  border: 1px solid #ddd;
`;

const Button = styled.button`
  background-color: #164863;
  color: white;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;

  &:hover {
    background-color: #133b5c;
  }
`;

const ButtonContainer = styled.div`
  display: flex; /* Use flexbox for button alignment */
  align-items: center; /* Center buttons vertically */
`;

const FormContainer = styled.div`
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 20px auto;
`;

const FormField = styled.div`
  margin-bottom: 15px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  color: #333;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.3s;

  &:focus {
    border-color: #164863;
    outline: none;
  }
`;

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [currentVendor, setCurrentVendor] = useState({});
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  if (!event) {
    return <p>Loading...</p>;
  }

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors`)
      .then(response => {
        setVendors(response.data);
      })
      .catch(error => {
        console.error('Error fetching vendors:', error);
      });
  }, []);

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteVendor = (id) => {
    axios.delete(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors/${id}`)
      .then(() => {
        setVendors(vendors.filter(vendor => vendor.id !== id));
      })
      .catch(error => {
        console.error('Error deleting vendor:', error);
      });
  };

  const handleEditClick = (vendor) => {
    setCurrentVendor(vendor);
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setCurrentVendor(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleUpdateVendor = (e) => {
    e.preventDefault();
    axios.put(`${import .meta.env.VITE_RMK_MESS_URL}/event/vendors/${currentVendor.id}`, currentVendor)
      .then(() => {
        setVendors(vendors.map(vendor => 
          vendor.id === currentVendor.id ? currentVendor : vendor
        ));
        setIsEditing(false);
      })
      .catch(error => {
        console.error('Error updating vendor:', error);
      });
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setCurrentVendor({});
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setCurrentVendor(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleAddVendor = (e) => {
    e.preventDefault();
    axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors`, currentVendor)
      .then(response => {
        setVendors([...vendors, { ...currentVendor, id: response.data.id }]);
        setIsAdding(false);
      })
      .catch(error => {
        console.error('Error adding vendor:', error);
      });
  };

  return (
    <>
    <PrintButton onClick={handlePrint}>
        <FaPrint /> Print
      </PrintButton>
    <Container ref={componentRef}>
    <PrintHeader>
        <div style={{ display: 'flex' }}>
          <img src={Logo} alt="Logo" />
          <div className="content">
            <h1>FOOD MANAGEMENT SYSTEM</h1>
          </div>
        </div>
      </PrintHeader>
      <Title>Vendor List</Title>
      <SearchInput 
        type="text" 
        placeholder="Search vendors..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Button onClick={handleAddClick}>Add Vendor</Button>
      
      <Table>
        <thead>
          <tr>
            <TableHeader>Name</TableHeader>
            <TableHeader>Address</TableHeader>
            <TableHeader>License No</TableHeader>
            <TableHeader>Validity</TableHeader>
            <TableHeader>Actions</TableHeader>
          </tr>
        </thead>
        <tbody>
          {filteredVendors.map(vendor => (
            <tr key={vendor.id}>
              <TableData>{vendor.name}</TableData>
              <TableData>{vendor.address}</TableData>
              <TableData>{vendor.license_no}</TableData>
              <TableData>{vendor.validity}</TableData>
              <TableData>
                <ButtonContainer>
                  <Button onClick={() => handleEditClick(vendor)}>
                    <FaEdit style={{ marginRight: '5px' }} />
                  </Button>
                  <Button onClick={() => deleteVendor(vendor.id)} style={{ marginLeft: '10px' }}>
                    <FaTrash style={{ marginRight: '0px' }} />
                  </Button>
                </ButtonContainer>
              </TableData>
            </tr>
          ))}
        </tbody>
      </Table>

      {isEditing && (
        <FormContainer>
          <h2>Edit Vendor</h2>
          <form onSubmit={handleUpdateVendor}>
            <FormField>
              <FormLabel>Name:</FormLabel>
              <FormInput
                type="text"
                name="name"
                value={currentVendor.name}
                onChange={handleEditChange}
                required
              />
            </FormField>
            <FormField>
              <FormLabel>Address:</FormLabel>
              <FormInput
                type="text"
                name="address"
                value={currentVendor.address}
                onChange={handleEditChange}
                required
              />
            </FormField>
            <FormField>
              <FormLabel>License No:</FormLabel>
              <FormInput
                type="text"
                name="license_no"
                value={currentVendor.license_no}
                onChange={handleEditChange}
                required
              />
            </FormField>
            <FormField>
              <FormLabel>Validity:</FormLabel>
              <FormInput
                type="text"
                name="validity"
                value={currentVendor.validity}
                onChange={handleEditChange}
                placeholder="YYYY-MM-DD to YYYY-MM-DD"
                required
              />
            </FormField>
            <Button type="submit">Update Vendor</Button>
          </form>
        </FormContainer>
      )}

      {isAdding && (
        <FormContainer>
          <h2>Add Vendor</h2>
          <form onSubmit={handleAddVendor}>
            <FormField>
              <FormLabel>Name:</FormLabel>
              <FormInput
                type="text"
                name="name"
                value={currentVendor.name || ''}
                onChange={handleAddChange}
                required
              />
            </FormField>
            <FormField>
              <FormLabel>Address:</FormLabel>
              <FormInput
                type="text"
                name="address"
                value={currentVendor.address || ''}
                onChange={handleAddChange}
                required
              />
            </FormField>
            <FormField>
              <FormLabel>License No :</FormLabel>
              <FormInput
                type="text"
                name="license_no"
                value={currentVendor.license_no || ''}
                onChange={handleAddChange}
                required
              />
            </FormField>
            <FormField>
              <FormLabel>Validity:</FormLabel>
              <FormInput
                type="text"
                name="validity"
                value={currentVendor.validity || ''}
                onChange={handleAddChange}
                placeholder="YYYY-MM-DD to YYYY-MM-DD"
                required
              />
            </FormField>
            <Button type="submit">Add Vendor</Button>
          </form>
        </FormContainer>
      )}
    </Container>
    </>

  );
};

export default VendorList;