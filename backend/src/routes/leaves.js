const express = require('express');
const { db } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { countBusinessDays, datesOverlap, isInFuture } = require('../utils/dateUtils');

const router = express.Router();

const VALID_LEAVE_TYPES = ['Vacation', 'Sick', 'Personal'];
const VALID_STATUSES    = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

// ─── Helper: build WHERE clause from filters ──────────────────────
function buildFilters(query, baseWhere, params) {
  let where = baseWhere;

  if (query.status && VALID_STATUSES.includes(query.status)) {
    where += ` AND lr.status = ?`;
    params.push(query.status);
  }
  if (query.leave_type && VALID_LEAVE_TYPES.includes(query.leave_type)) {
    where += ` AND lr.leave_type = ?`;
    params.push(query.leave_type);
  }

  return where;
}

// ─── Helper: build ORDER BY ───────────────────────────────────────
function buildOrderBy(query) {
  const sortMap = {
    start_date: 'lr.start_date',
    end_date:   'lr.end_date',
    created_at: 'lr.created_at',
    status:     'lr.status',
  };
  const col = sortMap[query.sort_by] || 'lr.created_at';
  const dir = query.order === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${col} ${dir}`;
}

// ─── POST /api/leaves — Submit new leave request ──────────────────
router.post('/', authenticate, (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  const userId = req.user.id;

  // Validate leave type
  if (!VALID_LEAVE_TYPES.includes(leave_type)) {
    return res.status(400).json({ error: `Invalid leave type. Must be one of: ${VALID_LEAVE_TYPES.join(', ')}` });
  }

  // Validate dates
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ error: 'End date must be on or after start date' });
  }

  // Calculate business day count
  const dayCount = countBusinessDays(start_date, end_date);
  if (dayCount === 0) {
    return res.status(400).json({ error: 'Leave request must include at least one business day' });
  }

  // Check balance
  const balanceRow = db.prepare(`
    SELECT balance FROM leave_balances WHERE user_id = ? AND leave_type = ?
  `).get(userId, leave_type);

  if (!balanceRow || balanceRow.balance < dayCount) {
    return res.status(400).json({
      error: `Insufficient balance. You have ${balanceRow ? balanceRow.balance : 0} days of ${leave_type} leave remaining, but requested ${dayCount} days.`
    });
  }

  // Check for overlapping requests
  const overlapping = db.prepare(`
    SELECT id FROM leave_requests
    WHERE user_id = ?
      AND status IN ('Pending', 'Approved')
      AND start_date <= ?
      AND end_date   >= ?
  `).get(userId, end_date, start_date);

  if (overlapping) {
    return res.status(400).json({
      error: `Your request overlaps with an existing Pending or Approved leave request (ID: ${overlapping.id}).`
    });
  }

  // Insert leave request
  const result = db.prepare(`
    INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, day_count, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, leave_type, start_date, end_date, dayCount, reason || null);

  const newRequest = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ request: newRequest });
});

// ─── GET /api/leaves — List own leave requests (with filter/sort/pagination) ──
router.get('/', authenticate, (req, res) => {
  const { page = 1, page_size = 20 } = req.query;
  const limit  = parseInt(page_size);
  const offset = (parseInt(page) - 1) * limit;
  const params = [req.user.id];

  let where = buildFilters(req.query, `WHERE lr.user_id = ?`, params);
  const orderBy = buildOrderBy(req.query);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM leave_requests lr ${where}
  `).get(...params).count;

  const rows = db.prepare(`
    SELECT lr.*, u.name as requester_name
    FROM leave_requests lr
    JOIN users u ON u.id = lr.user_id
    ${where}
    ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return res.json({
    requests:    rows,
    total,
    page:        parseInt(page),
    page_size:   limit,
    total_pages: Math.ceil(total / limit),
  });
});

