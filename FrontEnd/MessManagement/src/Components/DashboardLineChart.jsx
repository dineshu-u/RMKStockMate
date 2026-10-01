import React from "react";
import styled from "styled-components";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <CustomTooltipWrapper>
        {payload.map((entry, index) => (
          <TooltipValue
            key={`item-${index}`}
            style={{ color: entry.color, fontSize: "16px" }}
          >
            {`${entry.value}`}
          </TooltipValue>
        ))}
      </CustomTooltipWrapper>
    );
  }

  return null;
};

export default function DashboardLineChart({ data }) {
  return (
    <ResponsiveContainer>
      <LineChart
        data={data}
        width={500}
        height={300}
        margin={{ top: 20, right: 20, left: -30, bottom: 5 }}
      >
        <CartesianGrid stroke="white" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 16 }} />
        <YAxis tick={{ fontSize: 16 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "16px" }} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
          animationBegin={0}
          animationDuration={1400}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
