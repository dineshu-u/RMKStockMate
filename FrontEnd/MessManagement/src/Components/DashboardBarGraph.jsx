import React from 'react';
import styled from 'styled-components';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltipWrapper = styled.div`
  color: white;
  display: flex;
  text-align: center;
  background-color: #1e293b;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100px; 
  height: 50px; 
  border-radius: 8px;
  overflow: hidden;
  pointer-events: none; 
`;

const TooltipValue = styled.p`
  margin-left: 8px; 
  margin: 0;
  font-size: 0.875rem;
`;

const DashboardBarGraph = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 20,
          right: 10,
          left: -20,
          bottom: -20,
        }}
      >
        <CartesianGrid stroke="white" strokeDasharray="3 3" />
        <XAxis dataKey="status" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar type="monotone" dataKey="students" fill="#9CDBA6" barSize={40} animationBegin={0} animationDuration={1400} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <CustomTooltipWrapper>
        {payload.map((entry, index) => (
          <TooltipValue key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.value}`}
          </TooltipValue>
        ))}
      </CustomTooltipWrapper>
    );
  }

  return null;
};

export default DashboardBarGraph;
