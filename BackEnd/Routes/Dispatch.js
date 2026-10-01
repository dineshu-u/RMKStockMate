const express = require('express');
const mysql = require("mysql2");
const db = require('../db'); 

const router = express.Router();

router.get('/retrieve', async (req, res) => {
  try {
    const [items] = await db.promise().query('SELECT item FROM category ORDER BY item;');
    res.status(200).send(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/getQuantity', async (req, res) => {
    try {
        const item = req.body.itemName;
        const [rows] = await db.promise().query('SELECT quantity FROM current WHERE item = ? LIMIT 1', [item]);
        
        if (rows.length > 0) {
            const quantity = rows[0].quantity; 
            res.json({ quantity });
        } else {
            res.json({ quantity: null }); 
        }
    } catch (error) {
        console.error('Error fetching quantity:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/updateDispatch', async (req, res) => {
    console.log(req.body);
  const arr = req.body.ItemArray;
  
  if (!Array.isArray(arr) || arr.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ItemArray' });
  }

  try {
      
      await db.promise().query('START TRANSACTION');

      
      const queries = [];

      for (const item of arr) {
          const { ItemName, CurrentQuantity, RMK, RMD, RMKCET, SCHOOL, DATE } = item;

          
          const [categoryResult] = await db.promise().query(
              'SELECT category FROM category WHERE item = ? LIMIT 1',
              [ItemName]
          );
          const category = categoryResult[0] ? categoryResult[0].category : null;

          
          queries.push({
              sql: `INSERT INTO dispatch1 (item, RMK, RMD, RMKCET, RMKSCHOOL, date, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              values: [ItemName, RMK, RMD, RMKCET, SCHOOL, DATE, category, ItemName, DATE]
          });

          
          queries.push({
              sql: 'UPDATE current SET quantity = ? WHERE item = ?',
              values: [CurrentQuantity, ItemName]
          });

          
          queries.push({
              sql: 'INSERT INTO closingstock (item, quantity, date, category) VALUES (?, ?, ?, ?)',
              values: [ItemName, CurrentQuantity, DATE, category]
          });
      }

      
      for (const query of queries) {
          await db.promise().query(query.sql, query.values);
      }

      
      await db.promise().query('COMMIT');
      res.json({ message: 'Dispatch updated successfully' });
  } catch (error) {
      await db.promise().query('ROLLBACK');
      console.error('Error updating dispatch:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;
