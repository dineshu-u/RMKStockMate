const express = require('express');
const db = require('../db');
const router = express.Router();

// Route to get all master items
router.get('/getItems', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT item, category FROM category ORDER BY item');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to calculate item stats for an exact date range with accurate opening & closing stock
async function getItemMetrics(item, fdate, tdate) {
  // 1. Inward Purchases for this date range [fdate, tdate]
  const [pRows] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(quantity), 0) AS purchaseQuantity,
      COALESCE(SUM(amount), 0) AS purchaseAmount,
      COALESCE(AVG(amountkg), 0) AS avgRate
    FROM purchase
    WHERE item = ? AND date BETWEEN ? AND ?
  `, [item, fdate, tdate]);

  const purchaseQty = Number(pRows[0]?.purchaseQuantity || 0);
  const purchaseAmt = Number(pRows[0]?.purchaseAmount || 0);
  let rate = Number(pRows[0]?.avgRate || 0);

  // If rate was 0 in this range (no purchases in exact window), fallback to latest known purchase rate up to tdate
  if (rate === 0) {
    const [rateRows] = await db.promise().query(`
      SELECT amountkg FROM purchase WHERE item = ? AND date <= ? ORDER BY date DESC, id DESC LIMIT 1
    `, [item, tdate]);
    if (rateRows.length > 0) {
      rate = Number(rateRows[0].amountkg || 0);
    } else {
      const [latestRate] = await db.promise().query(`
        SELECT amountkg FROM purchase WHERE item = ? ORDER BY date DESC, id DESC LIMIT 1
      `, [item]);
      rate = Number(latestRate[0]?.amountkg || 0);
    }
  }

  // 2. Dispatches across the 4 campuses for this date range [fdate, tdate]
  const [dRows] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(RMK), 0) AS RMK,
      COALESCE(SUM(RMD), 0) AS RMD,
      COALESCE(SUM(RMKCET), 0) AS RMKCET,
      COALESCE(SUM(RMKSCHOOL), 0) AS RMKSCHOOL
    FROM dispatch1
    WHERE item = ? AND date BETWEEN ? AND ?
  `, [item, fdate, tdate]);

  const rmkQty = Number(dRows[0]?.RMK || 0);
  const rmdQty = Number(dRows[0]?.RMD || 0);
  const rmkcetQty = Number(dRows[0]?.RMKCET || 0);
  const schoolQty = Number(dRows[0]?.RMKSCHOOL || 0);

  const issuedQty = rmkQty + rmdQty + rmkcetQty + schoolQty;
  const rmkAmt = rmkQty * rate;
  const rmdAmt = rmdQty * rate;
  const rmkcetAmt = rmkcetQty * rate;
  const schoolAmt = schoolQty * rate;
  const issuedAmt = issuedQty * rate;

  // 3. Opening Stock as of fdate (Cumulative purchases before fdate - Cumulative dispatches before fdate)
  const [openPurchases] = await db.promise().query(`
    SELECT COALESCE(SUM(quantity), 0) AS totalOpenPurchase
    FROM purchase
    WHERE item = ? AND date < ?
  `, [item, fdate]);

  const [openDispatches] = await db.promise().query(`
    SELECT COALESCE(SUM(RMK + RMD + RMKCET + RMKSCHOOL), 0) AS totalOpenDispatch
    FROM dispatch1
    WHERE item = ? AND date < ?
  `, [item, fdate]);

  const openingStockQty = Math.max(
    0, 
    Number(openPurchases[0]?.totalOpenPurchase || 0) - Number(openDispatches[0]?.totalOpenDispatch || 0)
  );

  // 4. True Closing Stock at the end of the period (as of tdate)
  // Closing Stock = Opening Stock + Period Purchases - Period Issues
  const closingQty = Math.max(0, openingStockQty + purchaseQty - issuedQty);
  const closingAmt = closingQty * rate;

  return {
    item,
    fromDate: fdate,
    toDate: tdate,
    rate,
    openingStock: openingStockQty,
    Purchased_quantity: purchaseQty,
    Purchased_amount: purchaseAmt,
    RMK_quantity: rmkQty,
    RMK_amount: rmkAmt,
    RMD_quantity: rmdQty,
    RMD_amount: rmdAmt,
    RMKCET_quantity: rmkcetQty,
    RMKCET_amount: rmkcetAmt,
    RMKSCHOOL_quantity: schoolQty,
    RMKSCHOOL_amount: schoolAmt,
    Issued_quantity: issuedQty,
    Issued_amount: issuedAmt,
    Closing_quantity: closingQty,
    Closing_amount: closingAmt
  };
}

// Route to get item report (supports both single item and multi-item comparison)
router.get('/report', async (req, res) => {
  const { fdate1, tdate1, fdate2, tdate2, fdate, tdate } = req.query;

  // Normalize requested items list (supports items array, comma-separated items, or single item)
  let itemList = [];
  if (req.query.items) {
    if (Array.isArray(req.query.items)) {
      itemList = req.query.items;
    } else if (typeof req.query.items === 'string') {
      itemList = req.query.items.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (req.query.item) {
    if (Array.isArray(req.query.item)) {
      itemList = req.query.item;
    } else {
      itemList = [req.query.item.trim()];
    }
  }

  if (itemList.length === 0) {
    return res.status(400).json({ message: 'At least one item is required' });
  }

  try {
    // Case 1: Dual Date Range Comparison (Period 1 vs Period 2)
    if (fdate1 && tdate1 && fdate2 && tdate2) {
      const itemResults = await Promise.all(itemList.map(async (itemName) => {
        const period1 = await getItemMetrics(itemName, fdate1, tdate1);
        const period2 = await getItemMetrics(itemName, fdate2, tdate2);

        return {
          item: itemName,
          period1: {
            ...period1,
            label: `Period 1 (${fdate1} to ${tdate1})`
          },
          period2: {
            ...period2,
            label: `Period 2 (${fdate2} to ${tdate2})`
          },
          difference: {
            purchaseQuantityDiff: period2.Purchased_quantity - period1.Purchased_quantity,
            purchaseAmountDiff: period2.Purchased_amount - period1.Purchased_amount,
            issuedQuantityDiff: period2.Issued_quantity - period1.Issued_quantity,
            issuedAmountDiff: period2.Issued_amount - period1.Issued_amount,
            closingQuantityDiff: period2.Closing_quantity - period1.Closing_quantity,
            closingAmountDiff: period2.Closing_amount - period1.Closing_amount,
            rmkQtyDiff: period2.RMK_quantity - period1.RMK_quantity,
            rmdQtyDiff: period2.RMD_quantity - period1.RMD_quantity,
            rmkcetQtyDiff: period2.RMKCET_quantity - period1.RMKCET_quantity,
            schoolQtyDiff: period2.RMKSCHOOL_quantity - period1.RMKSCHOOL_quantity
          }
        };
      }));

      return res.status(200).json({
        type: 'comparison',
        items: itemResults,
        // Backward compatibility fields for single-item consumers
        item: itemResults[0]?.item,
        period1: itemResults[0]?.period1,
        period2: itemResults[0]?.period2,
        difference: itemResults[0]?.difference
      });
    }

    // Case 2: Single Date Range
    const from = fdate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const to = tdate || new Date().toISOString().split('T')[0];
    const singleResults = await Promise.all(itemList.map(itemName => getItemMetrics(itemName, from, to)));
    return res.status(200).json(singleResults);
  } catch (error) {
    console.error('Error fetching item report data:', error);
    res.status(500).json({ error: 'An error occurred while fetching report data' });
  }
});

module.exports = router;