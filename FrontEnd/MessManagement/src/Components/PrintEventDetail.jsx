import React, { useRef } from 'react';
import ReactToPrint from 'react-to-print';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import EventDetail from './EventDetail';

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
  margin-bottom: 20px;
  top: 150px;
  z-index: 10;
`;

const ReportContainer = styled.div`
  margin-top: 80px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

const PrintButton = styled.button`
  background-color: #4caf50;
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
  background-color: #2196f3;
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
    background-color: #1976d2;
    box-shadow: 0 8px 10px rgba(0, 0, 0, 0.2);
  }

  &:active {
    background-color: #1565c0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    transform: translateY(2px);
  }
`;

const PrintEventDetail = () => {
  const eventDetailRef = useRef();
  const { eventId } = useParams();

  const handleExport = () => {
    const table = eventDetailRef.current.querySelector('table');
    if (table) {
      const ws = XLSX.utils.table_to_sheet(table);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Event Detail');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `Event_Detail_${eventId}.xlsx`);
    } else {
      console.error('No table found for export');
    }
  };

  return (
    <Test>
      <ButtonContainer>
        <ReactToPrint
          trigger={() => <PrintButton>Print Event Details</PrintButton>}
          content={() => eventDetailRef.current}
        />
        <ExportButton onClick={handleExport}>Export to Excel</ExportButton>
      </ButtonContainer>
      <ReportContainer ref={eventDetailRef}>
        <EventDetail />
      </ReportContainer>
    </Test>
  );
};

export default PrintEventDetail;
