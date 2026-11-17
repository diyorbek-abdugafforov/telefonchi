import express from 'express';
import db, { validateIMEI, generateValidIMEI } from '../db.js';
import { authenticateToken, logAudit } from '../auth.js';

const router = express.Router();

// List wholesale purchases
router.get('/', authenticateToken, (req, res) => {
  const purchases = db.prepare(`
    SELECT p.*, s.name as supplier_name, b.name as branch_name, u.name as created_by_name
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN branches b ON p.branch_id = b.id
    LEFT JOIN users u ON p.created_by = u.id
    ORDER BY p.id DESC
  `).all();

  res.json({ success: true, data: purchases });
});

// Create wholesale purchase from supplier
router.post('/supplier', authenticateToken, (req, res) => {
  const {
    supplier_id,
    branch_id,
    invoice_number,
    currency = 'UZS',
    exchange_rate = 1,
    paid_amount = 0,
    cash_account_id,
    payment_method = 'cash_uzs',
    extra_costs = 0,
    devices = [], // array of { model_id, color_id, imei1, imei2, condition_type, purchase_price, selling_price, min_price }
    notes
  } = req.body;

  if (!supplier_id || !devices.length) {
    return res.status(400).json({ success: false, error: "Yetkazib beruvchi va kamida 1 ta telefon kiritilishi shart"});
  }

  // Pre-validate all IMEIs
  for (const d of devices) {
    if (!validateIMEI(d.imei1)) {
      return res.status(400).json({ 
        success: false, 
        error: `IMEI ${d.imei1} noto'g'ri formatda yoki Luhn algoritmidan o'tmadi!` 
      });
    }
    const exists = db.prepare('SELECT id FROM devices WHERE imei1 = ?').get(d.imei1);
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        error: `IMEI ${d.imei1} bo'yicha telefon allaqachon mavjud!` 
      });
    }
  }

  // Calculate totals
  const rate = currency === 'USD' ? Number(exchange_rate) : 1;
  const extraPerItem = devices.length > 0 ? (Number(extra_costs) * rate) / devices.length : 0;
  
  let totalPurchaseUzs = 0;
  devices.forEach(d => {
    totalPurchaseUzs += (Number(d.purchase_price) * rate);
  });
  const grandTotalUzs = totalPurchaseUzs + (Number(extra_costs) * rate);
  const paidUzs = Number(paid_amount) * rate;
  const debtUzs = grandTotalUzs - paidUzs;

  const targetBranch = branch_id || req.user.branch_id || 1;

  // Execute in single transaction
  const insertTransaction = db.transaction(() => {
    // 1. Create purchase header
    const pResult = db.prepare(`
      INSERT INTO purchases (
        invoice_number, supplier_id, branch_id, currency, exchange_rate,
        total_amount, extra_costs, paid_amount, debt_amount,
        payment_method, cash_account_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoice_number || `INV-${Date.now().toString().slice(-6)}`,
      supplier_id,
      targetBranch,
      currency,
      rate,
      grandTotalUzs,
      Number(extra_costs) * rate,
      paidUzs,
      debtUzs,
      payment_method,
      cash_account_id || null,
      notes || '',
      req.user.id
    );
    const purchaseId = pResult.lastInsertRowid;

    // 2. Insert devices & purchase items
    const insertDevice = db.prepare(`
      INSERT INTO devices (
        model_id, color_id, imei1, imei2, condition_type, battery_pct, condition_grade,
        purchase_price, extra_costs, cost_price, selling_price, min_price,
        branch_id, status, supplier_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'omborda', ?, ?)
    `);

    const insertPItem = db.prepare(`
      INSERT INTO purchase_items (purchase_id, device_id, unit_cost)
      VALUES (?, ?, ?)
    `);

    for (const d of devices) {
      const unitPurchase = Number(d.purchase_price) * rate;
      const unitCost = unitPurchase + extraPerItem;
      const unitSell = Number(d.selling_price) || Math.round(unitCost * 1.15);
      const unitMin = Number(d.min_price) || Math.round(unitCost * 1.05);

      const dRes = insertDevice.run(
        d.model_id,
        d.color_id || null,
        d.imei1,
        d.imei2 || null,
        d.condition_type || 'Yangi (muhrlangan)',
        d.battery_pct || 100,
        d.condition_grade || 'A+',
        unitPurchase,
        extraPerItem,
        unitCost,
        unitSell,
        unitMin,
        targetBranch,
        supplier_id,
        req.user.id
      );

      insertPItem.run(purchaseId, dRes.lastInsertRowid, unitCost);

      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (device_id, to_branch_id, type, notes, created_by)
        VALUES (?, ?, 'intake', 'Yetkazib beruvchidan qabul qilindi', ?)
      `).run(dRes.lastInsertRowid, targetBranch, req.user.id);
    }

    // 3. Update supplier debt
    if (debtUzs > 0) {
      db.prepare('UPDATE suppliers SET debt = debt + ? WHERE id = ?').run(debtUzs, supplier_id);
    }

    // 4. Record cash outflow if paid
    if (paidUzs > 0 && cash_account_id) {
      db.prepare(`
        UPDATE cash_accounts SET balance = balance - ? WHERE id = ?
      `).run(paidUzs, cash_account_id);

      db.prepare(`
        INSERT INTO cash_transactions (
          branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by
        ) VALUES (?, ?, 'out', 'purchase', ?, 'UZS', ?, 'purchase', ?, ?)
      `).run(
        targetBranch,
        cash_account_id,
        paidUzs,
        `Yetkazib beruvchiga to'lov (Faktura: ${invoice_number || purchaseId})`,
        purchaseId,
        req.user.id
      );
    }

    return purchaseId;
  });

  try {
    const purchaseId = insertTransaction();
    logAudit(req, 'CREATE', 'purchase', purchaseId, null, { grandTotalUzs, count: devices.length });
    res.json({ success: true, purchaseId, message: `${devices.length} ta telefon muvaffaqiyatli qabul qilindi!` });
  } catch (err) {
    console.error('Purchase transaction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List Buyouts (Skupka aktlari)
router.get('/buyouts', authenticateToken, (req, res) => {
  const buyouts = db.prepare(`
    SELECT b.*, u.name as created_by_name, ca.name as cash_account_name, d.status as device_status
    FROM buyouts b
    LEFT JOIN users u ON b.created_by = u.id
    LEFT JOIN cash_accounts ca ON b.cash_account_id = ca.id
    LEFT JOIN devices d ON b.device_id = d.id
    ORDER BY b.id DESC
  `).all();

  res.json({ success: true, data: buyouts });
});

// Create Buyout from Public (Aholidan skupka akti)
router.post('/buyouts', authenticateToken, (req, res) => {
  const {
    customer_name,
    customer_phone,
    passport_series,
    passport_number,
    passport_photo,
    photo,
    photos = [],
    image_url,
    model_id,
    model_name,
    color_id,
    imei,
    battery_pct = 85,
    condition_grade = 'A',
    defects = [],
    checklist_json = {},
    agreed_price,
    selling_price,
    min_price,
    cash_account_id,
    is_clean_confirmed = 1,
    notes
  } = req.body;

  if (!customer_name || !passport_series || !passport_number || !imei || !agreed_price) {
    return res.status(400).json({ 
      success: false, 
      error: "Mijoz ismi, pasporti, IMEI va kelishilgan narx kiritilishi shart"});
  }

  const cleanedImei = String(imei).trim();
  if (!validateIMEI(cleanedImei)) {
    return res.status(400).json({ 
      success: false, 
      error: "IMEI noto'g'ri yoki Luhn nazoratidan o'tmadi (15 xonali raqam)"});
  }

  const existingDevice = db.prepare('SELECT id FROM devices WHERE imei1 = ?').get(cleanedImei);
  if (existingDevice) {
    return res.status(400).json({ 
      success: false, 
      error: `Ushbu IMEI (${cleanedImei}) allaqachon bazada mavjud!` 
    });
  }

  const actNumber = `AKT-${Date.now().toString().slice(-6)}`;
  const branchId = req.user.branch_id || 1;
  const costPrice = Number(agreed_price);
  const sellPrice = Number(selling_price) || Math.round(costPrice * 1.2);
  const minPrice = Number(min_price) || Math.round(costPrice * 1.1);

  const buyoutTx = db.transaction(() => {
    const photoList = Array.isArray(photos) && photos.length 
      ? photos 
      : (image_url ? [image_url] : (photo ? [photo] : []));

    // 1. Insert device into warehouse
    const dRes = db.prepare(`
      INSERT INTO devices (
        model_id, color_id, imei1, condition_type, battery_pct, condition_grade,
        defects, package_items, icloud_clean, face_id_works, sim_unlocked,
        purchase_price, extra_costs, cost_price, selling_price, min_price,
        branch_id, status, warranty_months, photos, image_url, notes, created_by
      ) VALUES (
        ?, ?, ?, 'B/U (ishlatilgan)', ?, ?,
        ?, '["telefon"]', 1, 1, 1,
        ?, 0, ?, ?, ?,
        ?, 'omborda', 3, ?, ?, ?, ?
      )
    `).run(
      model_id || 1,
      color_id || null,
      cleanedImei,
      Number(battery_pct) || 85,
      condition_grade,
      JSON.stringify(defects),
      costPrice,
      costPrice,
      sellPrice,
      minPrice,
      branchId,
      JSON.stringify(photoList),
      photoList[0] || null,
      `Aholidan sotib olindi (${customer_name})`,
      req.user.id
    );

    const deviceId = dRes.lastInsertRowid;

    // 2. Insert buyout act
    const bRes = db.prepare(`
      INSERT INTO buyouts (
        act_number, customer_name, customer_phone, passport_series, passport_number,
        passport_photo, device_id, model_name, imei, condition_details,
        checklist_json, agreed_price, cash_account_id, is_clean_confirmed, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actNumber,
      customer_name,
      customer_phone,
      passport_series.toUpperCase(),
      passport_number,
      passport_photo || null,
      deviceId,
      model_name || 'Telefon',
      cleanedImei,
      `B/U ${condition_grade}, batareya: ${battery_pct}%`,
      JSON.stringify(checklist_json),
      costPrice,
      cash_account_id || null,
      is_clean_confirmed ? 1 : 0,
      notes || '',
      req.user.id
    );

    // 3. Deduct cash from cash account and record transaction
    if (cash_account_id) {
      db.prepare('UPDATE cash_accounts SET balance = balance - ? WHERE id = ?').run(costPrice, cash_account_id);

      db.prepare(`
        INSERT INTO cash_transactions (
          branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by
        ) VALUES (?, ?, 'out', 'buyout', ?, 'UZS', ?, 'buyout', ?, ?)
      `).run(
        branchId,
        cash_account_id,
        costPrice,
        `Aholidan telefon sotib olish (${model_name}, Akt: ${actNumber})`,
        bRes.lastInsertRowid,
        req.user.id
      );
    }

    // 4. Record stock movement
    db.prepare(`
      INSERT INTO stock_movements (device_id, to_branch_id, type, notes, created_by)
      VALUES (?, ?, 'intake', 'Aholidan qabul qilindi (Skupka)', ?)
    `).run(deviceId, branchId, req.user.id);

    return { buyoutId: bRes.lastInsertRowid, actNumber, deviceId };
  });

  try {
    const result = buyoutTx();
    logAudit(req, 'CREATE', 'buyout', result.buyoutId, null, { actNumber: result.actNumber, agreed_price });
    res.json({
      success: true,
      data: result,
      message: `Qabul qilish dalolatnomasi (${result.actNumber}) muvaffaqiyatli rasmiylashtirildi!`
    });
  } catch (err) {
    console.error('Buyout transaction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
