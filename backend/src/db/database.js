const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/leave_management.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── CREATE TABLES ───────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'employee' CHECK(role IN ('employee', 'manager')),
    manager_id  INTEGER REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leave_balances (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    leave_type  TEXT    NOT NULL CHECK(leave_type IN ('Vacation', 'Sick', 'Personal')),
    balance     REAL    NOT NULL DEFAULT 0,
    UNIQUE(user_id, leave_type)
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    leave_type    TEXT    NOT NULL CHECK(leave_type IN ('Vacation', 'Sick', 'Personal')),
    start_date    TEXT    NOT NULL,
    end_date      TEXT    NOT NULL,
    day_count     REAL    NOT NULL,
    reason        TEXT,
    status        TEXT    NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    manager_note  TEXT,
    decided_by    INTEGER REFERENCES users(id),
    decided_at    TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── HELPER: Initialize balances for a new user ──────────────────

function initializeUserBalances(userId) {
  const defaults = [
    { leave_type: 'Vacation', balance: 20 },
    { leave_type: 'Sick',     balance: 10 },
    { leave_type: 'Personal', balance: 5  },
  ];
  const insert = db.prepare(`
    INSERT OR IGNORE INTO leave_balances (user_id, leave_type, balance)
    VALUES (?, ?, ?)
  `);
  for (const d of defaults) {
    insert.run(userId, d.leave_type, d.balance);
  }
}

module.exports = { db, initializeUserBalances };