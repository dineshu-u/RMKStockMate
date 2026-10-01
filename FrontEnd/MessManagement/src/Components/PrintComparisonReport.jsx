import React, { useRef } from 'react';
import ReactToPrint from 'react-to-print';
import styled from 'styled-components';
import { ComparisonReport } from './ComparisonReport';
import { useLocation } from 'react-router-dom';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const Test = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
  z-index: 10;
`;

const ReportContainer = styled.div`
  width: 100%;
  max-height: 80vh; 
  overflow-y: auto; 
`;

const PrintButton = styled.button`
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 12px 24px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #45a049;
  }
`;

const ExportButton = styled.button`
  background-color: #2196F3;
  border: none;
  color: white;
  padding: 12px 24px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #1976D2;
  }
`;

const PrintComparisonReport = () => {
  const reportRef = useRef();
  const location = useLocation();
  const { fromDate, toDate } = location.state || {};

  const handleExport = () => {
    if (!reportRef.current) return;
    const table = reportRef.current.querySelector('table');
    if (!table) return;
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparison Report');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Comparison_Report.xlsx');
  };

  return (
    <Test>
      <ButtonContainer>
        <ReactToPrint
          trigger={() => <PrintButton>Print Comparison Report</PrintButton>}
          content={() => reportRef.current}
        />
        <ExportButton onClick={handleExport}>Export to Excel</ExportButton>
      </ButtonContainer>
      <ReportContainer>
        <ComparisonReport ref={reportRef} fromDate={fromDate} toDate={toDate} />
      </ReportContainer>
    </Test>
  );
};

export default PrintComparisonReport;