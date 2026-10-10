import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SendButton = styled.button`
  background-color: #FF9800;
  border: none;
  color: white;
  padding: 12px 26px;
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

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Shared "Send Report" button + modal for any report print page.
// The backend regenerates the report data and emails a branded PDF
// (same formatting as the item-wise comparison mail).
// Props:
//   reportType     - 'monthly' | 'category' | 'comparison' | 'categorycomparison'
//   params         - date params object { fromDate, toDate, fromDate1, toDate1, fromDate2, toDate2 }
//   fileName       - PDF attachment file name (displayed and used by backend)
//   defaultSubject / defaultMessage - pre-filled email content
export const SendReportButton = ({ reportType, params = {}, fileName, defaultSubject, defaultMessage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);

  const attachmentFileName = fileName || `${reportType}_report.pdf`;

  const openModal = () => {
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setRecipientEmail('');
  };

  const handleSend = async () => {
    if (!validateEmail(recipientEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);

    try {
      await axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/email/send-pdf-report`, {
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
        reportType,
        fileName: attachmentFileName,
        ...params
      });

      toast.success(`Report sent successfully to ${recipientEmail}`);
      closeModal();
    } catch (error) {
      console.error('Error sending report:', error);
      const errorMsg = error.response?.data?.message || 'Failed to send report. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <SendButton onClick={openModal} disabled={isSending}>Send Report</SendButton>

      {isModalOpen && (
        <ModalOverlay onClick={closeModal}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Send Report</ModalTitle>
            <ModalSubtitle>Enter recipient details to send the report via email</ModalSubtitle>

            <FormGroup>
              <Label htmlFor="send-recipientEmail">To (Recipient Email) *</Label>
              <Input
                id="send-recipientEmail"
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                autoFocus
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="send-subject">Subject</Label>
              <Input
                id="send-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="send-message">Message (Optional)</Label>
              <TextArea
                id="send-message"
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
              </svg>
              <span>{attachmentFileName}</span>
            </AttachmentInfo>

            <ModalActions>
              <CancelButton onClick={closeModal} disabled={isSending}>Cancel</CancelButton>
              <SendModalButton onClick={handleSend} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send Report'}
              </SendModalButton>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}

      <ToastContainer position="top-right" autoClose={4000} />
    </>
  );
};

export default SendReportButton;
