import express from 'express';
import db, { validateIMEI } from '../db.js';
import { authenticateToken, sanitizeDeviceData, logAudit } from '../auth.js';

const router = express.Router();

// Get list of devices with comprehensive filtering
router.get('/', authenticateToken, (req, res) => {
  const {
    search,
    branch_id,
    status = 'all',
    condition_type,
    brand_id,
    page = 1,
    limit = 50
  } = req.query;

  const role = req.user.role;
  const userBranchId = req.user.branch_id;

  let query = `
    SELECT 
      d.*,
      m.name as model_name,
      m.ram,
      m.storage,
      b.name as brand_name,
      c.name as color_name,
      c.hex_code as color_hex,
      br.name as branch_name,
      s.name as supplier_name
    FROM devices d
    LEFT JOIN models m ON d.model_id = m.id
    LEFT JOIN brands b ON m.brand_id = b.id
    LEFT JOIN colors c ON d.color_id = c.id
    LEFT JOIN branches br ON d.branch_id = br.id
    LEFT JOIN suppliers s ON d.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];

  // Branch filter: if not admin and has branch, restrict to branch
  if (branch_id && branch_id !== 'all') {
    query += ' AND d.branch_id = ?';
    params.push(Number(branch_id));
  } else if (role !== 'admin' && userBranchId) {
    query += ' AND d.branch_id = ?';
    params.push(userBranchId);
  }

  // Status filter
  if (status && status !== 'all') {
    query += ' AND d.status = ?';
    params.push(status);
  }

  // Condition filter
  if (condition_type && condition_type !== 'all') {
    query += ' AND d.condition_type = ?';
    params.push(condition_type);
  }

  // Brand filter
  if (brand_id && brand_id !== 'all') {
    query += ' AND m.brand_id = ?';
    params.push(Number(brand_id));
  }

  // Search filter (IMEI 1, IMEI 2, Serial number, Model name)
  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    query += ' AND (d.imei1 LIKE ? OR d.imei2 LIKE ? OR d.serial_number LIKE ? OR m.name LIKE ?)';
    params.push(term, term, term, term);
  }

  query += ' ORDER BY d.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const devices = db.prepare(query).all(...params);

  // Parse JSON fields and sanitize for role
  const formatted = devices.map(d => {
    let defects = [];
    let package_items = [];
    let photos = [];
    try { defects = JSON.parse(d.defects || '[]'); } catch (e) {}
    try { package_items = JSON.parse(d.package_items || '[]'); } catch (e) {}
    try { photos = JSON.parse(d.photos || '[]'); } catch (e) {}

    const sanitized = sanitizeDeviceData({
      ...d,
      defects,
      package_items,
      photos
    }, role);
    return sanitized;
  });

  res.json({
    success: true,
    data: formatted
  });
});

// Get single device by ID or IMEI
router.get('/:idOrImei', authenticateToken, (req, res) => {
  const { idOrImei } = req.params;
  const isNumeric = /^\d+$/.test(idOrImei);

  let device;
  if (isNumeric && idOrImei.length < 10) {
    device = db.prepare(`
      SELECT d.*, m.name as model_name, m.ram, m.storage, b.name as brand_name,
             c.name as color_name, c.hex_code as color_hex, br.name as branch_name, s.name as supplier_name
      FROM devices d
      LEFT JOIN models m ON d.model_id = m.id
      LEFT JOIN brands b ON m.brand_id = b.id
      LEFT JOIN colors c ON d.color_id = c.id
      LEFT JOIN branches br ON d.branch_id = br.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      WHERE d.id = ?
    `).get(Number(idOrImei));
  } else {
    device = db.prepare(`
      SELECT d.*, m.name as model_name, m.ram, m.storage, b.name as brand_name,
             c.name as color_name, c.hex_code as color_hex, br.name as branch_name, s.name as supplier_name
      FROM devices d
      LEFT JOIN models m ON d.model_id = m.id
      LEFT JOIN brands b ON m.brand_id = b.id
      LEFT JOIN colors c ON d.color_id = c.id
      LEFT JOIN branches br ON d.branch_id = br.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      WHERE d.imei1 = ? OR d.imei2 = ?
    `).get(idOrImei, idOrImei);
  }

  if (!device) {
    return res.status(404).json({ success: false, error: "Telefon topilmadi"});
  }

  let defects = [];
  let package_items = [];
  let photos = [];
  try { defects = JSON.parse(device.defects || "[]"); } catch (e) {}
  try { package_items = JSON.parse(device.package_items || '[]'); } catch (e) {}
  try { photos = JSON.parse(device.photos || '[]'); } catch (e) {}

  res.json({
    success: true,
    data: sanitizeDeviceData({ ...device, defects, package_items, photos }, req.user.role)
  });
});

// Bulk import devices from Excel / JSON
router.post('/bulk-import', authenticateToken, (req, res) => {
  const { devices = [], branch_id } = req.body;
  if (!Array.isArray(devices) || devices.length === 0) {
    return res.status(400).json({ success: false, error: "Yuklash uchun kamida 1 ta telefon ma'lumoti kerak" });
  }

  const targetBranch = branch_id || req.user.branch_id || 1;
  const inserted = [];
  const errors = [];

  const importTx = db.transaction(() => {
    for (let i = 0; i < devices.length; i++) {
      const row = devices[i];
      const rowNum = i + 1;
      const imei = String(row.imei1 || row.imei || '').trim();

      if (!imei) {
        errors.push({ row: rowNum, error: "IMEI ko'rsatilmagan" });
        continue;
      }

      // Check unique IMEI
      const exists = db.prepare('SELECT id FROM devices WHERE imei1 = ?').get(imei);
      if (exists) {
        errors.push({ row: rowNum, imei, error: "Bu IMEI bazada allaqachon mavjud" });
        continue;
      }

      // Resolve or create brand & model
      let modelId = row.model_id;
      if (!modelId && (row.model_name || row.model)) {
        const modelName = String(row.model_name || row.model).trim();
        const brandName = String(row.brand_name || row.brand || 'Apple').trim();
        
        let brand = db.prepare('SELECT id FROM brands WHERE name LIKE ?').get(brandName);
        if (!brand) {
          const bRes = db.prepare('INSERT INTO brands (name) VALUES (?)').run(brandName);
          brand = { id: bRes.lastInsertRowid };
        }

        let model = db.prepare('SELECT id, image_url FROM models WHERE name LIKE ? AND brand_id = ?').get(modelName, brand.id);
        if (!model) {
          const mRes = db.prepare('INSERT INTO models (brand_id, name, storage, release_year) VALUES (?, ?, ?, ?)').run(
            brand.id,
            modelName,
            row.storage || '256GB',
            new Date().getFullYear()
          );
          model = { id: mRes.lastInsertRowid, image_url: null };
        }
        modelId = model.id;
      }

      if (!modelId) {
        errors.push({ row: rowNum, imei, error: "Model nomi aniqlanmadi" });
        continue;
      }

      // Resolve color
      let colorId = row.color_id || 1;
      if (row.color_name || row.color) {
        const colorName = String(row.color_name || row.color).trim();
        const colorObj = db.prepare('SELECT id FROM colors WHERE name LIKE ?').get(colorName);
        if (colorObj) colorId = colorObj.id;
      }

      const purchase_price = Number(row.purchase_price || row.cost_price || 0);
      const extra_costs = Number(row.extra_costs || 0);
      const cost_price = purchase_price + extra_costs;
      const selling_price = Number(row.selling_price || 0);
      const min_price = Number(row.min_price || selling_price);
      const battery_pct = Number(row.battery_pct || 100);
      const condition_type = row.condition_type || 'Yangi (muhrlangan)';
      const warranty_months = Number(row.warranty_months || 12);
      const notes = row.notes || "Excel ommaviy yuklash orqali kiritilgan";

      // Inherit model image if available
      const modelRow = db.prepare('SELECT image_url FROM models WHERE id = ?').get(modelId);
      const imageUrl = row.image_url || modelRow?.image_url || null;

      const resInsert = db.prepare(`
        INSERT INTO devices (
          model_id, color_id, country_version, imei1, imei2,
          serial_number, condition_type, battery_pct, condition_grade,
          icloud_clean, face_id_works, sim_unlocked, purchase_price, extra_costs,
          cost_price, selling_price, min_price, branch_id, status,
          warranty_months, photos, image_url, notes, created_by
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, 'A+',
          1, 1, 1, ?, ?,
          ?, ?, ?, ?, 'omborda',
          ?, ?, ?, ?, ?
        )
      `).run(
        modelId,
        colorId,
        row.country_version || 'AQSH',
        imei,
        row.imei2 || null,
        row.serial_number || null,
        condition_type,
        battery_pct,
        purchase_price,
        extra_costs,
        cost_price,
        selling_price,
        min_price,
        targetBranch,
        warranty_months,
        JSON.stringify(imageUrl ? [imageUrl] : []),
        imageUrl,
        notes,
        req.user.id
      );

      // Log stock movement
      db.prepare(`
        INSERT INTO stock_movements (device_id, to_branch_id, type, notes, created_by)
        VALUES (?, ?, 'purchase', 'Excel ommaviy yuklash orqali kiritildi', ?)
      `).run(resInsert.lastInsertRowid, targetBranch, req.user.id);

      inserted.push({ id: resInsert.lastInsertRowid, imei });
    }
  });

  try {
    importTx();
    logAudit(req, 'BULK_IMPORT', 'devices', null, null, `${inserted.length} ta telefon Exceldan yuklandi`);
    res.json({
      success: true,
      message: `${inserted.length} ta telefon muvaffaqiyatli omborga kiritildi!`,
      insertedCount: inserted.length,
      errorsCount: errors.length,
      errors
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new device card
router.post('/', authenticateToken, (req, res) => {
  const {
    model_id,
    color_id,
    country_version = 'AQSH',
    imei1,
    imei2,
    serial_number,
    condition_type = 'Yangi (muhrlangan)',
    battery_pct = 100,
    condition_grade = 'A+',
    defects = [],
    package_items = [],
    icloud_clean = 1,
    face_id_works = 1,
    sim_unlocked = 1,
    purchase_price = 0,
    extra_costs = 0,
    selling_price = 0,
    min_price = 0,
    branch_id,
    status = 'omborda',
    warranty_months = 12,
    photos = [],
    supplier_id,
    notes
  } = req.body;

  // Validation
  if (!model_id || !imei1) {
    return res.status(400).json({ success: false, error: "Model va IMEI 1 kiritilishi shart"});
  }

  const cleanedImei1 = String(imei1).trim();

  // Validate 15-digit Luhn check
  if (!validateIMEI(cleanedImei1)) {
    return res.status(400).json({ 
      success: false, 
      error: "IMEI 1 noto'g'ri formatda yoki Luhn algoritmi nazoratidan o'tmadi (15 xonali raqam bo'lishi kerak)"});
  }

  if (imei2 && !validateIMEI(String(imei2).trim())) {
    return res.status(400).json({ 
      success: false, 
      error: "IMEI 2 noto'g'ri formatda yoki Luhn algoritmi nazoratidan o'tmadi"});
  }

  // Check unique IMEI1
  const existing = db.prepare('SELECT id FROM devices WHERE imei1 = ?').get(cleanedImei1);
  if (existing) {
    return res.status(400).json({ 
      success: false, 
      error: `Ushbu IMEI (${cleanedImei1}) bo'yicha telefon bazada allaqachon mavjud!` 
    });
  }

  // Calculate total cost price (Tannarx)
  const cost_price = Number(purchase_price) + Number(extra_costs);
  const targetBranch = branch_id || req.user.branch_id || 1;
  const photoList = Array.isArray(photos) && photos.length ? photos : (req.body.image_url ? [req.body.image_url] : []);
  const primaryImg = photoList[0] || req.body.image_url || null;

  try {
    const result = db.prepare(`
      INSERT INTO devices (
        model_id, color_id, country_version, imei1, imei2, serial_number, condition_type,
        battery_pct, condition_grade, defects, package_items, icloud_clean, face_id_works,
        sim_unlocked, purchase_price, extra_costs, cost_price, selling_price, min_price,
        branch_id, status, warranty_months, photos, image_url, supplier_id, notes, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      model_id,
      color_id || null,
      country_version,
      cleanedImei1,
      imei2 ? String(imei2).trim() : null,
      serial_number ? String(serial_number).trim() : null,
      condition_type,
      Number(battery_pct) || 100,
      condition_grade,
      JSON.stringify(defects),
      JSON.stringify(package_items),
      icloud_clean ? 1 : 0,
      face_id_works ? 1 : 0,
      sim_unlocked ? 1 : 0,
      Number(purchase_price),
      Number(extra_costs),
      cost_price,
      Number(selling_price),
      Number(min_price) || Number(selling_price),
      targetBranch,
      status,
      Number(warranty_months),
      JSON.stringify(photoList),
      primaryImg,
      supplier_id || null,
      notes || '',
      req.user.id
    );

    // Record stock movement (intake)
    db.prepare(`
      INSERT INTO stock_movements (device_id, to_branch_id, type, notes, created_by)
      VALUES (?, ?, 'intake', 'Yangi telefon kartochkasi ochildi', ?)
    `).run(result.lastInsertRowid, targetBranch, req.user.id);

    logAudit(req, 'CREATE', 'device', result.lastInsertRowid, null, {
      imei1: cleanedImei1,
      model_id,
      cost_price,
      selling_price
    });

    res.json({
      success: true,
      deviceId: result.lastInsertRowid,
      message: "Telefon muvaffaqiyatli ro'yxatga olindi"});
  } catch (err) {
    console.error('Error inserting device:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update device info or price
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: "Telefon topilmadi"});
  }

  const {
    selling_price,
    min_price,
    condition_type,
    battery_pct,
    condition_grade,
    defects,
    package_items,
    status,
    notes,
    warranty_months
  } = req.body;

  // Track price change in audit log if changed
  if (selling_price && Number(selling_price) !== Number(existing.selling_price)) {
    logAudit(req, 'PRICE_CHANGE', 'device', id, 
      { selling_price: existing.selling_price, min_price: existing.min_price },
      { selling_price, min_price }
    );
  }

  try {
    db.prepare(`
      UPDATE devices SET
        selling_price = COALESCE(?, selling_price),
        min_price = COALESCE(?, min_price),
        condition_type = COALESCE(?, condition_type),
        battery_pct = COALESCE(?, battery_pct),
        condition_grade = COALESCE(?, condition_grade),
        defects = COALESCE(?, defects),
        package_items = COALESCE(?, package_items),
        status = COALESCE(?, status),
        warranty_months = COALESCE(?, warranty_months),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      selling_price ? Number(selling_price) : null,
      min_price ? Number(min_price) : null,
      condition_type || null,
      battery_pct !== undefined ? Number(battery_pct) : null,
      condition_grade || null,
      defects ? JSON.stringify(defects) : null,
      package_items ? JSON.stringify(package_items) : null,
      status || null,
      warranty_months !== undefined ? Number(warranty_months) : null,
      notes || null,
      id
    );

    res.json({ success: true, message: "Telefon ma'lumotlari muvaffaqiyatli yangilandi"});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
