import React from 'react';
import styled from 'styled-components';

const NavigationContainer = styled.div`
  margin-top: 90px;
  height: 50px;
  background-color: #D0E8F0;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 10px 20px;
  color: #808080;
  font-size: 30px;
  font-weight: 600;
`;

function Navigation() {
  return (
    <NavigationContainer>
      FOOD MANAGEMENT SYSTEM
    </NavigationContainer>
  );
}

export default Navigation;
