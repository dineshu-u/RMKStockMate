import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import backgroundImage from '../assets/Front.jpg';
import logo from '../assets/Logo.png';

const PageWrapper = styled.div`
  background-image: url(${backgroundImage});
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  background-size: cover;
  width: 100%;
  height: 100vh; 
`;

const SignupForm = styled.div`
  position: absolute;
  top: 50%;
  left: 20%;
  transform: translate(-50%, -50%);
  background-color: rgba(244, 244, 244, 0.9);
  padding: 60px 30px;
  border-radius: 20px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 300px;
  max-width: 90%;
`;

const FlowerLogo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
`;

const LogoImage = styled.img`
  width: 200px;
  height: 100px;
  border-radius: 20px;
  background-color: transparent;
  margin-bottom: 10px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

const SubmitButton = styled.button`
  background-color: #1e620a;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-left: 33%;
`;

const ErrorMessage = styled.div`
  color: red;
  margin-top: 20px;
  font-size: 18px;
  text-align: center;
`;

function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Viewer'); 
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${import.meta.env.VITE_RMK_MESS_URL}/signup`, {
        username,
        password,
        role
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);

        navigate('/login');
        toast.success('Signup successful!');
        setError('');
      }
    } catch (error) {
      setError('Error signing up. Username may already exist.');
    }
  };

  return (
    <PageWrapper>
      <SignupForm>
        <FlowerLogo>
          <LogoImage src={logo} alt="Logo" />
        </FlowerLogo>
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Input
              type="text"
              id="username"
              placeholder="USERNAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-label="Username"
            />
          </FormGroup>
          <FormGroup>
            <Input
              type="password"
              id="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
            />
          </FormGroup>
          <FormGroup>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Role"
            >
              <option value="Viewer">Viewer</option>
              <option value="Editor">Editor</option>
            </select>
          </FormGroup>
          <SubmitButton type="submit">Sign up</SubmitButton>
        </form>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </SignupForm>
      <ToastContainer />
    </PageWrapper>
  );
}

export default SignupPage;
