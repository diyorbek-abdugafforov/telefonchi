import express from 'express';
import db from '../db.js';
import { authenticateToken, requireRoles, logAudit } from '../auth.js';

const router = express.Router();

// Cash Accounts List
router.get('/accounts', authenticateToken, (req, res) => {
  const accounts = db.prepare(`
    SELECT ca.*, b.name as branch_name 
    FROM cash_accounts ca 
    LEFT JOIN branches b ON ca.branch_id = b.id
    ORDER BY ca.id ASC
  `).all();
  res.json({ success: true, data: accounts });
});

// Cash Transactions (Pul aylanmasi)
router.get('/transactions', authenticateToken, (req, res) => {
  const { cash_account_id, type, category, limit = 100 } = req.query;
  let query = `
    SELECT ct.*, ca.name as account_name, u.name as created_by_name, b.name as branch_name
    FROM cash_transactions ct
    LEFT JOIN cash_accounts ca ON ct.cash_account_id = ca.id
    LEFT JOIN users u ON ct.created_by = u.id
    LEFT JOIN branches b ON ct.branch_id = b.id
    WHERE 1=1
  `;
  const params = [];
  if (cash_account_id && cash_account_id !== 'all') {
    query += ' AND ct.cash_account_id = ?';
    params.push(Number(cash_account_id));
  }
  if (type && type !== 'all') {
    query += ' AND ct.type = ?';
    params.push(type);
  }
  if (category && category !== 'all') {
    query += ' AND ct.category = ?';
    params.push(category);
  }

  query += ' ORDER BY ct.id DESC LIMIT ?';
  params.push(Number(limit));

  const transactions = db.prepare(query).all(...params);
  res.json({ success: true, data: transactions });
});

