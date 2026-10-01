import React from 'react';
import { useParams } from 'react-router-dom';
import { events } from './data'; 
import styled from 'styled-components';
import EventDetail from './EventDetail';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
`;

const ErrorMessage = styled.p`
  color: red;
  font-size: 1.5rem;
`;

const Page = () => {
  const { id } = useParams();
  const event = events.find(e => e.id === parseInt(id, 10));

  if (!event) {
    return (
      <Container>
        <ErrorMessage>Event not found</ErrorMessage>
      </Container>
    );
  }


  return (
    <Container>
      <EventDetail event={event} />
    </Container>
  );
};

export default Page;
