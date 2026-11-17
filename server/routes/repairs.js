import express from 'express';
import db from '../db.js';
import { authenticateToken, logAudit } from '../auth.js';

const router = express.Router();

// List repair orders
router.get('/', authenticateToken, (req, res) => {
  const { status, technician_id } = req.query;
  let query = `
    SELECT r.*, u.name as technician_name, u_cr.name as created_by_name
    FROM repairs r
    LEFT JOIN users u ON r.technician_id = u.id
    LEFT JOIN users u_cr ON r.created_by = u_cr.id
    WHERE 1=1
  `;
  const params = [];
  if (status && status !== 'all') {
    query += ' AND r.status = ?';
    params.push(status);
  }
  if (technician_id && technician_id !== 'all') {
    query += ' AND r.technician_id = ?';
    params.push(Number(technician_id));
  }
  query += ' ORDER BY r.id DESC';

  const repairs = db.prepare(query).all(...params);
  res.json({ success: true, data: repairs });
});

// Create repair order
router.post('/', authenticateToken, (req, res) => {
  const {
    device_type = 'customer',
    device_id,
    model_name,
    imei,
    customer_name,
    customer_phone,
    issue_description,
    technician_id,
    parts_cost = 0,
    labor_cost = 0,
    notes
  } = req.body;

  if (!model_name || !issue_description) {
    return res.status(400).json({ success: false, error: "Model nomi va muammo ta\"rifi kiritilishi shart"});
  }

  const orderNumber = `REP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const totalCost = Number(parts_cost) + Number(labor_cost);

  const result = db.prepare(`
    INSERT INTO repairs (
      order_number, device_type, device_id, model_name, imei,
      customer_name, customer_phone, issue_description, technician_id,
      parts_cost, labor_cost, total_cost, status, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
  `).run(
    orderNumber,
    device_type,
    device_id || null,
    model_name,
    imei || '',
    customer_name || '',
    customer_phone || '',
    issue_description,
    technician_id || null,
    Number(parts_cost),
    Number(labor_cost),
    totalCost,
    notes || '',
    req.user.id
  );

  // If stock phone, update device status to 'ta'mirda'
  if (device_type === 'stock' && device_id) {
    db.prepare("UPDATE devices SET status = 'ta'mirda' WHERE id = ?").run(device_id);
  }

  logAudit(req, 'CREATE', 'repair', result.lastInsertRowid, null, { orderNumber, model_name });
  res.json({ success: true, message: "Ta\"mir buyurtmasi qabul qilindi", orderNumber });
});

// Update repair status
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, parts_cost, labor_cost, notes } = req.body;

  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(id);
  if (!repair) return res.status(404).json({ success: false, error: "Ta\"mir buyurtmasi topilmadi"});

  const finalParts = parts_cost !== undefined ? Number(parts_cost) : Number(repair.parts_cost);
  const finalLabor = labor_cost !== undefined ? Number(labor_cost) : Number(repair.labor_cost);
  const totalCost = finalParts + finalLabor;

  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE repairs SET
        status = ?,
        parts_cost = ?,
        labor_cost = ?,
        total_cost = ?,
        notes = COALESCE(?, notes),
        completed_at = CASE WHEN ? IN ('ready', 'delivered') THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = ?
    `).run(status, finalParts, finalLabor, totalCost, notes || null, status, id);

    // If stock phone and repaired/ready -> add costs to device cost price (tannarx) and return to stock!
    if (repair.device_type === 'stock' && repair.device_id && (status === 'ready' || status === 'delivered')) {
      const dev = db.prepare('SELECT * FROM devices WHERE id = ?').get(repair.device_id);
      if (dev) {
        const newExtra = Number(dev.extra_costs) + totalCost;
        const newCost = Number(dev.purchase_price) + newExtra;
        db.prepare(`
          UPDATE devices SET
            status = 'omborda',
            extra_costs = ?,
            cost_price = ?
          WHERE id = ?
        `).run(newExtra, newCost, repair.device_id);

        db.prepare(`
          INSERT INTO stock_movements (device_id, to_branch_id, type, notes, created_by)
          VALUES (?, ?, 'repair', ?, ?)
        `).run(dev.id, dev.branch_id, `Ta'mirdan chiqdi va tannarxga ${totalCost.toLocaleString()} so'm qo'shildi`, req.user.id);
      }
    }
  });

  try {
    updateTx();
    logAudit(req, 'STATUS_CHANGE', 'repair', id, { status: repair.status }, { status, totalCost });
    res.json({ success: true, message: "Ta\"mir holati muvaffaqiyatli yangilandi"});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Warranty lookup by IMEI
router.get('/warranty-check/:imei', authenticateToken, (req, res) => {
  const { imei } = req.params;
  const cleaned = String(imei).trim();

  const saleItem = db.prepare(`
    SELECT si.*, s.sale_number, s.created_at as sale_date, s.warranty_end_date,
           c.name as customer_name, c.phone as customer_phone,
           d.condition_type, d.warranty_months, br.name as branch_name,
           CAST((julianday(s.warranty_end_date) - julianday('now')) AS INTEGER) as days_remaining
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN devices d ON si.device_id = d.id
    LEFT JOIN branches br ON s.branch_id = br.id
    WHERE si.imei = ?
    ORDER BY s.id DESC LIMIT 1
  `).get(cleaned);

  if (!saleItem) {
    return res.status(404).json({ success: false, error: "Ushbu IMEI bo\"yicha sotuv yozuvi topilmadi"});
  }

  const isExpired = saleItem.days_remaining < 0;

  res.json({
    success: true,
    data: {
      ...saleItem,
      is_valid: !isExpired,
      status_text: isExpired ? `Kafolat muddati ${Math.abs(saleItem.days_remaining)} kun oldin tugagan` : `Kafolat amal qilmoqda (${saleItem.days_remaining} kun qoldi)`
    }
  });
});

export default router;
