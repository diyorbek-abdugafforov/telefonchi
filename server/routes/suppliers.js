import express from 'express';
import db from '../db.js';
import { authenticateToken, logAudit } from '../auth.js';

const router = express.Router();

// List suppliers
router.get('/', authenticateToken, (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM suppliers WHERE 1=1';
  const params = [];
  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR company_name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  query += ' ORDER BY id DESC';
  const suppliers = db.prepare(query).all(...params);
  res.json({ success: true, data: suppliers });
});

// Get supplier details + statement (Akt sverka)
router.get('/:id', authenticateToken, (req, res) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).json({ success: false, error: "Yetkazib beruvchi topilmadi"});

  const purchases = db.prepare(`
    SELECT * FROM purchases WHERE supplier_id = ? ORDER BY id DESC
  `).all(supplier.id);

  const payments = db.prepare(`
    SELECT ct.*, ca.name as cash_account_name, u.name as created_by_name
    FROM cash_transactions ct
    LEFT JOIN cash_accounts ca ON ct.cash_account_id = ca.id
    LEFT JOIN users u ON ct.created_by = u.id
    WHERE ct.reference_type = 'supplier_debt_pay' AND ct.reference_id = ?
    ORDER BY ct.id DESC
  `).all(supplier.id);

  res.json({
    success: true,
    data: {
      supplier,
      purchases,
      payments
    }
  });
});

// Create supplier
router.post('/', authenticateToken, (req, res) => {
  const { name, phone, company_name, address, notes } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Ism kiritilishi shart"});

  const result = db.prepare(`
    INSERT INTO suppliers (name, phone, company_name, address, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, phone || '', company_name || '', address || '', notes || '');

  logAudit(req, 'CREATE', 'supplier', result.lastInsertRowid, null, { name, company_name });
  res.json({ success: true, message: "Yetkazib beruvchi qo\"shildi", supplierId: result.lastInsertRowid });
});

// Pay supplier debt (Qarz to'lash)
router.post('/:id/pay-debt', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { amount, cash_account_id, notes } = req.body;
  const payAmount = Number(amount);

  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ success: false, error: "To\"lov summasi 0 dan katta bo'lishi kerak"});
  }

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!supplier) return res.status(404).json({ success: false, error: "Yetkazib beruvchi topilmadi"});

  const payTx = db.transaction(() => {
    // 1. Reduce supplier debt
    db.prepare('UPDATE suppliers SET debt = MAX(0, debt - ?) WHERE id = ?').run(payAmount, id);

    // 2. Reduce cash from cash account and record transaction
    if (cash_account_id) {
      db.prepare('UPDATE cash_accounts SET balance = balance - ? WHERE id = ?').run(payAmount, cash_account_id);
      db.prepare(`
        INSERT INTO cash_transactions (
          branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by
        ) VALUES (1, ?, 'out', 'purchase', ?, 'UZS', ?, 'supplier_debt_pay', ?, ?)
      `).run(
        cash_account_id,
        payAmount,
        `Yetkazib beruvchi (${supplier.name}) qarzini to'lash. ${notes || ''}`,
        id,
        req.user.id
      );
    }
  });

  try {
    payTx();
    logAudit(req, 'UPDATE', 'supplier', id, null, { paid_debt: payAmount });
    res.json({ success: true, message: "Qarz to\"lovi muvaffaqiyatli amalga oshirildi"});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
