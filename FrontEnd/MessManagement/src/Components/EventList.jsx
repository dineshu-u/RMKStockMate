import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import { FaSearch } from 'react-icons/fa';
import dayjs from 'dayjs';
const Container = styled.div`
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 20px;
  color: #164863;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const SearchInput = styled.input`
  flex-grow: 1;
  padding: 10px;
  border: none;
  outline: none;
  font-size: 1rem;
`;

const EventItem = styled(Link)`
  display: flex;
  justify-content: space-between;
  padding: 15px;
  margin-bottom: 10px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  text-decoration: none;
  color: #333;
  &:hover {
    background: #f1f1f1;
  }
`;

const EventList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_RMK_MESS_URL}/event/events`)
      .then(response => {
        setEvents(response.data);
      })
      .catch(error => {
        console.error('Error fetching events:', error);
      });
  }, []);

  const filteredEvents = events.filter(event =>
    event.event_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container>
      <Title>Events</Title>
      <SearchContainer>
        <FaSearch />
        <SearchInput
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchContainer>
      {filteredEvents.map(event => (
        <EventItem key={event.id} to={`/dashboard/eventlist/${event.id}`}>
          <span>{event.event_name}</span>
          <span>{dayjs(event.event_date).format("DD-MM-YYYY")}</span>
        </EventItem>
      ))}
    </Container>
  );
};

export default EventList;
