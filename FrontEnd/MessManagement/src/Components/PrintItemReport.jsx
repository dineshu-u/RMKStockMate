import React, { useRef } from 'react';
import ReactToPrint from 'react-to-print';
import styled from 'styled-components';
import { ItemReport } from './ItemReport';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  padding: 12px 26px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;

  &:hover {
    background-color: #45a049;
  }
`;

const ExportButton = styled.button`
  background-color: #2196F3;
  border: none;
  color: white;
  padding: 12px 26px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;

  &:hover {
    background-color: #1976D2;
  }
`;

const PrintItemReport = () => {
  const reportRef = useRef();
  const location = useLocation();
  const { fromDate, toDate, fromDate1, toDate1, fromDate2, toDate2 } = location.state || {};

  const handleExport = () => {
    if (!reportRef.current) return;
    const tables = reportRef.current.querySelectorAll('table');
    if (tables.length === 0) return;
    const wb = XLSX.utils.book_new();
    tables.forEach((table, idx) => {
      const itemTitle = table.closest('.item-section')?.querySelector('h2')?.innerText || `Item_${idx + 1}`;
      const sheetName = itemTitle.replace(/[\\/*?:[\]]/g, '').slice(0, 31);
      const ws = XLSX.utils.table_to_sheet(table);
      XLSX.utils.book_append_sheet(wb, ws, sheetName || `Item_${idx + 1}`);
    });
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Multi_Item_Comparison_Report.xlsx');
  };

  return (
    <Test>
      <ButtonContainer>
        <ReactToPrint
          trigger={() => <PrintButton>Print Item Comparison</PrintButton>}
          content={() => reportRef.current}
        />
        <ExportButton onClick={handleExport}>Export to Excel</ExportButton>
      </ButtonContainer>
      <ReportContainer>
        <ItemReport 
          ref={reportRef} 
          fromDate={fromDate} 
          toDate={toDate}
          fromDate1={fromDate1}
          toDate1={toDate1}
          fromDate2={fromDate2}
          toDate2={toDate2}
        />
      </ReportContainer>
    </Test>
  );
};

export default PrintItemReport;