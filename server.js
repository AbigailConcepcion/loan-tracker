require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const getAllLoansStmt = db.prepare(`SELECT * FROM loans ORDER BY rowid DESC`);
const getLoanByIdStmt = db.prepare(`SELECT * FROM loans WHERE id = ?`);
const insertLoanStmt = db.prepare(`INSERT INTO loans (id, name, principal, interest, dueDate, notes) VALUES (?, ?, ?, ?, ?, ?)`);
const updateLoanStmt = db.prepare(`UPDATE loans SET name = ?, principal = ?, interest = ?, dueDate = ?, notes = ? WHERE id = ?`);
const deleteLoanStmt = db.prepare(`DELETE FROM loans WHERE id = ?`);

const getPaymentsByLoanStmt = db.prepare(`SELECT * FROM payments WHERE loanId = ? ORDER BY date DESC`);
const insertPaymentStmt = db.prepare(`INSERT INTO payments (id, loanId, amount, date, note) VALUES (?, ?, ?, ?, ?)`);
const deletePaymentStmt = db.prepare(`DELETE FROM payments WHERE id = ?`);

app.get('/api/loans', (req, res) => {
  try {
    const loans = getAllLoansStmt.all().map((l) => {
      const payments = getPaymentsByLoanStmt.all(l.id);
      return { ...l, payments };
    });
    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

app.post('/api/loans', (req, res) => {
  try {
    const { name, principal, interest, dueDate, notes } = req.body;
    if (!name || principal == null) return res.status(400).json({ error: 'name and principal required' });
    const id = uuidv4();
    insertLoanStmt.run(id, name, Number(principal), Number(interest || 0), dueDate || '', notes || '');
    const loan = getLoanByIdStmt.get(id);
    loan.payments = [];
    res.status(201).json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

app.put('/api/loans/:id', (req, res) => {
  try {
    const id = req.params.id;
    const loan = getLoanByIdStmt.get(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    const { name, principal, interest, dueDate, notes } = req.body;
    updateLoanStmt.run(name || loan.name, Number(principal || loan.principal), Number(interest || loan.interest), dueDate || loan.dueDate, notes || loan.notes, id);
    const updated = getLoanByIdStmt.get(id);
    updated.payments = getPaymentsByLoanStmt.all(id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

app.delete('/api/loans/:id', (req, res) => {
  try {
    const id = req.params.id;
    const loan = getLoanByIdStmt.get(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    const delPayments = db.prepare('DELETE FROM payments WHERE loanId = ?');
    delPayments.run(id);
    deleteLoanStmt.run(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

app.post('/api/loans/:id/payments', (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = getLoanByIdStmt.get(loanId);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    const { amount, note, date } = req.body;
    if (amount == null || Number(amount) <= 0) return res.status(400).json({ error: 'amount required' });
    const id = uuidv4();
    const now = date || new Date().toISOString();
    insertPaymentStmt.run(id, loanId, Number(amount), now, note || '');
    const payments = getPaymentsByLoanStmt.all(loanId);
    res.status(201).json({ id, loanId, amount: Number(amount), date: now, note: note || '', payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

app.delete('/api/payments/:pid', (req, res) => {
  try {
    const pid = req.params.pid;
    const getP = db.prepare('SELECT * FROM payments WHERE id = ?');
    const p = getP.get(pid);
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    deletePaymentStmt.run(pid);
    res.json({ success: true, loanId: p.loanId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`LoanTracker API listening on port ${PORT}`);
});
