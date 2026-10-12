import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import DashboardBarGraph from './DashboardBarGraph';
import DashboardLineChart from './DashboardLineChart';
import DashboardBarGraph2 from './DashboardPieChart';
import DashboardPieChart from './DashboardPieChart';
import dayjs from 'dayjs';
function DashBoard() {
    const [barGraphData, setBarGraphData] = useState([]);
    const [pieChartData, setPieChartData] = useState([]);
    const [lineChartData, setLineChartData] = useState([]);
    const [attendanceData, setAttendanceData] = useState(null);

    

    
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
    

    useEffect(() => {
        fetch(`${import.meta.env.VITE_RMK_MESS_URL}/attendance/report/daily?date=${dayjs().format('YYYY-MM-DD')}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => setAttendanceData(data))
            .catch(error => console.error('Error fetching attendance summary:', error));
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
            {attendanceData && (
                <div style={{
                    background: '#ffffff',
                    border: `1px solid #e2e8f0`,
                    borderLeft: `6px solid ${attendanceData.complete ? '#059669' : '#f59e0b'}`,
                    borderRadius: 10,
                    padding: '14px 22px',
                    marginTop: 18,
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <h3 style={{ margin: 0, color: '#164863' }}>
                            Today's Attendance ({attendanceData.date})
                        </h3>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#164863' }}>
                                {attendanceData.grandTotal.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: attendanceData.complete ? '#059669' : '#b45309' }}>
                                {attendanceData.recordedPairs === 0
                                    ? 'Not recorded yet'
                                    : attendanceData.complete
                                        ? 'Total headcount across all institutions'
                                        : `Incomplete - ${attendanceData.recordedPairs} of ${attendanceData.institutions.reduce((a, i) => a + i.categories.length, 0)} entries recorded (not final)`}
                            </div>
                        </div>
                    </div>
                    {attendanceData.recordedPairs > 0 && (
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10 }}>
                            {attendanceData.categoryTotals.map(cat => (
                                <div key={cat.id} style={{
                                    background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8,
                                    padding: '6px 14px', minWidth: 100, textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                                        {cat.name}
                                    </div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#164863' }}>
                                        {cat.total.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
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