// Manual Cash In / Cash Out (Kirim / Chiqim)
router.post('/transactions', authenticateToken, (req, res) => {
  const { cash_account_id, type, category, amount, description } = req.body;
  const numAmount = Number(amount);

  if (!cash_account_id || !type || !numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: "Kassa, operatsiya turi va summa to\"g'ri kiritilishi shart"});
  }

  const tx = db.transaction(() => {
    if (type === 'in') {
      db.prepare('UPDATE cash_accounts SET balance = balance + ? WHERE id = ?').run(numAmount, cash_account_id);
    } else {
      db.prepare('UPDATE cash_accounts SET balance = balance - ? WHERE id = ?').run(numAmount, cash_account_id);
    }

    const res = db.prepare(`
      INSERT INTO cash_transactions (
        branch_id, cash_account_id, type, category, amount, currency, description, created_by
      ) VALUES (?, ?, ?, ?, ?, 'UZS', ?, ?)
    `).run(
      req.user.branch_id || 1,
      cash_account_id,
      type,
      category || 'other',
      numAmount,
      description || '',
      req.user.id
    );

    return res.lastInsertRowid;
  });

  try {
    const txId = tx();
    logAudit(req, 'CREATE', 'cash_transaction', txId, null, { type, amount: numAmount, category });
    res.json({ success: true, message: "Kassa operatsiyasi muvaffaqiyatli saqlandi"});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inter-account transfer (Kassalar o'rtasida pul o'tkazish)
router.post('/transfer', authenticateToken, (req, res) => {
  const { from_account_id, to_account_id, amount, description } = req.body;
  const numAmount = Number(amount);

  if (!from_account_id || !to_account_id || !numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: "Kassalar va summa to\"g'ri tanlanishi kerak"});
  }

  const transferTx = db.transaction(() => {
    db.prepare('UPDATE cash_accounts SET balance = balance - ? WHERE id = ?').run(numAmount, from_account_id);
    db.prepare('UPDATE cash_accounts SET balance = balance + ? WHERE id = ?').run(numAmount, to_account_id);

    // Record out and in
    db.prepare(`
      INSERT INTO cash_transactions (branch_id, cash_account_id, type, category, amount, description, created_by)
      VALUES (?, ?, 'out', 'transfer', ?, ?, ?)
    `).run(req.user.branch_id || 1, from_account_id, numAmount, `Kassalararo o'tkazma: Chiqim. ${description || ''}`, req.user.id);

    db.prepare(`
      INSERT INTO cash_transactions (branch_id, cash_account_id, type, category, amount, description, created_by)
      VALUES (?, ?, 'in', 'transfer', ?, ?, ?)
    `).run(req.user.branch_id || 1, to_account_id, numAmount, `Kassalararo o'tkazma: Kirim. ${description || ''}`, req.user.id);
  });

  try {
    transferTx();
    logAudit(req, 'CREATE', 'cash_transfer', 0, null, { from: from_account_id, to: to_account_id, amount: numAmount });
    res.json({ success: true, message: "Pul o\"tkazmasi muvaffaqiyatli amalga oshirildi"});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Shift management (Smena ochish va yopish)
router.get('/shifts/current', authenticateToken, (req, res) => {
  const branchId = req.user.branch_id || 1;
  const openShift = db.prepare(`
    SELECT s.*, u.name as cashier_name 
    FROM shifts s 
    LEFT JOIN users u ON s.cashier_id = u.id 
    WHERE s.branch_id = ? AND s.status = 'open' 
    ORDER BY s.id DESC LIMIT 1
  `).get(branchId);

  res.json({ success: true, data: openShift });
});

router.post('/shifts/open', authenticateToken, (req, res) => {
  const { opening_balance = 0, notes } = req.body;
  const branchId = req.user.branch_id || 1;

  // Check if open shift already exists
  const existing = db.prepare("SELECT id FROM shifts WHERE branch_id = ? AND status = 'open'").get(branchId);
  if (existing) {
    return res.status(400).json({ success: false, error: "Bu filialda smena allaqachon ochiq!"});
  }

  const result = db.prepare(`
    INSERT INTO shifts (branch_id, cashier_id, opening_balance, notes)
    VALUES (?, ?, ?, ?)
  `).run(branchId, req.user.id, Number(opening_balance), notes || '');

  logAudit(req, 'CREATE', 'shift', result.lastInsertRowid, null, { action: 'OPEN_SHIFT', opening_balance });
  res.json({ success: true, message: "Smena muvaffaqiyatli ochildi", shiftId: result.lastInsertRowid });
});

router.post('/shifts/close', authenticateToken, (req, res) => {
  const { shift_id, closing_actual, notes } = req.body;
  const branchId = req.user.branch_id || 1;

  const shift = db.prepare("SELECT * FROM shifts WHERE id = ? AND status = 'open'").get(shift_id);
  if (!shift) {
    return res.status(404).json({ success: false, error: "Ochiq smena topilmadi"});
  }

  // Calculate sales cash received during this shift
  const salesCash = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_in
    FROM cash_transactions
    WHERE branch_id = ? AND created_at >= ? AND type = 'in' AND category IN ('sale', 'installment_payment')
  `).get(branchId, shift.opened_at).total_in;

  const cashOut = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_out
    FROM cash_transactions
    WHERE branch_id = ? AND created_at >= ? AND type = 'out'
  `).get(branchId, shift.opened_at).total_out;

  const expectedClosing = Number(shift.opening_balance) + salesCash - cashOut;
  const actualClosing = Number(closing_actual);
  const difference = actualClosing - expectedClosing; // negative = kamomad, positive = ortiqcha

  db.prepare(`
    UPDATE shifts SET
      closed_at = CURRENT_TIMESTAMP,
      closing_expected = ?,
      closing_actual = ?,
      difference = ?,
      status = 'closed',
      notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(expectedClosing, actualClosing, difference, notes || null, shift.id);

  // If there's a significant difference, create an alert for admin
  if (Math.abs(difference) > 10000) {
    db.prepare(`
      INSERT INTO security_alerts (user_id, alert_type, severity, message)
      VALUES (?, 'cash_discrepancy', 'warning', ?)
    `).run(
      req.user.id,
      `Smena yopilishida kassa tafovuti aniqlandi: ${difference < 0 ? 'Kamomad' : 'Ortiqcha'} ${Math.abs(difference).toLocaleString()} so'm`
    );
  }

  logAudit(req, 'UPDATE', 'shift', shift.id, null, { action: 'CLOSE_SHIFT', expectedClosing, actualClosing, difference });
  res.json({
    success: true,
    data: {
      expectedClosing,
      actualClosing,
      difference
    },
    message: "Smena muvaffaqiyatli yopildi"});
});

