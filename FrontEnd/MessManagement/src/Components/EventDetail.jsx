import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import {
  FaCalendarAlt,
  FaSchool,
  FaPrint,
  FaUsers,
  FaUtensils,
  FaRegCalendarAlt,
} from 'react-icons/fa';
import dayjs from 'dayjs';
import Logo from '../assets/Logo.png';
import { useReactToPrint } from 'react-to-print';

// --- Page & Card Layout ---

const PageWrapper = styled.div`
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 10px 20px 40px;
  display: flex;
  flex-direction: column;
`;

const PrintButton = styled.button`
  align-self: flex-start;
  margin-bottom: 16px;
  padding: 9px 22px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #ffffff;
  background-color: #0f3756;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 2px 4px rgba(15, 55, 86, 0.2);
  transition: background-color 0.2s ease, transform 0.1s ease;

  &:hover {
    background-color: #09253b;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const EventCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(15, 55, 86, 0.08);
  border: 1px solid #e1e8ed;
  padding: 32px 36px 36px;
  display: flex;
  flex-direction: column;
  gap: 22px;

  @media (max-width: 768px) {
    padding: 20px 18px;
  }
`;

// --- Card Header / Title ---

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const EventTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #103b5c;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 0;

  .title-icon {
    font-size: 1.9rem;
    color: #103b5c;
  }

  @media (max-width: 768px) {
    font-size: 1.35rem;
    .title-icon {
      font-size: 1.45rem;
    }
  }
`;

const TitleDivider = styled.hr`
  width: 100%;
  border: none;
  border-top: 1px solid #eef2f5;
  margin: 20px 0 0 0;
`;

// --- Event Information (Left info + Right date panel) ---

const EventInfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const EventInfoLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 1.28rem;
  font-weight: 700;
  color: #103b5c;

  .info-icon {
    font-size: 1.45rem;
    color: #103b5c;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    font-size: 1.1rem;
    .info-icon {
      font-size: 1.25rem;
    }
  }
`;

const VerticalDivider = styled.div`
  width: 1px;
  align-self: stretch;
  background-color: #eef2f5;

  @media (max-width: 768px) {
    display: none;
  }
`;

const DatePanel = styled.div`
  background: #eaf3fb;
  border-radius: 12px;
  padding: 16px 28px;
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 250px;
  justify-content: flex-start;

  .date-calendar-icon {
    font-size: 2.1rem;
    color: #103b5c;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    justify-content: center;
    padding: 14px 20px;
  }
`;

const DateTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.25;
`;

const DateMainText = styled.span`
  font-size: 1.35rem;
  font-weight: 800;
  color: #103b5c;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const DateSubText = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: #103b5c;
  margin-top: 2px;
`;

// --- Meals & Menu Sections ---

const MealsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 4px;
`;

const MealCard = styled.div`
  background: #ffffff;
  border: 1px solid #dbe6ef;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 55, 86, 0.04);
`;

const MealHeader = styled.div`
  background: #eaf3fb;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.22rem;
  font-weight: 700;
  color: #103b5c;

  .meal-header-icon {
    font-size: 1.25rem;
    color: #103b5c;
  }
`;

const ItemTable = styled.div`
  display: flex;
  flex-direction: column;
`;

const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #edf2f7;

  &:last-child {
    border-bottom: none;
  }
`;

const ItemName = styled.span`
  font-size: 1.05rem;
  font-weight: 500;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UnitBadge = styled.span`
  font-size: 0.76rem;
  color: #ffffff;
  background: #103b5c;
  border-radius: 4px;
  padding: 2px 7px;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

const ItemQuantity = styled.span`
  font-size: 1.05rem;
  font-weight: 600;
  color: #103b5c;
  text-align: right;
  min-width: 60px;
`;

const EmptyItemsNotice = styled.div`
  padding: 16px 20px;
  color: #6b7280;
  font-size: 0.95rem;
  font-style: italic;
