import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticateToken, requireRoles, logAudit } from '../auth.js';

const router = express.Router();

// List all staff (active & archived)
router.get('/', authenticateToken, requireRoles('admin', 'manager'), (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.login, u.role, u.branch_id, u.phone, u.status,
           u.salary_type, u.base_salary, u.commission_pct, u.hire_date, u.exit_date,
           b.name as branch_name,
           (SELECT COUNT(*) FROM sales WHERE seller_id = u.id) as total_sales_count,
           (SELECT COALESCE(SUM(final_amount), 0) FROM sales WHERE seller_id = u.id AND status = 'completed') as total_sales_volume
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    ORDER BY u.status ASC, u.id ASC
  `).all();

  res.json({ success: true, data: users });
});

// Add new staff
router.post('/', authenticateToken, requireRoles('admin'), (req, res) => {
  const {
    name,
    login,
    password,
    role = 'seller',
    branch_id,
    phone,
    salary_type = 'fixed_plus_pct',
    base_salary = 0,
    commission_pct = 0,
    hire_date = new Date().toISOString().slice(0, 10),
    notes
  } = req.body;

  if (!name || !login || !password) {
    return res.status(400).json({ success: false, error: "Ism, login va parol kiritilishi shart"});
  }

  const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) {
    return res.status(400).json({ success: false, error: "Bu login allaqachon band"});
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const result = db.prepare(`
    INSERT INTO users (
      name, login, password_hash, role, branch_id, phone, status,
      salary_type, base_salary, commission_pct, hire_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(
    name,
    login,
    passwordHash,
    role,
    branch_id || 1,
    phone || '',
    salary_type,
    Number(base_salary),
    Number(commission_pct),
    hire_date,
    notes || ''
  );

  logAudit(req, 'CREATE', 'user', result.lastInsertRowid, null, { name, login, role });
  res.json({ success: true, message: "Yangi xodim muvaffaqiyatli qo\"shildi", userId: result.lastInsertRowid });
});

// Update staff details
router.put('/:id', authenticateToken, requireRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { name, phone, branch_id, role, salary_type, base_salary, commission_pct, notes } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, error: "Xodim topilmadi" });

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      branch_id = COALESCE(?, branch_id),
      role = COALESCE(?, role),
      salary_type = COALESCE(?, salary_type),
      base_salary = COALESCE(?, base_salary),
      commission_pct = COALESCE(?, commission_pct),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name || null,
    phone || null,
    branch_id || null,
    role || null,
    salary_type || null,
    base_salary !== undefined ? Number(base_salary) : null,
    commission_pct !== undefined ? Number(commission_pct) : null,
    notes || null,
    id
  );

  logAudit(req, 'UPDATE', 'user', id, existing, req.body);
  res.json({ success: true, message: "Xodim ma'lumotlari yangilandi" });
});

// Set / Reset staff password
router.put('/:id/password', authenticateToken, requireRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ success: false, error: "Yangi parol kamida 4 belgidan iborat bo'lishi kerak" });
  }

  const existing = db.prepare('SELECT id, name, login FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, error: "Xodim topilmadi" });

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  db.prepare(`
    UPDATE users SET
      password_hash = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(passwordHash, id);

  // Invalidate old sessions so user must log in with new password
  db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(id);

  logAudit(req, 'PASSWORD_RESET', 'user', id, null, `Parol ma'mur tomonidan yangilandi: ${existing.name}`);
  res.json({ success: true, message: `${existing.name} uchun yangi parol muvaffaqiyatli o'rnatildi` });
});

// Terminate / Archive staff ("Ishdan ketgan xodim" - Never delete!)
router.post('/:id/terminate', authenticateToken, requireRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ success: false, error: "Xodim topilmadi"});
  if (user.role === 'admin' && user.id === req.user.id) {
    return res.status(400).json({ success: false, error: "Bosh ma\"mur o'zini o'zi ishdan bo'shata olmaydi"});
  }

  const termTx = db.transaction(() => {
    // 1. Mark status as 'archived' and set exit_date
    db.prepare(`
      UPDATE users SET
        status = 'archived',
        exit_date = CURRENT_TIMESTAMP,
        notes = notes || ?
      WHERE id = ?
    `).run(` [Ishdan ketgan: ${reason || 'Egasi tomonidan arxivlandi'}]`, id);

    // 2. Invalidate all active sessions for this user
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(id);

    // 3. Check for any pending open shifts for this employee
    const openShift = db.prepare("SELECT id FROM shifts WHERE cashier_id = ? AND status = 'open'").get(id);
    if (openShift) {
      db.prepare("UPDATE shifts SET status = 'closed', closed_at = CURRENT_TIMESTAMP, notes = 'Xodim ishdan ketishi sababli majburan yopildi' WHERE id = ?").run(openShift.id);
    }
  });

  try {
    termTx();
    logAudit(req, 'STATUS_CHANGE', 'user', id, { status: user.status }, { status: "archived", reason });
    res.json({
      success: true,
      message: `${user.name} muvaffaqiyatli arxivlandi (ishdan ketgan holatiga o'tkazildi). Barcha seanslari yopildi, lekin uning barcha sotuv va kafolat tarixlari saqlanib qoldi.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reactivate archived staff
router.post('/:id/reactivate', authenticateToken, requireRoles('admin'), (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE users SET status = 'active', exit_date = NULL WHERE id = ?").run(id);
  logAudit(req, 'STATUS_CHANGE', 'user', id, { status: "archived" }, { status: "active" });
  res.json({ success: true, message: "Xodim qayta faollashtirildi"});
});

// Active Sessions List
router.get('/sessions', authenticateToken, requireRoles('admin', 'manager'), (req, res) => {
  const sessions = db.prepare(`
    SELECT s.*, u.name as user_name, u.login, u.role, b.name as branch_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE s.is_revoked = 0
    ORDER BY s.last_active_at DESC
  `).all();

  res.json({ success: true, data: sessions });
});

// Force-kill a single session (Majburan yopish)
router.post('/sessions/:id/revoke', authenticateToken, requireRoles('admin'), (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').run(id);
  logAudit(req, 'REVOKE_SESSION', 'session', id, null, 'Seans majburan yopildi');
  res.json({ success: true, message: "Seans muvaffaqiyatli majburan yopildi"});
});

// Force-kill all sessions of a user
router.post('/users/:id/revoke-all-sessions', authenticateToken, requireRoles('admin'), (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?').run(id);
  logAudit(req, 'REVOKE_ALL_SESSIONS', 'user', id, null, 'Foydalanuvchining barcha seanslari majburan yopildi');
  res.json({ success: true, message: "Barcha faol seanslar yopildi"});
});

// Security Alerts
router.get('/security-alerts', authenticateToken, requireRoles('admin', 'manager'), (req, res) => {
  const alerts = db.prepare(`
    SELECT sa.*, u.name as user_name
    FROM security_alerts sa
    LEFT JOIN users u ON sa.user_id = u.id
    ORDER BY sa.id DESC LIMIT 50
  `).all();

  res.json({ success: true, data: alerts });
});

router.post('/security-alerts/:id/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE security_alerts SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Audit Logs Viewer
router.get('/audit-logs', authenticateToken, requireRoles('admin'), (req, res) => {
  const { action, entity_type, limit = 100 } = req.query;
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (action && action !== 'all') {
    query += ' AND action = ?';
    params.push(action);
  }
  if (entity_type && entity_type !== 'all') {
    query += ' AND entity_type = ?';
    params.push(entity_type);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(Number(limit));

  const logs = db.prepare(query).all(...params);
  res.json({ success: true, data: logs });
});

export default router;
