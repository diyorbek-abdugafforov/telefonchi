import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken, authenticateToken, logAudit } from '../auth.js';

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { login, password, deviceInfo } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || deviceInfo || "Noma'lum brauzer";

  if (!login || !password) {
    return res.status(400).json({ success: false, error: "Login va parol kiritilishi shart"});
  }

  const user = db.prepare(`
    SELECT u.*, b.name as branch_name 
    FROM users u 
    LEFT JOIN branches b ON u.branch_id = b.id 
    WHERE u.login = ?
  `).get(login);

  if (!user) {
    db.prepare(`
      INSERT INTO login_events (login, ip_address, device_info, is_success, failure_reason)
      VALUES (?, ?, ?, 0, 'Foydalanuvchi topilmadi')
    `).run(login, ip, userAgent);
    return res.status(401).json({ success: false, error: "Login yoki parol noto'g'ri"});
  }

  if (user.status === 'archived') {
    db.prepare(`
      INSERT INTO login_events (user_id, login, ip_address, device_info, is_success, failure_reason, is_suspicious)
      VALUES (?, ?, ?, ?, 0, 'Ishdan ketgan xodim kirishga urindi', 1)
    `).run(user.id, login, ip, userAgent);

    // Create high-priority security alert for owner
    db.prepare(`
      INSERT INTO security_alerts (user_id, alert_type, severity, message)
      VALUES (?, 'archived_account_attempt', 'critical', ?)
    `).run(user.id, `Diqqat! Ishdan ketgan xodim (${user.name}) tizimga kirishga urindi!`);

    return res.status(403).json({ 
      success: false, 
      error: "Ushbu xodim ishdan ketgan (arxivlangan). Tizimga kirish taqiqlangan."});
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    db.prepare(`
      INSERT INTO login_events (user_id, login, ip_address, device_info, is_success, failure_reason)
      VALUES (?, ?, ?, ?, 0, 'Noto'g'ri parol kiritildi')
    `).run(user.id, login, ip, userAgent);
    return res.status(401).json({ success: false, error: "Login yoki parol noto'g'ri"});
  }

  // Check out-of-hours login (e.g. before 09:00 or after 20:00)
  const currentHour = new Date().getHours();
  const isOutOfHours = (currentHour < 9 || currentHour >= 20) && user.role !== 'admin';
  if (isOutOfHours) {
    db.prepare(`
      INSERT INTO security_alerts (user_id, alert_type, severity, message)
      VALUES (?, 'out_of_hours_login', 'warning', ?)
    `).run(user.id, `Shubhali kirish: ${user.name} (${user.role}) ish vaqtidan tashqari (${currentHour}:${new Date().getMinutes()}) tizimga kirdi`);
  }

  // Create JWT token
  const token = generateToken(user);

  // Store active session
  db.prepare(`
    INSERT INTO sessions (user_id, token, device_info, browser, ip_address, location)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    token,
    deviceInfo || 'Veb qurilma',
    userAgent.slice(0, 80),
    ip,
    "Toshkent, O'zbekiston"
  );

  // Log successful login
  db.prepare(`
    INSERT INTO login_events (user_id, login, ip_address, device_info, is_success, is_suspicious)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(user.id, login, ip, userAgent, isOutOfHours ? 1 : 0);

  logAudit({ user, headers: req.headers, socket: req.socket }, 'LOGIN', 'auth', user.id, null, 'Tizimga kirdi');

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      branch_id: user.branch_id,
      branch_name: user.branch_name,
      phone: user.phone
    }
  });
});

// Demo switch route - instantly switch between roles for testing
router.post('/switch-demo', (req, res) => {
  const { role } = req.body;
  const user = db.prepare(`
    SELECT u.*, b.name as branch_name 
    FROM users u 
    LEFT JOIN branches b ON u.branch_id = b.id 
    WHERE u.role = ? AND u.status = 'active' 
    LIMIT 1
  `).get(role || 'admin');

  if (!user) {
    return res.status(404).json({ success: false, error: "Bu lavozimdagi demo foydalanuvchi topilmadi"});
  }

  const token = generateToken(user);
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      branch_id: user.branch_id,
      branch_name: user.branch_name,
      phone: user.phone
    }
  });
});

// Current user profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.login, u.role, u.branch_id, u.phone, u.status, u.base_salary, u.commission_pct,
           b.name as branch_name
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE u.id = ?
  `).get(req.user.id);

  res.json({
    success: true,
    user
  });
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  if (req.token) {
    db.prepare('UPDATE sessions SET is_revoked = 1 WHERE token = ?').run(req.token);
  }
  logAudit(req, 'LOGOUT', 'auth', req.user.id, null, 'Tizimdan chiqdi');
  res.json({ success: true, message: "Muvaffaqiyatli chiqildi"});
});

export default router;
