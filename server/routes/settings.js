import express from 'express';
import db from '../db.js';
import { authenticateToken, requireRoles, logAudit } from '../auth.js';

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  rows.forEach(r => { settingsObj[r.key] = r.value; });
  res.json({ success: true, data: settingsObj });
});

// Update settings (USD exchange rate, store info, etc.)
router.post('/', authenticateToken, requireRoles('admin'), (req, res) => {
  const { settings = {} } = req.body;
  const insertStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  const tx = db.transaction(() => {
    for (const [key, val] of Object.entries(settings)) {
      insertStmt.run(key, String(val));
    }
  });

  try {
    tx();
    logAudit(req, 'UPDATE', 'settings', 0, null, settings);
    res.json({ success: true, message: "Sozlamalar muvaffaqiyatli saqlandi"});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Branches
router.get('/branches', authenticateToken, (req, res) => {
  const branches = db.prepare('SELECT * FROM branches ORDER BY is_main DESC, id ASC').all();
  res.json({ success: true, data: branches });
});

router.post('/branches', authenticateToken, requireRoles('admin'), (req, res) => {
  const { name, address, phone, is_main = 0 } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Filial nomi kiritilishi shart"});

  const result = db.prepare(`
    INSERT INTO branches (name, address, phone, is_main) VALUES (?, ?, ?, ?)
  `).run(name, address || '', phone || '', is_main ? 1 : 0);

  res.json({ success: true, message: "Filial qo\"shildi", branchId: result.lastInsertRowid });
});

// Brands
router.get('/brands', authenticateToken, (req, res) => {
  const brands = db.prepare('SELECT * FROM brands ORDER BY name ASC').all();
  res.json({ success: true, data: brands });
});

router.post('/brands', authenticateToken, requireRoles('admin', 'manager', 'seller', 'cashier', 'warehouse'), (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, error: "Brend nomi kiritilishi shart"});
  
  // Check if exists
  const existing = db.prepare('SELECT * FROM brands WHERE LOWER(name) = LOWER(?)').get(name.trim());
  if (existing) {
    return res.json({ success: true, id: existing.id, data: existing });
  }

  const result = db.prepare('INSERT INTO brands (name) VALUES (?)').run(name.trim());
  const newBrand = db.prepare('SELECT * FROM brands WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, id: result.lastInsertRowid, data: newBrand });
});

// Models
router.get('/models', authenticateToken, (req, res) => {
  const { brand_id } = req.query;
  let query = `
    SELECT m.*, b.name as brand_name 
    FROM models m 
    LEFT JOIN brands b ON m.brand_id = b.id
    WHERE 1=1
  `;
  const params = [];
  if (brand_id) {
    query += ' AND m.brand_id = ?';
    params.push(Number(brand_id));
  }
  query += ' ORDER BY b.name ASC, m.name ASC';
  const models = db.prepare(query).all(...params);
  res.json({ success: true, data: models });
});

router.post('/models', authenticateToken, requireRoles('admin', 'manager', 'seller', 'cashier', 'warehouse'), (req, res) => {
  const { brand_id, name, ram = '', storage = '', release_year } = req.body;
  if (!brand_id || !name || !name.trim()) {
    return res.status(400).json({ success: false, error: "Brend va model nomi shart"});
  }

  const cleanName = name.trim();
  const cleanStorage = (storage || '').trim();
  const cleanRam = (ram || '').trim();
  const year = release_year || new Date().getFullYear();

  // Check if this exact model with storage already exists
  const existing = db.prepare(`
    SELECT m.*, b.name as brand_name 
    FROM models m 
    LEFT JOIN brands b ON m.brand_id = b.id
    WHERE m.brand_id = ? AND LOWER(m.name) = LOWER(?) AND m.storage = ?
  `).get(brand_id, cleanName, cleanStorage);

  if (existing) {
    return res.json({ success: true, id: existing.id, data: existing, message: "Model allaqachon mavjud, tanlandi" });
  }

  const result = db.prepare(`
    INSERT INTO models (brand_id, name, ram, storage, release_year)
    VALUES (?, ?, ?, ?, ?)
  `).run(brand_id, cleanName, cleanRam, cleanStorage, year);

  const newModel = db.prepare(`
    SELECT m.*, b.name as brand_name 
    FROM models m 
    LEFT JOIN brands b ON m.brand_id = b.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.json({ success: true, id: result.lastInsertRowid, data: newModel, message: "Yangi model muvaffaqiyatli kiritildi!" });
});

// Colors
router.get('/colors', authenticateToken, (req, res) => {
  const colors = db.prepare('SELECT * FROM colors ORDER BY name ASC').all();
  res.json({ success: true, data: colors });
});

router.post('/colors', authenticateToken, (req, res) => {
  const { name, hex_code } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Rang nomi shart"});
  const result = db.prepare('INSERT INTO colors (name, hex_code) VALUES (?, ?)').run(name, hex_code || '#777777');
  res.json({ success: true, id: result.lastInsertRowid });
});

export default router;
