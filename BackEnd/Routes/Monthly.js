const express = require('express');
const db = require('../db');
let bodyParser = require('body-parser');

const router = express.Router();

router.get('/report', async (req, res) => {
    let result = await db.promise().query(`
  SELECT 
    p_sub.item, 
    p_sub.purchaseQuantity, 
    p_sub.purchaseAmount,
    COALESCE(
        (SELECT quantity 
         FROM closingstock 
         WHERE date <= '${req.query.fdate}' 
           AND item = p_sub.item 
         ORDER BY date DESC 
         LIMIT 1), 
        0
    ) AS openingStock, 
    COALESCE(
                (SELECT AVG(amountKg) 
                 FROM purchase 
                 WHERE item = p_sub.item 
                   AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(DATE_SUB('${req.query.fdate}', INTERVAL 1 MONTH), '%Y-%m')
                ), 
                0
            ) * COALESCE(
                (SELECT quantity 
                 FROM closingstock 
                 WHERE date <= '${req.query.fdate}' 
                   AND item = p_sub.item 
                 ORDER BY date DESC 
                 LIMIT 1), 
                0
            ) AS adjustedOpeningStock,

    COALESCE(d_sub.RMK, 0) AS RMK,
    COALESCE(d_sub.RMD, 0) AS RMD,
    COALESCE(d_sub.RMKCET, 0) AS RMKCET,
    COALESCE(d_sub.RMKSCHOOL, 0) AS RMKSCHOOL,
    p_sub.amountKg AS unitPrice
FROM (
    SELECT 
        item, 
        SUM(quantity) AS purchaseQuantity, 
        SUM(amount) AS purchaseAmount,
        AVG(amountKg) AS amountKg
    FROM purchase 
    WHERE date BETWEEN '${req.query.fdate}' AND '${req.query.tdate}' 
    GROUP BY item
) p_sub
LEFT JOIN (
    SELECT 
        item, 
        SUM(RMK) AS RMK, 
        SUM(RMD) AS RMD, 
        SUM(RMKCET) AS RMKCET, 
        SUM(RMKSCHOOL) AS RMKSCHOOL 
    FROM dispatch1 
    WHERE date BETWEEN '${req.query.fdate}' AND '${req.query.tdate}' 
    GROUP BY item
) d_sub
ON p_sub.item = d_sub.item;
    `);

    console.log(result[0]);
    
    res.status(200).send(result[0]);
});

module.exports = router;
