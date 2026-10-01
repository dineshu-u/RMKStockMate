var express = require('express');
const db = require('../db');
var router = express.Router();
router.get('/availablestock', (req, res) => {
    db.query("SELECT item AS itemName, quantity, category FROM current", (err, result) => {
      if (err) {
        console.error("Database query error:", err); 
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching stock data.",
          error: err.message
        });
      }
      res.json({
        success: true,
        data: result
      });
    });
  });
  
  module.exports=router;