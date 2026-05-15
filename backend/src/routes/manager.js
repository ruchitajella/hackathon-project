const express = require('express');
const { db } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const VALID_LEAVE_TYPES = ['Vacation', 'Sick', 'Personal'];
const VALID_STATUSES    = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

// ─── Middleware: manager only ─────────────────────────────────────
function requireManager(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
}

// ─── GET /api/manager/requests — Team leave requests ──────────────
router.get('/requests', authenticate, requireManager, (req, res) => {
  const { page = 1, page_size = 20, search, status, leave_type, sort_by, order } = req.query;
  const limit  = parseInt(page_size);
  const offset = (parseInt(page) - 1) * limit;
  const params = [req.user.id];

  let where = `WHERE u.manager_id = ?`;

  if (status && VALID_STATUSES.includes(status)) {
    where += ` AND lr.status = ?`;
    params.push(status);
  }
  if (leave_type && VALID_LEAVE_TYPES.includes(leave_type)) {
    where += ` AND lr.leave_type = ?`;
    params.push(leave_type);
  }
  if (search) {
    where += ` AND u.name LIKE ?`;
    params.push(`%${search}%`);
  }

  const sortMap = {
    start_date: 'lr.start_date',
    end_date:   'lr.end_date',
    created_at: 'lr.created_at',
    status:     'lr.status',
  };
  const col = sortMap[sort_by] || 'lr.created_at';
  const dir = order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM leave_requests lr
    JOIN users u ON u.id = lr.user_id
    ${where}
  `).get(...params).count;

  const rows = db.prepare(`
    SELECT lr.*, u.name as requester_name, u.email as requester_email
    FROM leave_requests lr
    JOIN users u ON u.id = lr.user_id
    ${where}
    ORDER BY ${col} ${dir}
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

// ─── PATCH /api/manager/requests/:id/approve ──────────────────────
router.patch('/requests/:id/approve', authenticate, requireManager, (req, res) => {
  const { manager_note } = req.body;
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'Pending') {
    return res.status(400).json({ error: 'Only Pending requests can be approved' });
  }

  // Verify this manager is the requester's direct manager
  const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(request.user_id);
  if (!requester || requester.manager_id !== req.user.id) {
    return res.status(403).json({ error: 'You are not the direct manager of this employee' });
  }

  // Run approval + balance debit in a transaction
  const approveRequest = db.transaction(() => {
    // Re-check balance inside transaction (race condition guard per FR25)
    const balanceRow = db.prepare(`
      SELECT balance FROM leave_balances WHERE user_id = ? AND leave_type = ?
    `).get(request.user_id, request.leave_type);

    if (!balanceRow || balanceRow.balance < request.day_count) {
      throw new Error(
        `Insufficient balance. Employee has ${balanceRow ? balanceRow.balance : 0} days remaining for ${request.leave_type}, but request needs ${request.day_count} days.`
      );
    }

    db.prepare(`
      UPDATE leave_requests
      SET status = 'Approved',
          manager_note = ?,
          decided_by   = ?,
          decided_at   = datetime('now'),
          updated_at   = datetime('now')
      WHERE id = ?
    `).run(manager_note || null, req.user.id, request.id);

    db.prepare(`
      UPDATE leave_balances
      SET balance = balance - ?
      WHERE user_id = ? AND leave_type = ?
    `).run(request.day_count, request.user_id, request.leave_type);
  });

  try {
    approveRequest();
    const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(request.id);
    return res.json({ message: 'Request approved', request: updated });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── PATCH /api/manager/requests/:id/reject ───────────────────────
router.patch('/requests/:id/reject', authenticate, requireManager, (req, res) => {
  const { manager_note } = req.body;
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'Pending') {
    return res.status(400).json({ error: 'Only Pending requests can be rejected' });
  }

  // Verify this manager is the requester's direct manager
  const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(request.user_id);
  if (!requester || requester.manager_id !== req.user.id) {
    return res.status(403).json({ error: 'You are not the direct manager of this employee' });
  }

  db.prepare(`
    UPDATE leave_requests
    SET status = 'Rejected',
        manager_note = ?,
        decided_by   = ?,
        decided_at   = datetime('now'),
        updated_at   = datetime('now')
    WHERE id = ?
  `).run(manager_note || null, req.user.id, request.id);

  const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(request.id);
  return res.json({ message: 'Request rejected', request: updated });
});

// ─── GET /api/manager/team-balances — View team balances ─────────
router.get('/team-balances', authenticate, requireManager, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, lb.leave_type, lb.balance
    FROM users u
    JOIN leave_balances lb ON lb.user_id = u.id
    WHERE u.manager_id = ?
    ORDER BY u.name, lb.leave_type
  `).all(req.user.id);

  return res.json({ balances: rows });
});

module.exports = router;