`;

// --- Print Header & Styling ---

const PrintHeader = styled.div`
  display: none;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #103b5c;

  .logo-title-row {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  img {
    width: 90px;
    height: auto;
  }

  h1 {
    font-size: 22px;
    font-weight: 700;
    color: #103b5c;
    margin: 0;
  }

  @media print {
    display: block;
  }
`;

// --- Reliable Date / Weekday Helper ---
// Formats '2026-11-30' or ISO timestamp without timezone drift
export const parseEventDateInfo = (rawDate, fallbackDay) => {
  if (!rawDate) {
    return {
      formattedDate: '',
      weekday: fallbackDay || '',
    };
  }

  let d;
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const [year, month, day] = rawDate.slice(0, 10).split('-').map(Number);
    d = dayjs(new Date(year, month - 1, day));
  } else {
    d = dayjs(rawDate);
  }

  if (!d.isValid()) {
    return {
      formattedDate: String(rawDate),
      weekday: fallbackDay || '',
    };
  }

  return {
    formattedDate: d.format('DD MMM YYYY').toUpperCase(),
    weekday: d.format('dddd'),
  };
};

const EventDetail = () => {
  const [event, setEvent] = useState(null);
  const { eventId } = useParams();
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  useEffect(() => {
    if (eventId) {
      axios
        .get(`${import.meta.env.VITE_RMK_MESS_URL}/event/eventdetail`, {
          params: { eventId },
        })
        .then((response) => {
          setEvent(response.data);
        })
        .catch((error) => {
          console.error('There was an error fetching the event data!', error);
        });
    }
  }, [eventId]);

  if (!event) {
    return (
      <PageWrapper>
        <p style={{ color: '#103b5c', fontWeight: 600 }}>Loading event details...</p>
      </PageWrapper>
    );
  }

  const menuData = Array.isArray(event.meal_details) ? event.meal_details : [];
  const { formattedDate, weekday } = parseEventDateInfo(event.event_date, event.day);

  return (
    <PageWrapper>
      <PrintButton onClick={handlePrint}>
        <FaPrint /> Print
      </PrintButton>

      <EventCard ref={componentRef}>
        <PrintHeader>
          <div className="logo-title-row">
            <img src={Logo} alt="RMK Logo" />
            <div>
              <h1>R.M.K. GROUP OF INSTITUTIONS</h1>
              <p style={{ margin: '4px 0 0 0', color: '#4b5563', fontSize: '13px' }}>
                FOOD MANAGEMENT SYSTEM
              </p>
            </div>
          </div>
        </PrintHeader>

        {/* 1. Event title & calendar icon centered */}
        <TitleSection>
          <EventTitle>
            <FaCalendarAlt className="title-icon" />
            <span>{event.event_name}</span>
          </EventTitle>
          <TitleDivider />
        </TitleSection>

        {/* 2. Event info (Left: Institution, People count | Right: Light-blue Date Panel) */}
        <EventInfoRow>
          <EventInfoLeft>
            <InfoItem>
              <FaSchool className="info-icon" />
              <span>{event.institution || 'RMK'}</span>
            </InfoItem>
            <InfoItem>
              <FaUsers className="info-icon" />
              <span>
                {event.no_of_people ? `${event.no_of_people} people` : '—'}
              </span>
            </InfoItem>
          </EventInfoLeft>

          <VerticalDivider />

          <DatePanel>
            <FaRegCalendarAlt className="date-calendar-icon" />
            <DateTextGroup>
              <DateMainText>{formattedDate}</DateMainText>
              <DateSubText>{weekday}</DateSubText>
            </DateTextGroup>
          </DatePanel>
        </EventInfoRow>

        {/* 3. Meal and menu section */}
        <MealsList>
          {menuData.map((meal, index) => {
            const items = Array.isArray(meal.items) ? meal.items : [];

            return (
              <MealCard key={index}>
                <MealHeader>
                  <FaUtensils className="meal-header-icon" />
                  <span>{meal.mealType || 'Meal'}</span>
                </MealHeader>
                {items.length === 0 ? (
                  <EmptyItemsNotice>No items added for this meal.</EmptyItemsNotice>
                ) : (
                  <ItemTable>
                    {items.map((item, itemIdx) => (
                      <ItemRow key={itemIdx}>
                        <ItemName>
                          <span>{item.name}</span>
                          {item.unit && <UnitBadge>{item.unit}</UnitBadge>}
                        </ItemName>
                        <ItemQuantity>{item.quantity}</ItemQuantity>
                      </ItemRow>
                    ))}
                  </ItemTable>
                )}
              </MealCard>
            );
          })}
        </MealsList>
      </EventCard>
    </PageWrapper>
  );
};

export default EventDetail;