import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FaSearch, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { FaPrint } from 'react-icons/fa';
import Logo from '../assets/Logo.png';
import {
  getLicenseStatus,
  maskValidityInput,
  validateValidityRange,
  sortVendorsByStatusPriority,
} from '../utils/vendorLicense';

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

const StatusBadge = styled.span`
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  ${({ $tone }) => {
    switch ($tone) {
      case 'green':
        return 'background: #e6f4ea; color: #1e7e34; border: 1px solid #b7dfc2;';
      case 'amber':
        return 'background: #fff4e5; color: #8a5a00; border: 1px solid #f0d9a8;';
      case 'red':
        return 'background: #fdecea; color: #b3261e; border: 1px solid #f5c6c0;';
      default:
        return 'background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;';
    }
  }}
`;

const StatusNote = styled.div`
  margin-top: 2px;
  font-size: 0.72rem;
  color: #64748b;
`;

const Legend = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: #475569;
  margin-bottom: 4px;
`;

const FieldError = styled.div`
  margin-top: 5px;
  font-size: 0.8rem;
  color: #b3261e;
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
  display: flex;
  align-items: center;
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
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #164863;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  &:hover {
    color: #164863;
  }
`;

const FormField = styled.div`
  margin-bottom: 15px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 5px;
  color: #333;
  font-weight: 500;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.3s;
  box-sizing: border-box;

  &:focus {
    border-color: #164863;
    outline: none;
  }
`;

const SubmitButton = styled(Button)`
  width: 100%;
  justify-content: center;
  margin-top: 10px;
`;

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentVendor, setCurrentVendor] = useState({});
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors`)
      .then(response => {
        setVendors(response.data);
      })
      .catch(error => {
        console.error('Error fetching vendors:', error);
      });
  }, []);

  const sortedVendors = useMemo(() => {
    return sortVendorsByStatusPriority(vendors);
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedVendors;
    return sortedVendors.filter(vendor =>
      (vendor.name || '').toLowerCase().includes(term) ||
      (vendor.address || '').toLowerCase().includes(term) ||
      (vendor.license_no || '').toLowerCase().includes(term)
    );
  }, [sortedVendors, searchTerm]);

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
    setIsEditModalOpen(true);
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
    if (validityError) return; // invalid validity can never be submitted
    axios.put(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors/${currentVendor.id}`, currentVendor)
      .then(() => {
        setVendors(vendors.map(vendor =>
          vendor.id === currentVendor.id ? currentVendor : vendor
        ));
        setIsEditModalOpen(false);
      })
      .catch(error => {
        console.error('Error updating vendor:', error);
      });
  };

  const handleAddClick = () => {
    setCurrentVendor({ name: '', address: '', license_no: '', validity: '' });
    setIsAddModalOpen(true);
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setCurrentVendor(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Validity field: auto-mask digits into "YYYY-MM-DD to YYYY-MM-DD" while typing.
  const handleValidityChange = (e) => {
    const masked = maskValidityInput(e.target.value);
    setCurrentVendor(prevState => ({
      ...prevState,
      validity: masked
    }));
  };

  const validityError = validateValidityRange(currentVendor.validity);

  const handleAddVendor = (e) => {
    e.preventDefault();
    if (validityError) return; // invalid validity can never be submitted
    axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors`, currentVendor)
      .then(response => {
        setVendors([...vendors, { ...currentVendor, id: response.data.id }]);
        setIsAddModalOpen(false);
      })
      .catch(error => {
        console.error('Error adding vendor:', error);
      });
  };

  const closeModals = () => {
    setIsEditModalOpen(false);
    setIsAddModalOpen(false);
    setCurrentVendor({});
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
          {filteredVendors.map(vendor => {
            const status = getLicenseStatus(vendor.validity);
            return (
              <tr key={vendor.id}>
                <TableData>{vendor.name}</TableData>
                <TableData>{vendor.address}</TableData>
                <TableData>{vendor.license_no}</TableData>
                <TableData>
                  {vendor.validity}
                  <br />
                  <StatusBadge $tone={status.tone}>{status.label}</StatusBadge>
                  {status.note && <StatusNote>{status.note}</StatusNote>}
                </TableData>
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
            );
          })}
        </tbody>
      </Table>

      {isEditModalOpen && (
        <ModalOverlay onClick={closeModals}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Edit Vendor</ModalTitle>
              <CloseButton onClick={closeModals}><FaTimes /></CloseButton>
            </ModalHeader>
            <form onSubmit={handleUpdateVendor}>
              <FormField>
                <FormLabel>Name:</FormLabel>
                <FormInput
                  type="text"
                  name="name"
                  value={currentVendor.name || ''}
                  onChange={handleEditChange}
                  required
                />
              </FormField>
              <FormField>
                <FormLabel>Address:</FormLabel>
                <FormInput
                  type="text"
                  name="address"
                  value={currentVendor.address || ''}
                  onChange={handleEditChange}
                  required
                />
              </FormField>
              <FormField>
                <FormLabel>License No:</FormLabel>
                <FormInput
                  type="text"
                  name="license_no"
                  value={currentVendor.license_no || ''}
                  onChange={handleEditChange}
                  required
                />
              </FormField>
              <FormField>
                <FormLabel>Validity:</FormLabel>
                <FormInput
                  type="text"
                  name="validity"
                  value={currentVendor.validity || ''}
                  onChange={handleValidityChange}
                  placeholder="YYYY-MM-DD to YYYY-MM-DD"
                  required
                  aria-invalid={Boolean(validityError)}
                />
                {validityError && <FieldError role="alert">{validityError}</FieldError>}
              </FormField>
              <SubmitButton type="submit">Update Vendor</SubmitButton>
            </form>
          </Modal>
        </ModalOverlay>
      )}

      {isAddModalOpen && (
        <ModalOverlay onClick={closeModals}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Add Vendor</ModalTitle>
              <CloseButton onClick={closeModals}><FaTimes /></CloseButton>
            </ModalHeader>
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
                  onChange={handleValidityChange}
                  placeholder="YYYY-MM-DD to YYYY-MM-DD"
                  required
                  aria-invalid={Boolean(validityError)}
                />
                {validityError && <FieldError role="alert">{validityError}</FieldError>}
              </FormField>
              <SubmitButton type="submit">Add Vendor</SubmitButton>
            </form>
          </Modal>
        </ModalOverlay>
      )}
    </Container>
    </>
  );
};

export default VendorList;