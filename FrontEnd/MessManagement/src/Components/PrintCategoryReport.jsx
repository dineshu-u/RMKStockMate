import React, { useRef, useState } from 'react';
import ReactToPrint from 'react-to-print';
import styled, { createGlobalStyle } from 'styled-components';
import { CategoryReport } from './CategoryReport';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Test = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px; 
  top: 150px; 
  z-index: 10; 
  padding: 10px;
  border-radius:
`;

const ReportContainer = styled.div`
  margin-top: 80px; 
  width: 100%;
  max-height: 80vh; 
  overflow-y: auto; 
`;

// Unscoped so the rule also matches inside the print iframe created by
// ReactToPrint (which renders only the .print-container subtree, without
// this page's wrapper elements). The heading carries the class directly.
const PrintStyles = createGlobalStyle`
  @media print {
    .print-college-name {
      display: none;
    }
  }
`;

const PrintButton = styled.button`
  background-color: #4CAF50; 
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s, box-shadow 0.3s;

  &:hover {
    background-color: #45a049;
    box-shadow: 0 8px 10px rgba(0, 0, 0, 0.2);
  }

  &:active {
    background-color: #3e8e41;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    transform: translateY(2px);
  }
`;

const ExportButton = styled.button`
  background-color: #2196F3; 
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s, box-shadow 0.3s;

  &:hover {
    background-color: #1976D2;
    box-shadow: 0 8px 10px rgba(0, 0, 0, 0.2);
  }

  &:active {
    background-color: #1565C0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    transform: translateY(2px);
  }
`;

const SendButton = styled.button`
  background-color: #FF9800;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;

  &:hover:not(:disabled) {
    background-color: #F57C00;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
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
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.2s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalTitle = styled.h2`
  margin: 0 0 10px;
  color: #164863;
  font-size: 1.4rem;
`;

const ModalSubtitle = styled.p`
  margin: 0 0 25px;
  color: #64748b;
  font-size: 0.95rem;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #334155;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: #164863;
    box-shadow: 0 0 0 3px rgba(22, 72, 99, 0.15);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: #164863;
    box-shadow: 0 0 0 3px rgba(22, 72, 99, 0.15);
  }
`;

const AttachmentInfo = styled.div`
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  color: #475569;

  svg {
    color: #164863;
    flex-shrink: 0;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const CancelButton = styled.button`
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background-color: #e2e8f0;
  }
`;

const SendModalButton = styled.button`
  background-color: #164863;
  border: none;
  color: white;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: #0d3449;
  }

  &:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
  }
`;

const PrintCategoryReport = () => {
  const reportRef = useRef();
  const location = useLocation();
  const { fromDate, toDate } = location.state || {};

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('RMKStockMate - Category-wise Summary Report');
  const [message, setMessage] = useState('Please find attached the Category-wise Summary Report.');
  const [isSending, setIsSending] = useState(false);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const getReportData = () => {
    // This component is used for the Category-wise Summary (single date range)
    if (fromDate && toDate) {
      return {
        fdate: fromDate,
        tdate: toDate,
        reportType: 'summary'
      };
    }
    return null;
  };

  const handleSendReport = async () => {
    if (!validateEmail(recipientEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    const reportData = getReportData();
    if (!reportData) {
      toast.error('Date ranges not available');
      return;
    }

    setIsSending(true);

    try {
      const params = {
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
        ...reportData
      };

      await axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/category/send-report`, params);
      toast.success(`Report sent successfully to ${recipientEmail}`);
      setIsSendModalOpen(false);
      setRecipientEmail('');
    } catch (error) {
      console.error('Error sending report:', error);
      const errorMsg = error.response?.data?.message || 'Failed to send report. Please check email configuration and try again.';
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const openSendModal = () => {
    setIsSendModalOpen(true);
  };

  const closeSendModal = () => {
    setIsSendModalOpen(false);
    setRecipientEmail('');
    setSubject('RMKStockMate - Category-wise Summary Report');
    setMessage('Please find attached the Category-wise Summary Report.');
  };

  const attachmentFileName = (() => {
    const reportData = getReportData();
    if (!reportData) return 'Category_Report.pdf';
    return `RMKStockMate_Category_Summary_${reportData.fdate}_to_${reportData.tdate}.pdf`;
  })();

  const handleExport = () => {
    const ws = XLSX.utils.table_to_sheet(reportRef.current.querySelector('table'));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Category Report');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Category_Report.xlsx');
  };

  return (
    <Test>
      <PrintStyles />
      <ButtonContainer>
        <ReactToPrint
          trigger={() => <PrintButton>Print Category Report</PrintButton>}
          content={() => reportRef.current}
        />
        <ExportButton onClick={handleExport}>Export to Excel</ExportButton>
        <SendButton onClick={openSendModal} disabled={isSending}>Send Report</SendButton>
      </ButtonContainer>
      <ReportContainer>
        <CategoryReport ref={reportRef} fromDate={fromDate} toDate={toDate} />
      </ReportContainer>

      {isSendModalOpen && (
        <ModalOverlay onClick={closeSendModal}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Send Category-wise Summary Report</ModalTitle>
            <ModalSubtitle>Enter recipient details to send the Category-wise Summary Report via email</ModalSubtitle>

            <FormGroup>
              <Label htmlFor="recipientEmail">To (Recipient Email) *</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="vicechairman@gmail.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                autoFocus
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="message">Message (Optional)</Label>
              <TextArea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional message to include in the email..."
              />
            </FormGroup>

            <AttachmentInfo>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>{attachmentFileName}</span>
            </AttachmentInfo>

            <ModalActions>
              <CancelButton onClick={closeSendModal} disabled={isSending}>Cancel</CancelButton>
              <SendModalButton onClick={handleSendReport} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send Report'}
              </SendModalButton>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}

      <ToastContainer position="top-right" autoClose={4000} />
    </Test>
  );
};

export default PrintCategoryReport;
