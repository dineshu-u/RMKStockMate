import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FaSearch, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { FaPrint } from 'react-icons/fa';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import Logo from '../assets/Logo.png';

// Extend dayjs with CustomParseFormat for strict parsing of DD-MM-YYYY etc.
dayjs.extend(customParseFormat);

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

const DeleteConfirmText = styled.div`
  margin-bottom: 20px;
  font-size: 1rem;
  line-height: 1.5;
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

const StatusBadge = styled.span`
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const ValidityFieldWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const ValidationMessage = styled.div`
  margin-top: 4px;
  font-size: 0.75rem;
  color: #d9534f;
`;

// ============================================
// SINGLE DATE PARSER - handles all legacy formats
// Returns dayjs object (startOf day) or null
// ============================================
const parseDateFlexible = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const normalized = dateStr.trim().replace(/[\/\.]/g, '-');
  const segments = normalized.split('-');
  
  if (segments.length !== 3) return null;
  
  const [first, second, third] = segments;
  
  // Detect format by year position
  let format;
  if (first.length === 4) {
    format = 'YYYY-MM-DD';
  } else if (third.length === 4) {
    format = 'DD-MM-YYYY';
  } else {
    return null;
  }
  
  const parsed = dayjs(normalized, format, true);
  return parsed.isValid() ? parsed.startOf('day') : null;
};

// Parse end date from validity string (for status display)
const parseValidityEndDate = (validity) => {
  if (!validity || typeof validity !== 'string') return null;
  
  const str = validity.trim();
  
  // Find end date after separator (case-insensitive, flexible whitespace)
  const separators = [' to ', ' to', 'to ', 'TO ', '–', '—'];
  let endPart = str;
  
  for (const sep of separators) {
    const idx = str.toLowerCase().lastIndexOf(sep.toLowerCase());
    if (idx !== -1) {
      endPart = str.substring(idx + sep.length).trim();
      break;
    }
  }
  
  return parseDateFlexible(endPart);
};

// Helper: calculate license status
const getLicenseStatus = (validity) => {
  const endDate = parseValidityEndDate(validity);
  if (!endDate) {
    return { status: 'unknown', label: 'UNKNOWN', color: '#9e9e9e', bgColor: '#f5f5f5' };
  }

  const today = dayjs().startOf('day');
  const diffDays = endDate.diff(today, 'day');

  if (diffDays < 0) {
    return { status: 'expired', label: 'EXPIRED', color: '#fff', bgColor: '#d9534f', detail: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago` };
  }
  if (diffDays <= 3) {
    if (diffDays === 0) {
      return { status: 'expiring-soon', label: 'EXPIRING SOON', color: '#333', bgColor: '#f0ad4e', detail: 'Expires today' };
    }
    return { status: 'expiring-soon', label: 'EXPIRING SOON', color: '#333', bgColor: '#f0ad4e', detail: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}` };
  }
  return { status: 'valid', label: 'VALID', color: '#fff', bgColor: '#5cb85c', detail: `Expires in ${diffDays} days` };
};

// ============================================
// FORM VALIDATION - strict DD-MM-YYYY to DD-MM-YYYY
// Only called on submit/blur, NEVER during typing
// ============================================
const validateCompleteValidity = (value) => {
  if (!value || !value.trim()) {
    return { valid: false, error: 'Validity is required.' };
  }

  const str = value.trim();
  // Split on " to " with flexible whitespace
  const parts = str.split(/ to /i).map(p => p.trim());
  
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, error: 'Enter dates in DD-MM-YYYY to DD-MM-YYYY format.' };
  }

  const [startStr, endStr] = parts;

  // Validate format: exactly DD-MM-YYYY
  if (!/^[0-9]{2}-[0-9]{2}-[0-9]{4}$/.test(startStr) || !/^[0-9]{2}-[0-9]{2}-[0-9]{4}$/.test(endStr)) {
    return { valid: false, error: 'Enter dates in DD-MM-YYYY to DD-MM-YYYY format.' };
  }

  // Parse and validate calendar dates using dayjs with CustomParseFormat
  const start = dayjs(startStr, 'DD-MM-YYYY', true);
  const end = dayjs(endStr, 'DD-MM-YYYY', true);

  if (!start.isValid()) {
    return { valid: false, error: 'Invalid start date.' };
  }
  if (!end.isValid()) {
    return { valid: false, error: 'Invalid end date.' };
  }

  if (end.isBefore(start)) {
    return { valid: false, error: 'End date cannot be earlier than start date.' };
  }

  return { valid: true, error: null };
};

