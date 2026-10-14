/**
 * Integration test for the event item catalogue and its use when creating events.
 *
 * It starts a real instance of the API on its own port (so a running dev server
 * is left alone), drives the real HTTP endpoints, and checks the real MySQL
 * state through the application's own database connection. All rows it creates
 * are removed again in `finally`.
 *
 * Run with:  node tests/eventItems.integration.js
 *            (from BackEnd/)
 */

const { spawn } = require('child_process');
const path = require('path');
const db = require('../db');

const PORT = Number(process.env.TEST_PORT) || 3101;
const BASE = `http://127.0.0.1:${PORT}`;

// Every row this test creates carries this token, so cleanup can only ever
// remove rows the test itself made.
const RUN = `IT${Date.now().toString(36).toUpperCase()}`;
const tagged = (suffix) => `${RUN}-${suffix}`;

let passed = 0;
let failed = 0;
const failures = [];

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
  }
};

const section = (title) => console.log(`\n${title}`);

const request = async (method, url, body) => {
  const response = await fetch(`${BASE}${url}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed, text };
};

const q = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const startServer = () =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('The API did not become ready in time'));
      }
    }, 30000);

    child.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));

    const poll = async () => {
      for (let attempt = 0; attempt < 60 && !settled; attempt += 1) {
        try {
          const response = await fetch(`${BASE}/eventItems`);
          if (response.ok) {
            settled = true;
            clearTimeout(timer);
            resolve(child);
            return;
          }
        } catch {
          // not listening yet
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    };
    poll();
  });

// Columns that must not move when event items are created or used.
const inventorySnapshot = async () => {
  const [row] = await q(`
    SELECT
      (SELECT COUNT(*) FROM category) AS category_rows,
      (SELECT COUNT(*) FROM current) AS current_rows,
      (SELECT COALESCE(SUM(quantity), 0) FROM current) AS current_quantity,
      (SELECT COUNT(*) FROM purchase) AS purchase_rows,
      (SELECT COUNT(*) FROM dispatch) AS dispatch_rows,
      (SELECT COUNT(*) FROM closingstock) AS closingstock_rows
  `);
  return row;
};

const run = async () => {
  console.log(`Event items integration test (${RUN}) against ${BASE}`);
  const server = await startServer();

  try {
    const before = await inventorySnapshot();

    // --- 1/2. listing, including the empty case --------------------------
    section('GET /eventItems');
    const listResponse = await request('GET', '/eventItems');
    check('returns 200', listResponse.status === 200, String(listResponse.status));
    check('returns an items array', Array.isArray(listResponse.body?.items));
    check(
      'starts empty for this run',
      listResponse.body.items.every((item) => !String(item.name).startsWith(RUN)),
      JSON.stringify(listResponse.body.items.slice(0, 3))
    );

    // --- 3/4/5. creating -------------------------------------------------
    section('POST /eventItems - create');
    const tomatoName = tagged('Tomato');
    const created = await request('POST', '/eventItems', { name: tomatoName, unit: 'kg' });
    check('creates with 201', created.status === 201, String(created.status));
    check('returns a stable integer id', Number.isInteger(created.body?.item?.id));
    check('returns the name and unit', created.body?.item?.name === tomatoName && created.body?.item?.unit === 'kg');
    check('flags duplicate as false', created.body?.duplicate === false);

    const createdId = created.body.item.id;

    const afterCreate = await request('GET', '/eventItems');
    const listed = afterCreate.body.items.find((item) => item.id === createdId);
    check('the new item is listed', Boolean(listed), JSON.stringify(afterCreate.body.items));
    check('listing returns id, name and unit only', listed && Object.keys(listed).sort().join(',') === 'id,name,unit');

    // --- 6/7/8. duplicates ----------------------------------------------
    section('POST /eventItems - duplicates');
    const exactDuplicate = await request('POST', '/eventItems', { name: tomatoName, unit: 'kg' });
    check('an exact duplicate returns 200, not 201', exactDuplicate.status === 200, String(exactDuplicate.status));
    check('it returns the existing record', exactDuplicate.body?.item?.id === createdId);
    check('it is flagged as a duplicate', exactDuplicate.body?.duplicate === true);

    const whitespaceDuplicate = await request('POST', '/eventItems', {
      name: `  ${tomatoName}  `,
      unit: 'kg',
    });
    check('a whitespace-padded duplicate is caught', whitespaceDuplicate.body?.item?.id === createdId);

    const caseDuplicate = await request('POST', '/eventItems', {
      name: tomatoName.toLowerCase(),
      unit: 'kg',
    });
    check('a differently-cased duplicate is caught', caseDuplicate.body?.item?.id === createdId);

    const rowsWithName = await q('SELECT id, name, unit FROM event_items WHERE name = ?', [tomatoName]);
    check('only one row exists for the normalized name', rowsWithName.length === 1, String(rowsWithName.length));
    check(
      'the stored name is the trimmed original',
      rowsWithName[0] && rowsWithName[0].name === tomatoName,
      rowsWithName[0] && rowsWithName[0].name
    );

    // The database itself refuses an equivalent name, independently of the API.
    let dbRejected = false;
    try {
      await q('INSERT INTO event_items (name, unit) VALUES (?, ?)', [tomatoName.toUpperCase(), 'kg']);
    } catch (error) {
      dbRejected = error.code === 'ER_DUP_ENTRY';
    }
    check('the unique index rejects an equivalent name at the database level', dbRejected);

    const differentUnit = await request('POST', '/eventItems', { name: tomatoName, unit: 'g' });
    check('a duplicate with a different unit returns the existing record', differentUnit.body?.item?.id === createdId);
    check('it reports the unit mismatch', differentUnit.body?.unitMismatch === true);
    const unitAfter = await q('SELECT unit FROM event_items WHERE id = ?', [createdId]);
    check('the existing unit was not overwritten', unitAfter[0]?.unit === 'kg', unitAfter[0]?.unit);

    // --- 9/10/11. invalid input -----------------------------------------
    section('POST /eventItems - validation');
    const noName = await request('POST', '/eventItems', { name: '   ', unit: 'kg' });
    check('an empty name is rejected with 400', noName.status === 400, String(noName.status));

    const missingName = await request('POST', '/eventItems', { unit: 'kg' });
    check('a missing name is rejected with 400', missingName.status === 400, String(missingName.status));

    const longName = await request('POST', '/eventItems', { name: 'x'.repeat(151), unit: 'kg' });
    check('an over-long name is rejected with 400', longName.status === 400, String(longName.status));

    const badUnit = await request('POST', '/eventItems', { name: tagged('BadUnit'), unit: 'basket' });
    check('an unknown unit is rejected with 400', badUnit.status === 400, String(badUnit.status));

    const noUnit = await request('POST', '/eventItems', { name: tagged('NoUnit'), unit: '' });
    check('a missing unit is rejected with 400', noUnit.status === 400, String(noUnit.status));

    const badRows = await q('SELECT COUNT(*) AS c FROM event_items WHERE name LIKE ?', [`${RUN}-%`]);
    check('no rejected request created a row', badRows[0].c === 1, `rows=${badRows[0].c}`);

    // --- 12. concurrent duplicate creation ------------------------------
    section('concurrent creation');
    const raceName = tagged('Race');
    const raceResponses = await Promise.all(
      Array.from({ length: 6 }, () => request('POST', '/eventItems', { name: raceName, unit: 'nos' })).concat(
        Array.from({ length: 3 }, () => request('POST', '/eventItems', { name: `  ${raceName}  `, unit: 'nos' }))
      )
    );
    const raceRows = await q('SELECT id FROM event_items WHERE name = ?', [raceName]);
    check('nine concurrent equivalent creates produce exactly one row', raceRows.length === 1, `rows=${raceRows.length}`);
    check(
      'no concurrent create returned a server error',
      raceResponses.every((r) => r.status === 200 || r.status === 201),
      raceResponses.map((r) => r.status).join(',')
    );
    check(
      'every concurrent response points at the same record',
      raceResponses.every((r) => r.body?.item?.id === raceRows[0]?.id)
    );

    // --- 13. search ------------------------------------------------------
    section('GET /eventItems?q=');
    const search = await request('GET', `/eventItems?q=${encodeURIComponent(tagged('Race'))}`);
    check('search returns the matching item', search.status === 200 && search.body.items.length === 1);
    const noMatch = await request('GET', '/eventItems?q=zzz-no-such-item-zzz');
    check('search returns an empty list when nothing matches', noMatch.body.items.length === 0);

    // --- 14/15/16. creating an event with catalogue items ---------------
    section('POST /event/addevent');
    const eventName = `Integration Event ${RUN}`;
    const eventPayload = {
      event_name: eventName,
      institution: 'RMK',
      event_date: '2026-10-13',
      day: 'Tuesday',
      no_of_people: '250',
      meal_details: [
        {
          mealType: 'Lunch',
          items: [
            { itemId: createdId, name: tomatoName, quantity: '12.5', type: 'Veg', unit: 'kg' },
            { itemId: raceRows[0].id, name: raceName, quantity: '4', type: 'Common', unit: 'nos' },
          ],
        },
        {
          mealType: 'Dinner',
          items: [{ itemId: createdId, name: tomatoName, quantity: '8', type: 'Veg', unit: 'kg' }],
        },
      ],
    };

    const eventResponse = await request('POST', '/event/addevent', eventPayload);
    check('an event with catalogue items is accepted', eventResponse.status === 200, String(eventResponse.status));

    const storedEvents = await q(
      'SELECT id, meal_details, no_of_people FROM events WHERE event_name = ?',
      [eventName]
    );
    check('exactly one event row was written', storedEvents.length === 1, String(storedEvents.length));
    const storedMeals = storedEvents[0] ? JSON.parse(JSON.stringify(storedEvents[0].meal_details)) : [];
    check('both meals were stored', storedMeals.length === 2, JSON.stringify(storedMeals).slice(0, 120));
    check(
      'the item id and unit are persisted with the meal item',
      storedMeals[0]?.items?.[0]?.itemId === createdId &&
        storedMeals[0]?.items?.[0]?.unit === 'kg' &&
        storedMeals[0]?.items?.[0]?.quantity === '12.5'
    );
    check(
      'the existing name/quantity/type fields are unchanged',
      storedMeals[1]?.items?.[0]?.name === tomatoName &&
        storedMeals[1]?.items?.[0]?.type === 'Veg' &&
        storedMeals[1]?.items?.[0]?.quantity === '8'
    );

    // Read it back through the endpoint the event detail screen uses.
    const detail = await request('GET', `/event/eventdetail?eventId=${storedEvents[0].id}`);
    check('the event detail endpoint returns the event', detail.status === 200);
    check(
      'the detail payload still exposes meal_details items',
      Array.isArray(detail.body?.meal_details) && detail.body.meal_details[0].items.length === 2
    );
    check('the legacy no_of_people value is intact', String(detail.body?.no_of_people) === '250');

    // Existing clients that send no itemId must keep working.
    const legacyEventName = `Integration Legacy Event ${RUN}`;
    const legacy = await request('POST', '/event/addevent', {
      event_name: legacyEventName,
      institution: 'RMD',
      event_date: '2026-10-14',
      no_of_people: '40',
      meal_details: [
        { mealType: 'Snacks', items: [{ name: 'Legacy Item', quantity: '3', type: 'Common' }] },
      ],
    });
    check('an event without itemIds is still accepted', legacy.status === 200, String(legacy.status));
    const legacyRows = await q('SELECT id FROM events WHERE event_name = ?', [legacyEventName]);
    check('the legacy-style event was stored', legacyRows.length === 1);

    const unknownItem = await request('POST', '/event/addevent', {
      event_name: `Integration Bad Event ${RUN}`,
      institution: 'RMD',
      event_date: '2026-10-14',
      no_of_people: '40',
      meal_details: [
        { mealType: 'Lunch', items: [{ itemId: 99999999, name: 'Ghost', quantity: '1', type: 'Veg', unit: 'kg' }] },
      ],
    });
    check('an unknown item id is rejected with 400', unknownItem.status === 400, String(unknownItem.status));
    const ghostRows = await q('SELECT COUNT(*) AS c FROM events WHERE event_name = ?', [
      `Integration Bad Event ${RUN}`,
    ]);
    check('the rejected event was not written', ghostRows[0].c === 0);

    const malformedQuantity = await request('POST', '/event/addevent', {
      ...eventPayload,
      event_name: `Integration Bad Quantity ${RUN}`,
      meal_details: [
        { mealType: 'Lunch', items: [{ itemId: createdId, name: tomatoName, quantity: '0', type: 'Veg', unit: 'kg' }] },
      ],
    });
    check('an invalid quantity is rejected with 400', malformedQuantity.status === 400, String(malformedQuantity.status));

    // The event list screen must still work.
    const eventList = await request('GET', '/event/events');
    check('GET /event/events still works', eventList.status === 200 && Array.isArray(eventList.body));

    // Smoke-check the reporting endpoints this change must not disturb.
    const monthly = await request('GET', '/monthly/report?fdate=2026-10-01&tdate=2026-10-03');
    check('GET /monthly/report still responds', monthly.status === 200, String(monthly.status));
    const categoryReport = await request('GET', '/category/report?fdate=2026-10-01&tdate=2026-10-03');
    check('GET /category/report still responds', categoryReport.status === 200, String(categoryReport.status));
    const stockReport = await request('GET', '/addItems/getItemCategory');
    check(
      'the inventory item list endpoint still returns rows',
      stockReport.status === 200 && Array.isArray(stockReport.body) && stockReport.body.length > 0,
      String(stockReport.status)
    );

    // --- 17. inventory isolation ----------------------------------------
    section('inventory isolation');
    const after = await inventorySnapshot();
    check(
      'creating and using event items changed no inventory row or balance',
      JSON.stringify(before) === JSON.stringify(after),
      `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`
    );
    const stockRows = await q('SELECT COUNT(*) AS c FROM category WHERE item LIKE ?', [`${RUN}-%`]);
    check('no inventory item was created', stockRows[0].c === 0, `rows=${stockRows[0].c}`);

    // --- 18. persistence -------------------------------------------------
    section('persistence');
    const persisted = await request('GET', '/eventItems');
    check(
      'the created items are still served by a fresh request',
      persisted.body.items.some((item) => item.id === createdId) &&
        persisted.body.items.some((item) => item.id === raceRows[0].id)
    );
    console.log(`\nCreated records kept during the run: ${createdId}, ${raceRows[0].id}`);
  } finally {
    // Clean up only what this run created.
    try {
      const [events] = await db
        .promise()
        .query('DELETE FROM events WHERE event_name LIKE ?', [`Integration %${RUN}%`]);
      const [items] = await db
        .promise()
        .query('DELETE FROM event_items WHERE name LIKE ?', [`${RUN}-%`]);
      console.log(`\nCleanup: removed ${events.affectedRows} test event row(s) and ${items.affectedRows} test event item row(s).`);
      const leftovers = await q('SELECT COUNT(*) AS c FROM event_items WHERE name LIKE ?', [`${RUN}-%`]);
      if (leftovers[0].c !== 0) console.log(`WARNING: ${leftovers[0].c} test item row(s) left behind.`);
    } catch (error) {
      console.error('Cleanup failed:', error.message);
    }

    server.kill();
    db.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log(`Failed checks:\n - ${failures.join('\n - ')}`);
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('\nIntegration test crashed:', error);
  process.exitCode = 1;
});
