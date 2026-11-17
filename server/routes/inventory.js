import express from 'express';
import db from '../db.js';
import { authenticateToken, sanitizeDeviceData, logAudit } from '../auth.js';

const router = express.Router();

// List accessories
router.get('/accessories', authenticateToken, (req, res) => {
  const { branch_id, search } = req.query;
  let query = `
    SELECT a.*, b.name as branch_name
    FROM accessories a
    LEFT JOIN branches b ON a.branch_id = b.id
    WHERE 1=1
  `;
  const params = [];
  if (branch_id && branch_id !== 'all') {
    query += ' AND a.branch_id = ?';
    params.push(Number(branch_id));
  }
  if (search) {
    query += ' AND (a.name LIKE ? OR a.sku LIKE ? OR a.category LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  query += ' ORDER BY a.id DESC';

  const accessories = db.prepare(query).all(...params);
  res.json({ success: true, data: accessories });
});

// Create accessory
router.post('/accessories', authenticateToken, (req, res) => {
  const { branch_id, name, category, sku, stock_qty = 0, cost_price = 0, selling_price = 0, min_alert_qty = 5 } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Nom kiritilishi shart' });

  const targetBranch = branch_id || req.user.branch_id || 1;
  const result = db.prepare(`
    INSERT INTO accessories (branch_id, name, category, sku, stock_qty, cost_price, selling_price, min_alert_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(targetBranch, name, category, sku || `ACC-${Date.now().toString().slice(-5)}`, Number(stock_qty), Number(cost_price), Number(selling_price), Number(min_alert_qty));

  logAudit(req, 'CREATE', 'accessory', result.lastInsertRowid, null, { name, stock_qty });
  res.json({ success: true, message: "Aksessuar muvaffaqiyatli qo'shildi", id: result.lastInsertRowid });
});

// Update accessory stock
router.put('/accessories/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, stock_qty, cost_price, selling_price, min_alert_qty } = req.body;

  db.prepare(`
    UPDATE accessories SET
      name = COALESCE(?, name),
      stock_qty = COALESCE(?, stock_qty),
      cost_price = COALESCE(?, cost_price),
      selling_price = COALESCE(?, selling_price),
      min_alert_qty = COALESCE(?, min_alert_qty)
    WHERE id = ?
  `).run(name || null, stock_qty !== undefined ? Number(stock_qty) : null, cost_price !== undefined ? Number(cost_price) : null, selling_price !== undefined ? Number(selling_price) : null, min_alert_qty !== undefined ? Number(min_alert_qty) : null, id);

  res.json({ success: true, message: "Aksessuar ma'lumotlari yangilandi" });
});

// Inter-branch transfers list
router.get('/transfers', authenticateToken, (req, res) => {
  const transfers = db.prepare(`
    SELECT sm.*, d.imei1, m.name as model_name,
           b_from.name as from_branch_name, b_to.name as to_branch_name,
           u.name as created_by_name
    FROM stock_movements sm
    LEFT JOIN devices d ON sm.device_id = d.id
    LEFT JOIN models m ON d.model_id = m.id
    LEFT JOIN branches b_from ON sm.from_branch_id = b_from.id
    LEFT JOIN branches b_to ON sm.to_branch_id = b_to.id
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE sm.type IN ('transfer_sent', 'transfer_received')
    ORDER BY sm.id DESC
    LIMIT 100
  `).all();

  res.json({ success: true, data: transfers });
});

// Send transfer to another branch
router.post('/transfer/send', authenticateToken, (req, res) => {
  const { device_id, to_branch_id, notes } = req.body;
  if (!device_id || !to_branch_id) {
    return res.status(400).json({ success: false, error: 'Telefon va qabul qiluvchi filial tanlanishi shart' });
  }

  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id);
  if (!device) return res.status(404).json({ success: false, error: 'Telefon topilmadi' });
  if (device.status !== 'omborda') {
    return res.status(400).json({ success: false, error: `Telefon hozir omborda emas (Holati: ${device.status})` });
  }

  const sendTx = db.transaction(() => {
    // 1. Mark device as 'yo''lda'
    db.prepare("UPDATE devices SET status = 'yo''lda' WHERE id = ?").run(device_id);

    // 2. Insert movement
    const mRes = db.prepare(`
      INSERT INTO stock_movements (device_id, from_branch_id, to_branch_id, type, status, notes, created_by)
      VALUES (?, ?, ?, 'transfer_sent', 'in_transit', ?, ?)
    `).run(device_id, device.branch_id, to_branch_id, notes || "Filiallararo ko'chirish jo'natildi", req.user.id);

    return mRes.lastInsertRowid;
  });

  try {
    const moveId = sendTx();
    logAudit(req, 'STATUS_CHANGE', 'device', device_id, { status: 'omborda' }, { status: "yo'lda", to_branch_id });
    res.json({ success: true, message: "Telefon muvaffaqiyatli jo'natildi (yo'lda)" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Accept incoming transfer
router.post('/transfer/accept', authenticateToken, (req, res) => {
  const { device_id, notes } = req.body;
  if (!device_id) return res.status(400).json({ success: false, error: "Telefon ID ko'rsatilishi shart" });

  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id);
  if (!device) return res.status(404).json({ success: false, error: 'Telefon topilmadi' });
  if (device.status !== "yo'lda" && device.status !== "yo''lda") {
    return res.status(400).json({ success: false, error: "Ushbu telefon yo'lda emas" });
  }

  const lastMove = db.prepare(`
    SELECT * FROM stock_movements WHERE device_id = ? AND type = 'transfer_sent' ORDER BY id DESC LIMIT 1
  `).get(device_id);

  const targetBranch = lastMove ? lastMove.to_branch_id : (req.user.branch_id || 1);

  const acceptTx = db.transaction(() => {
    db.prepare("UPDATE devices SET status = 'omborda', branch_id = ? WHERE id = ?").run(targetBranch, device_id);

    if (lastMove) {
      db.prepare("UPDATE stock_movements SET status = 'completed' WHERE id = ?").run(lastMove.id);
    }

    db.prepare(`
      INSERT INTO stock_movements (device_id, from_branch_id, to_branch_id, type, status, notes, created_by)
      VALUES (?, ?, ?, 'transfer_received', 'completed', ?, ?)
    `).run(device_id, device.branch_id, targetBranch, notes || 'Qabul qilib olindi', req.user.id);
  });

  try {
    acceptTx();
    logAudit(req, 'STATUS_CHANGE', 'device', device_id, { status: "yo'lda" }, { status: 'omborda', branch_id: targetBranch });
    res.json({ success: true, message: 'Telefon qabul qilindi va omborga joylashtirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Full IMEI history timeline
router.get('/imei-history/:imei', authenticateToken, (req, res) => {
  const { imei } = req.params;
  const device = db.prepare(`
    SELECT d.*, m.name as model_name, b.name as brand_name, c.name as color_name
    FROM devices d
    LEFT JOIN models m ON d.model_id = m.id
    LEFT JOIN brands b ON m.brand_id = b.id
    LEFT JOIN colors c ON d.color_id = c.id
    WHERE d.imei1 = ? OR d.imei2 = ?
  `).get(imei, imei);

  if (!device) {
    return res.status(404).json({ success: false, error: "Ushbu IMEI bo'yicha ma'lumot topilmadi" });
  }

  const movements = db.prepare(`
    SELECT sm.*, b_from.name as from_branch_name, b_to.name as to_branch_name, u.name as created_by_name
    FROM stock_movements sm
    LEFT JOIN branches b_from ON sm.from_branch_id = b_from.id
    LEFT JOIN branches b_to ON sm.to_branch_id = b_to.id
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE sm.device_id = ?
    ORDER BY sm.id ASC
  `).all(device.id);

  // Sales history if sold
  const sales = db.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.name as seller_name
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.seller_id = u.id
    WHERE si.device_id = ?
  `).all(device.id);

  // Repairs history if any
  const repairs = db.prepare(`
    SELECT r.*, u.name as technician_name
    FROM repairs r
    LEFT JOIN users u ON r.technician_id = u.id
    WHERE r.device_id = ? OR r.imei = ?
  `).all(device.id, imei);

  res.json({
    success: true,
    data: {
      device: sanitizeDeviceData(device, req.user.role),
      movements,
      sales,
      repairs
    }
  });
});

// Inventory Audit / Inventarizatsiya
// Start or process inventory audit session
router.post('/audits/reconcile', authenticateToken, (req, res) => {
  const { branch_id, scanned_imeis = [], notes } = req.body;
  const targetBranch = branch_id || req.user.branch_id || 1;

  // Expected devices currently in stock for this branch
  const expectedDevices = db.prepare(`
    SELECT d.id, d.imei1, m.name as model_name, d.status
    FROM devices d
    JOIN models m ON d.model_id = m.id
    WHERE d.branch_id = ? AND d.status = 'omborda'
  `).all(targetBranch);

  const scannedSet = new Set(scanned_imeis.map(i => String(i).trim()));
  const expectedMap = new Map();
  expectedDevices.forEach(d => expectedMap.set(d.imei1, d));

  const matched = [];
  const missing = [];
  const surplus = [];

  // 1. Check expected devices
  expectedDevices.forEach(d => {
    if (scannedSet.has(d.imei1)) {
      matched.push({ id: d.id, imei: d.imei1, model_name: d.model_name, status: 'Topildi' });
    } else {
      missing.push({ id: d.id, imei: d.imei1, model_name: d.model_name, status: "Kamomad (Yo'q)" });
    }
  });

  // 2. Check scanned devices not in expected list
  scannedSet.forEach(imei => {
    if (!expectedMap.has(imei)) {
      // Find if it exists elsewhere
      const existsElsewhere = db.prepare(`
        SELECT d.id, d.imei1, m.name as model_name, d.status, b.name as branch_name
        FROM devices d
        JOIN models m ON d.model_id = m.id
        LEFT JOIN branches b ON d.branch_id = b.id
        WHERE d.imei1 = ?
      `).get(imei);

      surplus.push({
        imei,
        model_name: existsElsewhere ? existsElsewhere.model_name : "Noma'lum",
        status: existsElsewhere ? `Boshqa joyda (${existsElsewhere.branch_name}, ${existsElsewhere.status})` : 'Bazaga kiritilmagan'
      });
    }
  });

  const auditNumber = `AUDIT-${Date.now().toString().slice(-6)}`;

  // Save audit log to database
  const auditRes = db.prepare(`
    INSERT INTO inventory_audits (
      audit_number, branch_id, total_expected, total_scanned, total_missing, total_surplus, status, notes, created_by, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, CURRENT_TIMESTAMP)
  `).run(
    auditNumber,
    targetBranch,
    expectedDevices.length,
    scannedSet.size,
    missing.length,
    surplus.length,
    notes || '',
    req.user.id
  );

  res.json({
    success: true,
    data: {
      audit_number: auditNumber,
      total_expected: expectedDevices.length,
      total_scanned: scannedSet.size,
      matched_count: matched.length,
      missing_count: missing.length,
      surplus_count: surplus.length,
      matched,
      missing,
      surplus
    }
  });
});

export default router;
