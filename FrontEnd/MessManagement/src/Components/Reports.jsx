import React, { useState } from 'react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ReportsContainer = styled.div`
  padding: 10px 20px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ReportsHeader = styled.h1`
  margin-bottom: 20px;
  color: #164863;
  margin-top: 0px;
  font-size: 2.1rem;
`;

const SectionTitle = styled.h2`
  width: 100%;
  max-width: 950px;
  text-align: left;
  color: #164863;
  font-size: 1.3rem;
  margin: 25px 0 15px;
  padding-bottom: 6px;
  border-bottom: 2px solid #164863;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 25px;
  width: 100%;
  max-width: 950px;

  @media (max-width: 868px) {
    grid-template-columns: 1fr;
  }
`;

const ReportCardContainer = styled.div`
  background-color: #ffffff;
  padding: 22px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #e1e8ed;
  height: 100%;
`;

const ReportCardTitle = styled.h2`
  margin-bottom: 14px;
  color: #164863;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
`;

const DatePickerContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 16px;

  .MuiFormControl-root {
    margin-bottom: 10px;
  }
`;

const PeriodBox = styled.div`
  width: 100%;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
  text-align: left;

  h4 {
    margin: 0 0 6px;
    font-size: 0.88rem;
    color: #164863;
    font-weight: bold;
  }
`;

const FetchButton = styled.button`
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 22px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.3s ease;
  width: 100%;
  max-width: 220px;
  margin-top: auto;

  &:hover {
    background-color: #45a049;
  }
`;

// Single Date Range Card (for Monthly Ledger, Category-wise Summary)
const SingleDateReportCard = ({ title, route, buttonText = "Fetch Report" }) => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const navigate = useNavigate();

  const handleFetch = () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both From and To dates.');
      return;
    }

    const formattedFromDate = dayjs(fromDate).format('YYYY-MM-DD');
    const formattedToDate = dayjs(toDate).format('YYYY-MM-DD');
    navigate(route, { state: { fromDate: formattedFromDate, toDate: formattedToDate } });
  };

  return (
    <ReportCardContainer>
      <ReportCardTitle>{title}</ReportCardTitle>
      <DatePickerContainer>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DemoContainer components={['DatePicker']}>
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(newValue) => setFromDate(newValue)}
              format="YYYY-MM-DD"
            />
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(newValue) => setToDate(newValue)}
              format="YYYY-MM-DD"
            />
          </DemoContainer>
        </LocalizationProvider>
      </DatePickerContainer>
      <FetchButton onClick={handleFetch}>{buttonText}</FetchButton>
    </ReportCardContainer>
  );
};

// Dual Exact Date Range Card (for Item-Wise, Category, and Monthly Matrix Comparison)
const DualDateComparisonCard = ({ title, route, buttonText = "Compare Periods" }) => {
  const [fromDate1, setFromDate1] = useState(null);
  const [toDate1, setToDate1] = useState(null);
  const [fromDate2, setFromDate2] = useState(null);
  const [toDate2, setToDate2] = useState(null);
  const navigate = useNavigate();

  const handleFetch = () => {
    if (!fromDate1 || !toDate1 || !fromDate2 || !toDate2) {
      toast.error('Please select exact From and To dates for both Period 1 and Period 2.');
      return;
    }

    const f1 = dayjs(fromDate1).format('YYYY-MM-DD');
    const t1 = dayjs(toDate1).format('YYYY-MM-DD');
    const f2 = dayjs(fromDate2).format('YYYY-MM-DD');
    const t2 = dayjs(toDate2).format('YYYY-MM-DD');

    navigate(route, {
      state: {
        fromDate1: f1,
        toDate1: t1,
        fromDate2: f2,
        toDate2: t2
      }
    });
  };

  return (
    <ReportCardContainer>
      <ReportCardTitle>{title}</ReportCardTitle>
      <DatePickerContainer>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <PeriodBox>
            <h4>Period 1 (Exact Date Range)</h4>
            <DemoContainer components={['DatePicker']}>
              <DatePicker
                label="Period 1 From"
                value={fromDate1}
                onChange={(newValue) => setFromDate1(newValue)}
                format="YYYY-MM-DD"
              />
              <DatePicker
                label="Period 1 To"
                value={toDate1}
                onChange={(newValue) => setToDate1(newValue)}
                format="YYYY-MM-DD"
              />
            </DemoContainer>
          </PeriodBox>

          <PeriodBox>
            <h4>Period 2 (Exact Date Range)</h4>
            <DemoContainer components={['DatePicker']}>
              <DatePicker
                label="Period 2 From"
                value={fromDate2}
                onChange={(newValue) => setFromDate2(newValue)}
                format="YYYY-MM-DD"
              />
              <DatePicker
                label="Period 2 To"
                value={toDate2}
                onChange={(newValue) => setToDate2(newValue)}
                format="YYYY-MM-DD"
              />
            </DemoContainer>
          </PeriodBox>
        </LocalizationProvider>
      </DatePickerContainer>
      <FetchButton onClick={handleFetch}>{buttonText}</FetchButton>
    </ReportCardContainer>
  );
};

const Reports = () => {
  return (
    <>
      <ReportsContainer>
        <ReportsHeader>REPORTS DASHBOARD</ReportsHeader>

        {/* 1. Comparison Reports Section (2 Columns: Row 1 = Item-wise & Category; Row 2 = Monthly Matrix) */}
        <SectionTitle>Comparison & Period Analysis Reports</SectionTitle>
        <TwoColumnGrid>
          <DualDateComparisonCard 
            title="Item-wise Comparison" 
            route="/dashboard/reports/item-wise" 
          />
          <DualDateComparisonCard 
            title="Category Comparison" 
            route="/dashboard/reports/categorycomparison" 
          />
          <DualDateComparisonCard 
            title="Monthly Matrix Comparison" 
            route="/dashboard/reports/comparison" 
            buttonText="Compare Month Ranges"
          />
        </TwoColumnGrid>

        {/* 2. Standard Ledger Reports Section (2 Columns) */}
        <SectionTitle>Standard Ledger & Summary Reports</SectionTitle>
        <TwoColumnGrid>
          <SingleDateReportCard 
            title="Monthly Ledger Report" 
            route="/dashboard/reports/monthly" 
          />
          <SingleDateReportCard 
            title="Category-wise Summary" 
            route="/dashboard/reports/category-wise" 
          />
        </TwoColumnGrid>
      </ReportsContainer>
      <ToastContainer />
    </>
  );
};

export default Reports;
