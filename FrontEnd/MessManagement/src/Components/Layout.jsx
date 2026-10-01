import React from "react";
import { Outlet } from 'react-router-dom';
import NavBar from "./NavBar";
import styled from 'styled-components';
import Navigation from "./Navigation";
import SideBar from "./SideBar";
import BackToTopButton from "./BackToTopButton";

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
`;

const MainFrame = styled.div`
  margin-top: 0;
  width: 100%;
  height: 100%;
  padding: 1rem;
  max-height: 100%;
  min-width: 93.45vw;
  background-color: #f4f4f4;
`;

const Footer = styled.footer`
    text-align: center;
    padding: 10px;
    background-color: #164863;
    color: white;
    margin-top: 130px;
`;

const Layout = () => {
    return (
        <LayoutContainer>
            <NavBar />
            <MainContent>
                <aside>
                    <SideBar />
                </aside>
                <div className="pr">
                    <Navigation />
                    <MainFrame>
                        <Outlet />
                        <BackToTopButton/>
                    </MainFrame>
                </div>
            </MainContent>
            <Footer>
                Copyright © 2024. All rights reserved to DEPARTMENT of INFORMATION TECHNOLOGY - RMKEC
            </Footer>
        </LayoutContainer>
    );
}

export default Layout;
