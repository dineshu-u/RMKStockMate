import React, { useRef } from 'react';
import ReactToPrint from 'react-to-print';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { CategoryComparison } from './CategoryComparison';
import { SendReportButton } from './SendReportButton';

const Test = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px; /* Space between buttons */
  margin: 20px 0; /* Space around buttons */
  z-index: 10; /* Ensure buttons are above other content */
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
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
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
  background-color: #2196F3; /* Blue */
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
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

const PrintCategoryComparison = () => {
  const reportRef = useRef();
  const location = useLocation();
  const { fromDate, toDate, fromDate1, toDate1, fromDate2, toDate2 } = location.state || {};

  const handleExport = () => {
    const ws = XLSX.utils.table_to_sheet(reportRef.current.querySelector('table'));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Category Comparison Report');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'CategoryComparison_Report.xlsx');
  };

  const pdfFileName = fromDate1 && toDate2
    ? `RMKStockMate_Category_Comparison_Report_${fromDate1}_to_${toDate2}.pdf`
    : 'RMKStockMate_Category_Comparison_Report.pdf';

  // Must mirror the date fallback inside CategoryComparison so the emailed
  // PDF is generated from the same periods that are displayed on screen.
  const defaultF1 = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
  const defaultT1 = dayjs().subtract(1, 'month').startOf('month').add(3, 'day').format('YYYY-MM-DD');
  const defaultF2 = dayjs().startOf('month').format('YYYY-MM-DD');
  const defaultT2 = dayjs().startOf('month').add(3, 'day').format('YYYY-MM-DD');

  const emailParams = (fromDate1 && toDate1 && fromDate2 && toDate2)
    ? { fromDate1, toDate1, fromDate2, toDate2 }
    : (fromDate && toDate)
      ? { fromDate, toDate }
      : { fromDate1: defaultF1, toDate1: defaultT1, fromDate2: defaultF2, toDate2: defaultT2 };

  return (
    <Test>
      <ButtonContainer>
        <ReactToPrint
          trigger={() => <PrintButton>Print Comparison Report</PrintButton>}
          content={() => reportRef.current}
        />
        <ExportButton onClick={handleExport}>Export to Excel</ExportButton>
        <SendReportButton
          reportType="categorycomparison"
          params={emailParams}
          fileName={pdfFileName}
          defaultSubject="RMKStockMate - Category Comparison Report"
          defaultMessage="Please find attached the Category Comparison Report."
        />
      </ButtonContainer>
      <ReportContainer>
        <CategoryComparison ref={reportRef} fromDate={fromDate} toDate={toDate}/>
      </ReportContainer>
    </Test>
  );
};

export default PrintCategoryComparison;
