const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const databaseModule = require('../db/database');

console.log("DATABASE MODULE:", databaseModule);

const { db, initializeUserBalances } = databaseModule;

console.log("DB VALUE:", db);
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── Helper: generate token ───────────────────────────────────────
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

// ─── POST /api/auth/register ──────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, password, role, manager_id } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Validate role
  const userRole = role === 'manager' ? 'manager' : 'employee';

  // Validate manager_id if provided
  if (manager_id) {
    const manager = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'manager'`).get(manager_id);
    if (!manager) {
      return res.status(400).json({ error: 'Invalid manager_id — user not found or is not a manager' });
    }
  }

  // Hash password
  const hashed = bcrypt.hashSync(password, 10);

  // Insert user
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, manager_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email.toLowerCase(), hashed, userRole, manager_id || null);

  const userId = result.lastInsertRowid;

  // Initialize leave balances
  initializeUserBalances(userId);

  // Generate token
  const token = generateToken(userId);

  const user = db.prepare('SELECT id, name, email, role, manager_id FROM users WHERE id = ?').get(userId);

  return res.status(201).json({ token, user });
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user.id);

  return res.json({
    token,
    user: {
      id:         user.id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      manager_id: user.manager_id,
    }
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, manager_id FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user });
});

// ─── GET /api/auth/managers ───────────────────────────────────────
// Used in register form to populate manager dropdown
router.get('/managers', (req, res) => {
  const managers = db.prepare(`SELECT id, name, email FROM users WHERE role = 'manager'`).all();
  return res.json({ managers });
});

// ─── GET /api/auth/balances ───────────────────────────────────────
router.get('/balances', authenticate, (req, res) => {
  const balances = db.prepare('SELECT leave_type, balance FROM leave_balances WHERE user_id = ?').all(req.user.id);
  return res.json({ balances });
});

module.exports = router;