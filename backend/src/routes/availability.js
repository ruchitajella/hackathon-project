const express = require('express');
const { db } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/availability — Team availability view ───────────────
router.get('/', authenticate, (req, res) => {
  let { start_date, end_date } = req.query;

  // Default: next 30 days
  if (!start_date) {
    const today = new Date();
    start_date  = today.toISOString().split('T')[0];
  }
  if (!end_date) {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    end_date = future.toISOString().split('T')[0];
  }

  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ error: 'End date must be on or after start date' });
  }

  // Only show name + dates (NOT leave_type or reason per FR29)
  const rows = db.prepare(`
    SELECT
      lr.id,
      u.name        AS employee_name,
      lr.start_date,
      lr.end_date,
      lr.day_count
    FROM leave_requests lr
    JOIN users u ON u.id = lr.user_id
    WHERE lr.status     = 'Approved'
      AND lr.start_date <= ?
      AND lr.end_date   >= ?
    ORDER BY lr.start_date ASC
  `).all(end_date, start_date);

  return res.json({
    availability: rows,
    filter: { start_date, end_date },
  });
});

module.exports = router;