import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import DashboardBarGraph from './DashboardBarGraph';
import DashboardLineChart from './DashboardLineChart';
import DashboardBarGraph2 from './DashboardPieChart';
import DashboardPieChart from './DashboardPieChart';
function DashBoard() {
    const [barGraphData, setBarGraphData] = useState([]);
    const [pieChartData, setPieChartData] = useState([]);
    const [lineChartData, setLineChartData] = useState([]);

    

    
    useEffect(() => {
       
        fetch(`${import.meta.env.VITE_RMK_MESS_URL}/graph/category-amount-today`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => setBarGraphData(data))
            .catch(error => console.error('Error fetching line chart data:', error));
    }, []);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_RMK_MESS_URL}/graph/category-amount-current-month`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => setPieChartData(data))
            .catch(error => console.error('Error fetching line chart data:', error));
    }, []);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_RMK_MESS_URL}/graph/last-7-days`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => setLineChartData(data))
            .catch(error => console.error('Error fetching line chart data:', error));
    }, []);
    

    return (
        <div>
            <div className="grid-container">
                <div className='home-grid-db'>
                    <GridItem title="Today's Expense">
                        <DashboardPieChart data={barGraphData}/>
                    </GridItem>
                    <GridItem title="Monthly Expense">
                        <DashboardPieChart data={pieChartData}/>
                    </GridItem>
                    <GridItem title="Week's Expense">
                        <DashboardLineChart data={lineChartData} />
                    </GridItem>
                </div>
            </div>
        </div>
    );
}

function GridItem({ title, children }) {
    return (
        <div className="grid-item-db">
            <h3 className="grid-item-db-title">{title}</h3>
            {children}
        </div>
    );
}

export default DashBoard;