// Optional: light formatter for display (only on blur, not during typing)
const formatValidityOnBlur = (value) => {
  if (!value) return '';
  const str = value.trim();
  
  // Already in correct format - leave as-is
  if (/^\d{2}-\d{2}-\d{4} to \d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }
  
  // Try to parse and reformat if it looks like two dates
  const parts = str.split(/\s+to\s+/i).map(p => p.trim());
  if (parts.length === 2) {
    const first = parts[0].replace(/[\/\.]/g, '-');
    const second = parts[1].replace(/[\/\.]/g, '-');
    
    // If both look like dates, format them
    if (/^\d{2}-\d{2}-\d{4}$/.test(first) || /^\d{4}-\d{2}-\d{2}$/.test(first)) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(second) || /^\d{4}-\d{2}-\d{2}$/.test(second)) {
        return `${first} to ${second}`;
      }
    }
  }
  
  return str;
};

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentVendor, setCurrentVendor] = useState({});
  const [validityError, setValidityError] = useState('');
  const [deleteVendorId, setDeleteVendorId] = useState(null);
  const [deleteVendorName, setDeleteVendorName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const filteredVendors = vendors
    .filter(vendor =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const statusOrder = { expired: 0, 'expiring-soon': 1, valid: 2, unknown: 3 };
      const statusA = getLicenseStatus(a.validity).status;
      const statusB = getLicenseStatus(b.validity).status;
      return statusOrder[statusA] - statusOrder[statusB];
    });

  const handleDeleteClick = (vendor) => {
    setDeleteVendorId(vendor.id);
    setDeleteVendorName(vendor.name);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteVendorId || isDeleting) return;
    setIsDeleting(true);
    axios.delete(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors/${deleteVendorId}`)
      .then(() => {
        setVendors(vendors.filter(vendor => vendor.id !== deleteVendorId));
        setIsDeleteModalOpen(false);
        setDeleteVendorId(null);
        setDeleteVendorName('');
      })
      .catch(error => {
        console.error('Error deleting vendor:', error);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteVendorId(null);
    setDeleteVendorName('');
  };

  const deleteVendor = (id) => {
    // Kept for backward compatibility but no longer used directly
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
    setValidityError('');
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    // Allow natural typing - no formatting, no validation during input
    setCurrentVendor(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Clear error when user starts typing
    if (name === 'validity') {
      setValidityError('');
    }
  };

  // Optional: format on blur for cleaner display
  const handleValidityBlur = (e) => {
    const formatted = formatValidityOnBlur(e.target.value);
    setCurrentVendor(prevState => ({
      ...prevState,
      validity: formatted
    }));
  };

  const handleUpdateVendor = (e) => {
    e.preventDefault();
    // Validate only on submit
    const validation = validateCompleteValidity(currentVendor.validity);
    if (!validation.valid) {
      setValidityError(validation.error);
      return;
    }
    axios.put(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors/${currentVendor.id}`, { ...currentVendor, validity: currentVendor.validity.trim() })
      .then(() => {
        setVendors(vendors.map(vendor =>
          vendor.id === currentVendor.id ? { ...currentVendor, validity: currentVendor.validity.trim() } : vendor
        ));
        setIsEditModalOpen(false);
        setValidityError('');
      })
      .catch(error => {
        console.error('Error updating vendor:', error);
      });
  };

  const handleAddClick = () => {
    setCurrentVendor({ name: '', address: '', license_no: '', validity: '' });
    setValidityError('');
    setIsAddModalOpen(true);
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    // Allow natural typing - no formatting, no validation during input
    setCurrentVendor(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Clear error when user starts typing
    if (name === 'validity') {
      setValidityError('');
    }
  };

  const handleAddVendor = (e) => {
    e.preventDefault();
    // Validate only on submit
    const validation = validateCompleteValidity(currentVendor.validity);
    if (!validation.valid) {
      setValidityError(validation.error);
      return;
    }
    axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/event/vendors`, { ...currentVendor, validity: currentVendor.validity.trim() })
      .then(response => {
        setVendors([...vendors, { ...currentVendor, validity: currentVendor.validity.trim(), id: response.data.id }]);
        setIsAddModalOpen(false);
        setValidityError('');
      })
      .catch(error => {
        console.error('Error adding vendor:', error);
      });
  };

  const closeModals = () => {
    setIsEditModalOpen(false);
    setIsAddModalOpen(false);
    setCurrentVendor({});
    setValidityError('');
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

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', fontSize: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge style={{ backgroundColor: '#5cb85c', color: '#fff' }}>Valid</StatusBadge>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge style={{ backgroundColor: '#f0ad4e', color: '#333' }}>Expiring Soon</StatusBadge>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge style={{ backgroundColor: '#d9534f', color: '#fff' }}>Expired</StatusBadge>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge style={{ backgroundColor: '#9e9e9e', color: '#fff' }}>Unknown</StatusBadge>
        </span>
      </div>

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
              <TableData>
                <div>{vendor.validity}</div>
                {(() => {
                  const { label, color, bgColor, detail } = getLicenseStatus(vendor.validity);
                  return (
                    <StatusBadge
                      style={{ backgroundColor: bgColor, color }}
                      title={detail}
                    >
                      {label}
                    </StatusBadge>
                  );
                })()}
              </TableData>
              <TableData>
                <ButtonContainer>
                  <Button onClick={() => handleEditClick(vendor)}>
                    <FaEdit style={{ marginRight: '5px' }} />
                  </Button>
                  <Button onClick={() => handleDeleteClick(vendor)} style={{ marginLeft: '10px' }}>
                    <FaTrash style={{ marginRight: '0px' }} />
                  </Button>
                </ButtonContainer>
              </TableData>
            </tr>
          ))}
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
                <ValidityFieldWrapper>
                  <FormInput
                    type="text"
                    name="validity"
                    value={currentVendor.validity || ''}
                    onChange={handleEditChange}
                    onBlur={handleValidityBlur}
                    placeholder="DD-MM-YYYY to DD-MM-YYYY"
                    required
                  />
                  {validityError && <ValidationMessage>{validityError}</ValidationMessage>}
                </ValidityFieldWrapper>
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
                <ValidityFieldWrapper>
                  <FormInput
                    type="text"
                    name="validity"
                    value={currentVendor.validity || ''}
                    onChange={handleAddChange}
                    onBlur={handleValidityBlur}
                    placeholder="DD-MM-YYYY to DD-MM-YYYY"
                    required
                  />
                  {validityError && <ValidationMessage>{validityError}</ValidationMessage>}
                </ValidityFieldWrapper>
              </FormField>
              <SubmitButton type="submit">Add Vendor</SubmitButton>
            </form>
          </Modal>
        </ModalOverlay>
      )}

      {isDeleteModalOpen && (
        <ModalOverlay onClick={cancelDelete}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Delete Vendor</ModalTitle>
              <CloseButton onClick={cancelDelete}><FaTimes /></CloseButton>
            </ModalHeader>
            <DeleteConfirmText>
              Are you sure you want to delete <strong>"{deleteVendorName}"</strong>?
            </DeleteConfirmText>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Button onClick={cancelDelete} style={{ backgroundColor: '#6c757d' }}>
                Cancel
              </Button>
              <Button onClick={confirmDelete} disabled={isDeleting} style={{ backgroundColor: '#d9534f' }}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </Modal>
        </ModalOverlay>
      )}
    </Container>
    </>
  );
};
export default VendorList;