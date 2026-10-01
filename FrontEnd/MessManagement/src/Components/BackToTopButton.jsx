import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import arrow from '../assets/arrow.png'
const Button = styled.div`
  position: fixed;
  bottom: 50px;
  right: 50px;
  width: 40px;
  height: 40px;
  background-color: #164863;
  color: white;
  text-align: center;
  border-radius: 100%;
  cursor: pointer;
  z-index: 1000;
  display: ${({ isVisible }) => (isVisible ? 'block' : 'none')};
  transition: opacity 0.3s, transform 0.3s;

  &:hover {
    background-color: #0d324a;
    transform: scale(1.1);
  }
`;

const Image = styled.img`
  width: 90%;
  height: 90%;
  margin-top: 6%;
  margin-left:2%;
`;

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <Button isVisible={isVisible} onClick={scrollToTop}>
      <Image src={arrow} alt="Back to Top"  />
    </Button>
  );
};

export default BackToTopButton;
