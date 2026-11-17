import jwt from 'jsonwebtoken';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'phone_pos_secret_key_2026_uzbekistan_secure';

// Audit log helper
export function logAudit(req, action, entityType, entityId, oldValues = null, newValues = null) {
  try {
    const user = req.user || { id: 1, name: 'Tizim' };
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.name,
      action,
      entityType,
      String(entityId || ''),
      oldValues ? (typeof oldValues === 'object' ? JSON.stringify(oldValues) : String(oldValues)) : null,
      newValues ? (typeof newValues === 'object' ? JSON.stringify(newValues) : String(newValues)) : null,
      String(ip)
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Generate JWT
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      login: user.login,
      role: user.role,
      name: user.name,
      branch_id: user.branch_id
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Auth Middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, error: "Tizimga kirish talab etiladi (Token yo'q)"});
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user is still active in database
    const user = db.prepare('SELECT id, name, login, role, branch_id, status FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: "Foydalanuvchi topilmadi"});
    }

    if (user.status === 'archived') {
      return res.status(403).json({ 
        success: false, 
        error: "Ushbu xodim ishdan ketgan (arxivlangan). Tizimga kirish taqiqlangan."});
    }

    // Check if session has been revoked by admin
    const activeSession = db.prepare('SELECT id, is_revoked FROM sessions WHERE token = ?').get(token);
    if (activeSession && activeSession.is_revoked === 1) {
      return res.status(403).json({ 
        success: false, 
        error: "Sizning seansingiz ma'mur tomonidan majburan yopildi."});
    }

    // Update last_active_at for session
    if (activeSession) {
      db.prepare("UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?").run(activeSession.id);
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Yaroqsiz yoki muddati o'tgan seans"});
  }
}

// Role Authorization Middleware
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Ruxsat etilmagan"});
    }

    // Admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Ushbu amalni bajarish uchun sizning lavozimingizda (${req.user.role}) ruxsat yo'q` 
      });
    }

    next();
  };
}

// Data sanitize helper based on role
export function sanitizeDeviceData(device, role) {
  if (!device) return null;
  const copy = { ...device };
  // Hide cost price and extra costs for non-permitted roles (sotuvchi, kassir, omborchi)
  if (role === 'seller' || role === 'cashier' || role === 'warehouse') {
    delete copy.cost_price;
    delete copy.purchase_price;
    delete copy.extra_costs;
    delete copy.supplier_id;
    delete copy.supplier_name;
  }
  return copy;
}

export function sanitizeSaleData(sale, role) {
  if (!sale) return null;
  const copy = { ...sale };
  if (role === 'seller' || role === 'cashier' || role === 'warehouse') {
    delete copy.total_cost;
    delete copy.gross_profit;
    delete copy.profit;
    if (copy.items && Array.isArray(copy.items)) {
      copy.items = copy.items.map(item => {
        const itemCopy = { ...item };
        delete itemCopy.unit_cost;
        delete itemCopy.profit;
        return itemCopy;
      });
    }
  }
  return copy;
}
