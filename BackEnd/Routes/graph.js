const express = require('express');
const db = require('../db'); // Ensure your db configuration is correct
const router = express.Router();

const getLast7Days = () => {
    const today = new Date();
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    return last7Days;
};
router.get('/last-7-days', (req, res) => {
    const last7Days = getLast7Days();
    const resultsMap = last7Days.map(date => ({ date: date.split('-')[2], count: 0 })); // Extracting DD

    // Query to get the purchases grouped by date for the last 7 days
    const query = `
        SELECT date, SUM(amount) AS totalAmount
        FROM purchase
        WHERE date IN (?)
        GROUP BY date
    `;

    db.query(query, [last7Days], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Map the results to the response format
        results.forEach(row => {
            const dateIndex = resultsMap.findIndex(item => item.date === row.date.split('-')[2]); // Extracting DD
            if (dateIndex !== -1) {
                resultsMap[dateIndex].count = row.totalAmount;
            }
        });

        res.json(resultsMap);
    });
});


const getCurrentMonthRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
        start: firstDay.toISOString().split('T')[0],  // Format YYYY-MM-DD
        end: lastDay.toISOString().split('T')[0]      // Format YYYY-MM-DD
    };
};

router.get('/category-amount-current-month', (req, res) => {
    const { start, end } = getCurrentMonthRange();

    // SQL query to sum the amounts grouped by category for the current month
    const query = `
        SELECT category, SUM(amount) AS totalAmount
        FROM purchase
        WHERE date BETWEEN ? AND ?
        GROUP BY category ORDER BY totalAmount desc
    `;

    db.query(query, [start, end], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Format results in the desired structure
        const formattedResults = results.map(row => ({
            name: row.category,   // "name" corresponds to category
            value: Math.floor(row.totalAmount)// "value" corresponds to the total amount
        }));

        res.json(formattedResults);
    });
});
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];  // Format: YYYY-MM-DD
};

router.get('/category-amount-today', (req, res) => {
    const today = getTodayDate();

    // SQL query to sum the amounts grouped by category for today
    const query = `
        SELECT category, SUM(amount) AS totalAmount
        FROM purchase
        WHERE date = ?
        GROUP BY category ORDER BY totalAmount desc
    `;

    db.query(query, [today], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Format results in the desired structure
        const formattedResults = results.map(row => ({
            name: row.category,    // "name" corresponds to category
            value: Math.floor(row.totalAmount) // "value" corresponds to the total amount spent
        }));
        console.log(formattedResults);
        res.json(formattedResults);
    });
});

module.exports = router;