// Expenses
router.get('/expenses', authenticateToken, (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, ca.name as account_name, u.name as created_by_name, b.name as branch_name
    FROM expenses e
    LEFT JOIN cash_accounts ca ON e.cash_account_id = ca.id
    LEFT JOIN users u ON e.created_by = u.id
    LEFT JOIN branches b ON e.branch_id = b.id
    ORDER BY e.date DESC, e.id DESC
  `).all();
  res.json({ success: true, data: expenses });
});

router.post('/expenses', authenticateToken, (req, res) => {
  const { branch_id, category, amount, cash_account_id, date, is_recurring, description } = req.body;
  const numAmount = Number(amount);

  if (!category || !numAmount || numAmount <= 0) {
    return res.status(400).json({ success: false, error: "Kategoriya va summa to\"g'ri kiritilishi shart"});
  }

  const targetBranch = branch_id || req.user.branch_id || 1;
  const expDate = date || new Date().toISOString().slice(0, 10);

  const expTx = db.transaction(() => {
    const eRes = db.prepare(`
      INSERT INTO expenses (branch_id, category, amount, cash_account_id, date, is_recurring, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(targetBranch, category, numAmount, cash_account_id || null, expDate, is_recurring ? 1 : 0, description || '', req.user.id);

    if (cash_account_id) {
      db.prepare('UPDATE cash_accounts SET balance = balance - ? WHERE id = ?').run(numAmount, cash_account_id);
      db.prepare(`
        INSERT INTO cash_transactions (branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by)
        VALUES (?, ?, 'out', 'expense', ?, 'UZS', ?, 'expense', ?, ?)
      `).run(targetBranch, cash_account_id, numAmount, `Xarajat: ${category}. ${description || ''}`, eRes.lastInsertRowid, req.user.id);
    }

    return eRes.lastInsertRowid;
  });

  try {
    const expId = expTx();
    logAudit(req, 'CREATE', 'expense', expId, null, { category, amount: numAmount });
    res.json({ success: true, message: "Xarajat muvaffaqiyatli saqlandi"});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Payroll / Staff Salary Calculation
router.get('/salaries', authenticateToken, requireRoles('admin'), (req, res) => {
  const { month = new Date().toISOString().slice(0, 7) } = req.query;

  const users = db.prepare(`
    SELECT u.id, u.name, u.role, u.salary_type, u.base_salary, u.commission_pct, b.name as branch_name
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE u.status = 'active'
    ORDER BY u.id ASC
  `).all();

  const payroll = users.map(u => {
    // Calculate total sales and total profit generated by this user in the specified month
    const stats = db.prepare(`
      SELECT 
        COUNT(id) as sales_count,
        COALESCE(SUM(final_amount), 0) as total_sales,
        COALESCE(SUM(gross_profit), 0) as total_profit
      FROM sales 
      WHERE seller_id = ? AND strftime('%Y-%m', created_at) = ? AND status = 'completed'
    `).get(u.id, month);

    let commission = 0;
    if (u.salary_type === 'pct_sales') {
      commission = Math.round(stats.total_sales * (u.commission_pct / 100));
    } else if (u.salary_type === 'pct_profit') {
      commission = Math.round(stats.total_profit * (u.commission_pct / 100));
    } else if (u.salary_type === 'fixed_plus_pct') {
      commission = Math.round(stats.total_profit * (u.commission_pct / 100));
    }

    const totalSalary = Number(u.base_salary) + commission;

    return {
      user_id: u.id,
      name: u.name,
      role: u.role,
      branch_name: u.branch_name,
      salary_type: u.salary_type,
      base_salary: u.base_salary,
      commission_pct: u.commission_pct,
      sales_count: stats.sales_count,
      total_sales: stats.total_sales,
      total_profit: stats.total_profit,
      commission_earned: commission,
      total_payout: totalSalary
    };
  });

  res.json({ success: true, data: payroll, month });
});

export default router;
