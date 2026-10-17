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

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  width: 100%;
`;

const MainFrame = styled.div`
  margin-top: 0;
  flex: 1;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 1rem;
  background-color: #f4f4f4;
`;

const Footer = styled.footer`
  text-align: center;
  padding: 12px;
  background-color: #164863;
  color: white;
  margin-top: auto;
`;

const Layout = () => {
    return (
        <LayoutContainer>
            <NavBar />
            <MainContent>
                <aside>
                    <SideBar />
                </aside>
                <ContentArea>
                    <Navigation />
                    <MainFrame>
                        <Outlet />
                        <BackToTopButton />
                    </MainFrame>
                </ContentArea>
            </MainContent>
            <Footer>
                Copyright © 2024. All rights reserved to DEPARTMENT of INFORMATION TECHNOLOGY - RMKEC
            </Footer>
        </LayoutContainer>
    );
}

export default Layout;
