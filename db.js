// db.js — tiny wrapper around better-sqlite3
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'data', 'loantracker.sqlite');
const SQL_LOG = (process.env.SQL_LOG || 'false') === 'true';

// ensure data folder exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_FILE);
// optional: enable foreign keys
try { db.pragma('foreign_keys = ON'); } catch(e) {}

function log(sql, params) {
  if (SQL_LOG) console.log(sql, params || '');
}

// Initialize tables if not present
const initStmts = [
  `CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    principal REAL NOT NULL,
    interest REAL DEFAULT 0,
    dueDate TEXT,
    notes TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    loanId TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY(loanId) REFERENCES loans(id) ON DELETE CASCADE
  );`
];

initStmts.forEach((s) => db.exec(s));

module.exports = { db, log };
