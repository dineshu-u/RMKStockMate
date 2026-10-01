const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/report', async (req, res) => {
    const { fdate, tdate } = req.query;

    try {
        const [result] = await db.promise().query(`
            SELECT 
                c.category AS category,
                COALESCE(SUM(p.amount), 0) AS purchase_amount,
                COALESCE(SUM(d.RMK * p.rate), 0) AS RMK_amount,
                COALESCE(SUM(d.RMD * p.rate), 0) AS RMD_amount,
                COALESCE(SUM(d.RMKCET * p.rate), 0) AS RMKCET_amount,
                COALESCE(SUM(d.RMKSCHOOL * p.rate), 0) AS RMKSCHOOL_amount,
                (COALESCE(SUM(d.RMK * p.rate), 0) + 
                 COALESCE(SUM(d.RMD * p.rate), 0) + 
                 COALESCE(SUM(d.RMKCET * p.rate), 0) + 
                 COALESCE(SUM(d.RMKSCHOOL * p.rate), 0)) AS total_amount
            FROM (
                SELECT 
                    item, 
                    SUM(quantity) AS quantity, 
                    SUM(amount) AS amount,
                    AVG(amount / quantity) AS rate
                FROM purchase
                WHERE date BETWEEN ? AND ?
                GROUP BY item
            ) AS p
            LEFT JOIN (
                SELECT 
                    item,
                    SUM(RMK) AS RMK,
                    SUM(RMD) AS RMD,
                    SUM(RMKSCHOOL) AS RMKSCHOOL,
                    SUM(RMKCET) AS RMKCET
                FROM dispatch1
                WHERE date BETWEEN ? AND ?
                GROUP BY item
            ) AS d ON p.item = d.item
            JOIN category c ON p.item = c.item
            GROUP BY c.category
        `, [fdate, tdate, fdate, tdate]);

        console.log(result);
        res.status(200).send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while retrieving the result.", error });
    }
});

module.exports = router;
