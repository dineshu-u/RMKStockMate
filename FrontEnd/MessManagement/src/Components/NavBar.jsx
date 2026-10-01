import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/RMK.png';

const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 10px 1% 10px 1.3%;
  background-color: #164863;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: aliceblue;
  z-index: 100;
`;

const Logo = styled.img`
  width: 50px;
  height: 70px;
`;

const LogoLink = styled.a`
  text-decoration: none;
`;

const LogoText = styled.div`
  color: aliceblue;
  font-weight: 700;
  font-size: 30px;
  margin-top: 10px;
`;

const Left = styled.nav`
  display: flex;
  gap: 10px;
`;

const Alig = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;

  h5 {
    margin-top: 8px;
  }
`;

const LogoutButton = styled.button`
  background-color: #ff4b5c;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 8px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s ease;

  &:hover {
    background-color: #ff1f3a;
    transform: scale(1.05);
  }

  &:active {
    background-color: #d90429;
    transform: scale(0.95);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 75, 92, 0.4);
  }
`;

function NavBar() {
  const navigate = useNavigate();

  const handleLogout = () => {

    navigate('/');
  };

  return (
    <Header>
      <Left>
        <Logo src={logo} alt="Logo" />
        <LogoLink href="/dashboard">
          <LogoText>R.M.K. GROUP OF INSTITUTIONS</LogoText>
        </LogoLink>
      </Left>
      <Alig>
        <h5>{window.sessionStorage.getItem("uname")}</h5>
        <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
      </Alig>
    </Header>
  );
}

export default NavBar;
