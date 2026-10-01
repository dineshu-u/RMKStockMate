import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import purchase from '../assets/purchase.png';
import dispatch from '../assets/dispatch.png';
import Available from '../assets/Available.png';
import reports from '../assets/reports.png';
import add from '../assets/add.png';
import menu from '../assets/menu.png';
import view from '../assets/view.png';
import dashboard from '../assets/dashboard.png';
import vendor from '../assets/vendor.png';
const SidebarContainer = styled.div`
  background-color: white;
  min-height: 100vh; 
  width: 85px;
  display: flex;
  flex-direction: column;
  margin-top: 70px;
  left: 0;
  z-index: 10;
  transition: left 0.3s ease-in-out;
  padding-top: 20px;
  overflow-y: auto;
`;

const SidebarList = styled.ul`
  list-style: none;
  padding: 0px;
`;

const SidebarItem = styled.li`
  margin-bottom: 10px;

  &.active a {
    background-color: #D0E8F0;
  }

  a {
    font-size: 10px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    padding: 10px 5px;
    border-radius: 5px;
    text-decoration: none;
    color: black;
    font-weight: 200;
    transition: background-color 0.3s ease-in-out;

    &:hover {
      background-color: #D0E8F0;
    }
  }

  a img {
    margin-bottom: 5px;
  }
`;

const SideBar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';
  const role=window.sessionStorage.getItem("role");
  console.log(role);
  return (
    <SidebarContainer>
      <SidebarList>
        <SidebarItem className={isActive('/dashboard')}>
          <Link to="/dashboard">
            <img src={dashboard} width="40px" height="40px" alt="dashboard" />
            Dashboard
          </Link>
        </SidebarItem>
        {role!=="Viewer" && (<SidebarItem className={isActive('/dashboard/purchase')}>
          <Link to="./purchase">
            <img src={purchase} width="40px" height="40px" alt="Purchase" />
            Purchase
          </Link>
        </SidebarItem>)}
        {role!=="Viewer" && (<SidebarItem className={isActive('/dashboard/dispatch')}>
          <Link to="./dispatch">
            <img src={dispatch} width="60px" height="40px" alt="Dispatch" />
            Dispatch
          </Link>
        </SidebarItem>)}
        <SidebarItem className={isActive('/dashboard/available')}>
          <Link to="available">
            <img src={Available} width="40px" height="40px" alt="Available Stock" />
            Available Stock
          </Link>
        </SidebarItem>
        <SidebarItem className={isActive('/dashboard/reports')}>
          <Link to="reports">
            <img src={reports} width="40px" height="40px" alt="Reports" />
            Reports
          </Link>
        </SidebarItem>
        {role!=="Viewer" && (<SidebarItem className={isActive('/dashboard/add')}>
          <Link to="add">
            <img src={add} width="40px" height="40px" alt="Add Items" />
            Add Items
          </Link>
        </SidebarItem>)}
        {role!=="Viewer" &&  (<SidebarItem className={isActive('/dashboard/addevents')}>
          <Link to="addevents">
            <img src={menu} width="40px" height="40px" alt="Add Event menu" />
            Add Event menu
          </Link>
        </SidebarItem>)}
        <SidebarItem className={isActive('/dashboard/eventlist')}>
          <Link to="eventlist">
            <img src={view} width="40px" height="40px" alt="View Event menu" />
            View Event menu
          </Link>
        </SidebarItem>
        <SidebarItem className={isActive('/dashboard/vendors')}>
          <Link to="vendors">
            <img src={vendor} width="40px" height="40px" alt="Vendor Details" />
           Vendor Details
          </Link>
        </SidebarItem>
        {role==="Admin" &&  (<SidebarItem className={isActive('/adminsignup')}>
          <Link to="/adminsignup">
            <img src={menu} width="40px" height="40px" alt="Add Event menu" />
            Create users
          </Link>
        </SidebarItem>)}
      </SidebarList>
    </SidebarContainer>
  );
}

export default SideBar;
