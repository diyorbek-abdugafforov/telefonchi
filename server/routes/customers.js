import express from 'express';
import db from '../db.js';
import { authenticateToken, logAudit } from '../auth.js';

const router = express.Router();

// List customers
router.get('/', authenticateToken, (req, res) => {
  const { search, blacklisted } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR passport_number LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (blacklisted !== undefined && blacklisted !== 'all') {
    query += ' AND is_blacklisted = ?';
    params.push(Number(blacklisted));
  }

  query += ' ORDER BY id DESC';
  const customers = db.prepare(query).all(...params);
  res.json({ success: true, data: customers });
});

// Get customer details with purchase history and debts
router.get('/:id', authenticateToken, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: "Mijoz topilmadi"});

  // Sales history
  const sales = db.prepare(`
    SELECT s.*, u.name as seller_name 
    FROM sales s 
    LEFT JOIN users u ON s.seller_id = u.id 
    WHERE s.customer_id = ? 
    ORDER BY s.id DESC
  `).all(customer.id);

  // Active installments
  const installments = db.prepare(`
    SELECT i.*, s.sale_number 
    FROM installments i 
    LEFT JOIN sales s ON i.sale_id = s.id 
    WHERE i.customer_id = ? 
    ORDER BY i.id DESC
  `).all(customer.id);

  res.json({
    success: true,
    data: {
      customer,
      sales,
      installments
    }
  });
});

// Create customer
router.post('/', authenticateToken, (req, res) => {
  const { name, phone, passport_series, passport_number, address, notes, birth_date } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, error: "Ism va telefon raqami kiritilishi shart"});
  }

  const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(400).json({ success: false, error: "Bu telefon raqamiga ega mijoz allaqachon mavjud"});
  }

  const result = db.prepare(`
    INSERT INTO customers (name, phone, passport_series, passport_number, address, notes, birth_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    phone,
    passport_series ? passport_series.toUpperCase() : null,
    passport_number || null,
    address || '',
    notes || '',
    birth_date || null
  );

  logAudit(req, 'CREATE', 'customer', result.lastInsertRowid, null, { name, phone });
  res.json({ success: true, message: "Mijoz muvaffaqiyatli saqlandi", customerId: result.lastInsertRowid });
});

// Update customer
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, phone, passport_series, passport_number, address, notes, is_blacklisted } = req.body;

  db.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      passport_series = COALESCE(?, passport_series),
      passport_number = COALESCE(?, passport_number),
      address = COALESCE(?, address),
      notes = COALESCE(?, notes),
      is_blacklisted = COALESCE(?, is_blacklisted)
    WHERE id = ?
  `).run(
    name || null,
    phone || null,
    passport_series ? passport_series.toUpperCase() : null,
    passport_number || null,
    address || null,
    notes || null,
    is_blacklisted !== undefined ? Number(is_blacklisted) : null,
    id
  );

  res.json({ success: true, message: "Mijoz ma\"lumotlari yangilandi"});
});

export default router;
