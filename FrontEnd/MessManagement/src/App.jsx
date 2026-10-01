import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './Components/LoginPage'
import Layout from "./Components/Layout";
import Dispatch from "./Components/Dispatch";
import Purchase from "./Components/Purchase.jsx";
import AvailableStock from "./Components/AvailableStock.jsx";
import Reports from "./Components/Reports.jsx";
import AddItems from "./Components/AddItems.jsx";
import PrintMonthlyReport from "./Components/PrintMonthlyReport.jsx";
import PrintCategoryReport from "./Components/PrintCategoryReport.jsx";
import PrintItemReport from "./Components/PrintItemReport.jsx";
import PrintComparisonReport from "./Components/PrintComparisonReport.jsx";
import AddEvent from "./Components/AddEvent.jsx";
import EventList from "./Components/EventList.jsx";
import EventDetail from "./Components/EventDetail.jsx";
import DashBoard from "./Components/Dashboard.jsx";
import SignupPage from "./Components/SignUp.jsx";
import PrintCategoryComparison from "./Components/PrintCategoryComparison.jsx";
import VendorList from "./Components/VendorList.jsx";
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <div className='app'>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path='/' element={<LoginPage />} />
          <Route path='/adminsignUp' element={<SignupPage/>} />
          <Route path="/dashboard/*" element={<Layout />}>
            <Route index element={<DashBoard/>} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="purchase" element={<Purchase/>} />
            <Route path="available" element={<AvailableStock />} />
            <Route path="reports" element={<Reports />} />
            <Route path="add" element={<AddItems />} />
            <Route path="reports/monthly" element={<PrintMonthlyReport />} />
            <Route path="reports/category-wise" element={<PrintCategoryReport />} />
            <Route path="reports/item-wise" element={<PrintItemReport />} />
            <Route path="reports/comparison" element={<PrintComparisonReport />} />
            <Route path="reports/categorycomparison" element={<PrintCategoryComparison/>} />
            <Route path="addevents" element={<AddEvent />} />
            <Route path="eventlist" element={<EventList />} />
            <Route path="eventlist/:eventId" element={<EventDetail/>} /> 
            <Route path="vendors" element={<VendorList/>}/>
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