// ─── GET /api/leaves/:id — Get single leave request ───────────────
router.get('/:id', authenticate, (req, res) => {
  const request = db.prepare(`
    SELECT lr.*, u.name as requester_name, m.name as manager_name
    FROM leave_requests lr
    JOIN users u ON u.id = lr.user_id
    LEFT JOIN users m ON m.id = lr.decided_by
    WHERE lr.id = ?
  `).get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });

  // Visibility check: only requester or their direct manager
  const isRequester = request.user_id === req.user.id;
  const isManager   = req.user.role === 'manager' && req.user.id === db.prepare(
    'SELECT manager_id FROM users WHERE id = ?'
  ).get(request.user_id)?.manager_id;

  if (!isRequester && !isManager) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json({ request });
});

// ─── PUT /api/leaves/:id — Edit a Pending request ─────────────────
router.put('/:id', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (request.status !== 'Pending') {
    return res.status(400).json({ error: 'Only Pending requests can be edited' });
  }

  const { leave_type, start_date, end_date, reason } = req.body;
  const newType      = leave_type  || request.leave_type;
  const newStart     = start_date  || request.start_date;
  const newEnd       = end_date    || request.end_date;
  const newReason    = reason !== undefined ? reason : request.reason;

  if (!VALID_LEAVE_TYPES.includes(newType)) {
    return res.status(400).json({ error: `Invalid leave type. Must be one of: ${VALID_LEAVE_TYPES.join(', ')}` });
  }
  if (new Date(newEnd) < new Date(newStart)) {
    return res.status(400).json({ error: 'End date must be on or after start date' });
  }

  const dayCount = countBusinessDays(newStart, newEnd);
  if (dayCount === 0) {
    return res.status(400).json({ error: 'Leave request must include at least one business day' });
  }

  // Check balance (exclude current request from balance check)
  const balanceRow = db.prepare(`
    SELECT balance FROM leave_balances WHERE user_id = ? AND leave_type = ?
  `).get(req.user.id, newType);

  if (!balanceRow || balanceRow.balance < dayCount) {
    return res.status(400).json({
      error: `Insufficient balance. You have ${balanceRow ? balanceRow.balance : 0} days remaining for ${newType}.`
    });
  }

  // Check overlap (exclude current request)
  const overlapping = db.prepare(`
    SELECT id FROM leave_requests
    WHERE user_id = ?
      AND id != ?
      AND status IN ('Pending', 'Approved')
      AND start_date <= ?
      AND end_date   >= ?
  `).get(req.user.id, request.id, newEnd, newStart);

  if (overlapping) {
    return res.status(400).json({
      error: `Dates overlap with existing request (ID: ${overlapping.id}).`
    });
  }

  db.prepare(`
    UPDATE leave_requests
    SET leave_type = ?, start_date = ?, end_date = ?, day_count = ?, reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newType, newStart, newEnd, dayCount, newReason, request.id);

  const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(request.id);
  return res.json({ request: updated });
});

// ─── PATCH /api/leaves/:id/withdraw — Withdraw a Pending request ──
router.patch('/:id/withdraw', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (request.status !== 'Pending') {
    return res.status(400).json({ error: 'Only Pending requests can be withdrawn' });
  }

  db.prepare(`
    UPDATE leave_requests
    SET status = 'Cancelled', updated_at = datetime('now')
    WHERE id = ?
  `).run(request.id);

  return res.json({ message: 'Request withdrawn successfully' });
});

// ─── PATCH /api/leaves/:id/cancel — Cancel an Approved request ────
router.patch('/:id/cancel', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (request.status !== 'Approved') {
    return res.status(400).json({ error: 'Only Approved requests can be cancelled' });
  }
  if (!isInFuture(request.start_date)) {
    return res.status(400).json({ error: 'Cannot cancel a leave that has already started or passed' });
  }

  // Restore balance (run in transaction for safety)
  const cancelAndRestore = db.transaction(() => {
    db.prepare(`
      UPDATE leave_requests
      SET status = 'Cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).run(request.id);

    db.prepare(`
      UPDATE leave_balances
      SET balance = balance + ?
      WHERE user_id = ? AND leave_type = ?
    `).run(request.day_count, request.user_id, request.leave_type);
  });

  cancelAndRestore();

  return res.json({ message: 'Leave cancelled and balance restored' });
});

module.exports = router;