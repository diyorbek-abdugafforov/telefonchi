import express from 'express';
import db from '../db.js';
import { authenticateToken, sanitizeSaleData, logAudit } from '../auth.js';

const router = express.Router();

// List sales with filters
router.get('/', authenticateToken, (req, res) => {
  const { period = 'month', branch_id, seller_id, status = 'all', page = 1, limit = 50 } = req.query;
  const role = req.user.role;
  const userBranchId = req.user.branch_id;

  let query = `
    SELECT 
      s.*,
      c.name as customer_name,
      c.phone as customer_phone,
      u_sel.name as seller_name,
      u_cash.name as cashier_name,
      br.name as branch_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u_sel ON s.seller_id = u_sel.id
    LEFT JOIN users u_cash ON s.cashier_id = u_cash.id
    LEFT JOIN branches br ON s.branch_id = br.id
    WHERE 1=1
  `;
  const params = [];

  // Branch filter
  if (branch_id && branch_id !== 'all') {
    query += ' AND s.branch_id = ?';
    params.push(Number(branch_id));
  } else if (role !== 'admin' && userBranchId) {
    query += ' AND s.branch_id = ?';
    params.push(userBranchId);
  }

  // Seller restriction: ordinary seller only sees their own sales
  if (role === 'seller') {
    query += ' AND s.seller_id = ?';
    params.push(req.user.id);
  } else if (seller_id && seller_id !== 'all') {
    query += ' AND s.seller_id = ?';
    params.push(Number(seller_id));
  }

  if (status && status !== 'all') {
    query += ' AND s.status = ?';
    params.push(status);
  }

  query += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const sales = db.prepare(query).all(...params);

  // Fetch items for each sale
  const getItemStmt = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
  const sanitizedSales = sales.map(s => {
    const items = getItemStmt.all(s.id);
    return sanitizeSaleData({ ...s, items }, role);
  });

  res.json({ success: true, data: sanitizedSales });
});

// Get single sale by ID (for receipt print or invoice view)
router.get('/:id', authenticateToken, (req, res) => {
  const sale = db.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.passport_series, c.passport_number,
           u_sel.name as seller_name, u_cash.name as cashier_name, br.name as branch_name, br.phone as branch_phone,
           br.address as branch_address
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u_sel ON s.seller_id = u_sel.id
    LEFT JOIN users u_cash ON s.cashier_id = u_cash.id
    LEFT JOIN branches br ON s.branch_id = br.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!sale) {
    return res.status(404).json({ success: false, error: 'Sotuv hujjati topilmadi' });
  }

  const items = db.prepare(`
    SELECT si.*, d.imei1, d.imei2, d.condition_type, d.warranty_months, d.battery_pct
    FROM sale_items si
    LEFT JOIN devices d ON si.device_id = d.id
    WHERE si.sale_id = ?
  `).all(sale.id);

  // If installment, fetch installment schedule
  let installment = null;
  let schedule = [];
  if (sale.sale_type === 'installment') {
    installment = db.prepare('SELECT * FROM installments WHERE sale_id = ?').get(sale.id);
    if (installment) {
      schedule = db.prepare('SELECT * FROM installment_schedule WHERE installment_id = ? ORDER BY month_number ASC').all(installment.id);
    }
  }

  res.json({
    success: true,
    data: sanitizeSaleData({ ...sale, items, installment, schedule }, req.user.role)
  });
});

// Process POS Checkout (Transaction with strict double-sale protection)
router.post('/checkout', authenticateToken, (req, res) => {
  const {
    customer_id,
    new_customer,
    branch_id,
    cart_items = [],
    payment_type = 'cash_uzs',
    payment_details,
    overall_discount = 0,
    cash_account_id,
    installment_plan,
    trade_in,
    notes
  } = req.body;

  if (!cart_items || cart_items.length === 0) {
    return res.status(400).json({ success: false, error: "Savat bo'sh. Kamida bitta tovar tanlang." });
  }

  const seller_id = req.user.id;
  const cashier_id = req.user.role === 'cashier' ? req.user.id : req.user.id;
  const targetBranch = branch_id || req.user.branch_id || 1;

  const executeSale = db.transaction(() => {
    // 1. Resolve customer
    let finalCustomerId = customer_id;
    if (!finalCustomerId && new_customer && new_customer.name && new_customer.phone) {
      const existingCust = db.prepare('SELECT id FROM customers WHERE phone = ?').get(new_customer.phone);
      if (existingCust) {
        finalCustomerId = existingCust.id;
      } else {
        const cRes = db.prepare(`
          INSERT INTO customers (name, phone, passport_series, passport_number, address)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          new_customer.name,
          new_customer.phone,
          new_customer.passport_series || null,
          new_customer.passport_number || null,
          new_customer.address || ''
        );
        finalCustomerId = cRes.lastInsertRowid;
      }
    }

    if (!finalCustomerId) {
      let defaultCust = db.prepare("SELECT id FROM customers WHERE name = 'Oddiy xaridor'").get();
      if (!defaultCust) {
        const defRes = db.prepare("INSERT INTO customers (name, phone) VALUES ('Oddiy xaridor', '+998 00 000 00 00')").run();
        finalCustomerId = defRes.lastInsertRowid;
      } else {
        finalCustomerId = defaultCust.id;
      }
    }

    // 2. Validate and lock devices
    let totalItemsCost = 0;
    let totalItemsPrice = 0;
    const validatedItems = [];

    for (const item of cart_items) {
      if (item.type === 'device') {
        const device = db.prepare(`
          SELECT d.*, m.name as model_name 
          FROM devices d 
          JOIN models m ON d.model_id = m.id 
          WHERE d.id = ?
        `).get(item.device_id);

        if (!device) {
          throw new Error(`Telefon topilmadi (ID: ${item.device_id})`);
        }

        if (device.status !== 'omborda') {
          throw new Error(
            `Xatolik: "${device.model_name}" (IMEI: ${device.imei1}) ayni paytda omborda emas! Holati: "${device.status}". Uni qayta sotish mumkin emas.`
          );
        }

        const unitCost = Number(device.cost_price);
        const unitPrice = Number(item.unit_price) || Number(device.selling_price);
        const itemDiscount = Number(item.discount || 0);
        const finalPrice = unitPrice - itemDiscount;
        const profit = finalPrice - unitCost;

        totalItemsCost += unitCost;
        totalItemsPrice += finalPrice;

        validatedItems.push({
          type: 'device',
          device_id: device.id,
          accessory_id: null,
          name: `${device.model_name} (${device.condition_type})`,
          imei: device.imei1,
          unit_cost: unitCost,
          unit_price: unitPrice,
          quantity: 1,
          discount: itemDiscount,
          total_price: finalPrice,
          profit
        });
      } else if (item.type === 'accessory') {
        const acc = db.prepare('SELECT * FROM accessories WHERE id = ?').get(item.accessory_id);
        if (!acc) throw new Error(`Aksessuar topilmadi (ID: ${item.accessory_id})`);
        const qty = Number(item.quantity) || 1;
        if (acc.stock_qty < qty) {
          throw new Error(`"${acc.name}" mahsulotidan omborda yetarli emas! Qoldiq: ${acc.stock_qty} ta.`);
        }

        const unitCost = Number(acc.cost_price);
        const unitPrice = Number(item.unit_price) || Number(acc.selling_price);
        const finalPrice = (unitPrice * qty) - Number(item.discount || 0);
        const profit = finalPrice - (unitCost * qty);

        totalItemsCost += (unitCost * qty);
        totalItemsPrice += finalPrice;

        validatedItems.push({
          type: 'accessory',
          device_id: null,
          accessory_id: acc.id,
          name: acc.name,
          imei: null,
          unit_cost: unitCost,
          unit_price: unitPrice,
          quantity: qty,
          discount: Number(item.discount || 0),
          total_price: finalPrice,
          profit
        });
      } else {
        const servicePrice = Number(item.unit_price || 50000);
        totalItemsPrice += servicePrice;
        validatedItems.push({
          type: 'service',
          device_id: null,
          accessory_id: null,
          name: item.name || 'Xizmat',
          imei: null,
          unit_cost: 0,
          unit_price: servicePrice,
          quantity: 1,
          discount: 0,
          total_price: servicePrice,
          profit: servicePrice
        });
      }
    }

    // Trade-in reduction if applicable
    let tradeInBuyoutId = null;
    let tradeInDiscount = 0;
    if (trade_in && trade_in.agreed_price > 0) {
      tradeInDiscount = Number(trade_in.agreed_price);
      const actNum = `TRADEIN-${Date.now().toString().slice(-6)}`;
      const buyoutRes = db.prepare(`
        INSERT INTO buyouts (
          act_number, customer_name, customer_phone, passport_series, passport_number,
          model_name, imei, condition_details, agreed_price, is_clean_confirmed, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        trade_in.customer_name || 'Trade-in Mijoz',
        trade_in.customer_phone || '+998 00 000 00 00',
        (trade_in.passport_series || 'AA').toUpperCase(),
        trade_in.passport_number || '0000000',
        trade_in.model_name || 'B/U Telefon',
        trade_in.imei || '358742100000000',
        `Trade-in almashtirish: ${trade_in.condition_grade || 'A'}, Batareya: ${trade_in.battery_pct || 85}%`,
        tradeInDiscount,
        seller_id
      );
      tradeInBuyoutId = buyoutRes.lastInsertRowid;
    }

    const discountAmount = Number(overall_discount || 0) + tradeInDiscount;
    const finalAmount = Math.max(0, totalItemsPrice - Number(overall_discount || 0) - tradeInDiscount);
    const grossProfit = finalAmount - totalItemsCost;

    const saleNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const saleType = installment_plan ? 'installment' : (trade_in ? 'trade_in' : 'standard');

    // 3. Insert sale header
    const saleRes = db.prepare(`
      INSERT INTO sales (
        sale_number, branch_id, customer_id, seller_id, cashier_id,
        total_amount, discount_amount, final_amount, total_cost, gross_profit,
        payment_type, payment_details, sale_type, trade_in_buyout_id,
        warranty_end_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '+12 month'), ?)
    `).run(
      saleNumber,
      targetBranch,
      finalCustomerId,
      seller_id,
      cashier_id,
      totalItemsPrice,
      discountAmount,
      finalAmount,
      totalItemsCost,
      grossProfit,
      payment_type,
      payment_details ? JSON.stringify(payment_details) : null,
      saleType,
      tradeInBuyoutId,
      notes || ''
    );
    const saleId = saleRes.lastInsertRowid;

    // 4. Insert items and update stock
    const insertItemStmt = db.prepare(`
      INSERT INTO sale_items (
        sale_id, item_type, device_id, accessory_id, item_name, imei,
        unit_cost, unit_price, quantity, discount, total_price, profit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateDeviceStmt = db.prepare(`
      UPDATE devices SET status = 'sotilgan', sold_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    const updateAccStmt = db.prepare(`
      UPDATE accessories SET stock_qty = stock_qty - ? WHERE id = ?
    `);

    const moveStmt = db.prepare(`
      INSERT INTO stock_movements (device_id, accessory_id, from_branch_id, type, quantity, notes, created_by)
      VALUES (?, ?, ?, 'sale', ?, ?, ?)
    `);

    for (const it of validatedItems) {
      insertItemStmt.run(
        saleId,
        it.type,
        it.device_id,
        it.accessory_id,
        it.name,
        it.imei,
        it.unit_cost,
        it.unit_price,
        it.quantity,
        it.discount,
        it.total_price,
        it.profit
      );

      if (it.type === 'device') {
        updateDeviceStmt.run(it.device_id);
        moveStmt.run(it.device_id, null, targetBranch, 1, `Sotuv: ${saleNumber}`, seller_id);
      } else if (it.type === 'accessory') {
        updateAccStmt.run(it.quantity, it.accessory_id);
        moveStmt.run(null, it.accessory_id, targetBranch, it.quantity, `Sotuv: ${saleNumber}`, seller_id);
      }
    }

    // 5. Handle Installments (Nasiya)
    if (installment_plan) {
      const duration = Number(installment_plan.duration_months) || 6;
      const markupPct = Number(installment_plan.markup_pct) || 0;
      const upfront = Number(installment_plan.upfront_payment) || 0;

      const principal = finalAmount;
      const totalPayable = Math.round(principal * (1 + markupPct / 100));
      const remainingBalance = totalPayable - upfront;
      const monthlyAmount = Math.round(remainingBalance / duration);

      const instRes = db.prepare(`
        INSERT INTO installments (
          sale_id, customer_id, total_principal, markup_pct, total_payable,
          upfront_payment, remaining_balance, duration_months, monthly_amount,
          next_due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '+1 month'), 'active')
      `).run(
        saleId,
        finalCustomerId,
        principal,
        markupPct,
        totalPayable,
        upfront,
        remainingBalance,
        duration,
        monthlyAmount
      );

      const instId = instRes.lastInsertRowid;

      const schedStmt = db.prepare(`
        INSERT INTO installment_schedule (installment_id, month_number, due_date, due_amount, paid_amount, status)
        VALUES (?, ?, date('now', '+' || ? || ' month'), ?, 0, 'pending')
      `);

      for (let m = 1; m <= duration; m++) {
        schedStmt.run(instId, m, m, monthlyAmount);
      }

      db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(remainingBalance, finalCustomerId);

      if (upfront > 0 && cash_account_id) {
        db.prepare('UPDATE cash_accounts SET balance = balance + ? WHERE id = ?').run(upfront, cash_account_id);
        db.prepare(`
          INSERT INTO cash_transactions (
            branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by
          ) VALUES (?, ?, 'in', 'sale', ?, 'UZS', ?, 'sale', ?, ?)
        `).run(
          targetBranch,
          cash_account_id,
          upfront,
          `Nasiya boshlang'ich to'lovi (${saleNumber})`,
          saleId,
          cashier_id
        );
      }
    } else {
      if (cash_account_id && finalAmount > 0) {
        db.prepare('UPDATE cash_accounts SET balance = balance + ? WHERE id = ?').run(finalAmount, cash_account_id);
        db.prepare(`
          INSERT INTO cash_transactions (
            branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by
          ) VALUES (?, ?, 'in', 'sale', ?, 'UZS', ?, 'sale', ?, ?)
        `).run(
          targetBranch,
          cash_account_id,
          finalAmount,
          `Sotuv to'lovi (${saleNumber})`,
          saleId,
          cashier_id
        );
      }
    }

    return { saleId, saleNumber, finalAmount, itemsCount: validatedItems.length };
  });

  try {
    const saleResult = executeSale();
    logAudit(req, 'CREATE', 'sale', saleResult.saleId, null, {
      saleNumber: saleResult.saleNumber,
      amount: saleResult.finalAmount
    });
    res.json({
      success: true,
      data: saleResult,
      message: `Sotuv muvaffaqiyatli amalga oshirildi! Chek raqami: ${saleResult.saleNumber}`
    });
  } catch (err) {
    console.error('Sale transaction error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Cancel sale / Return phone
router.post('/:id/return', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { reason, cash_account_id } = req.body;

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ success: false, error: 'Qaytarish sababi kiritilishi shart' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ success: false, error: "Sotuvni bekor qilish uchun faqat ma'mur yoki menejerda ruxsat bor" });
  }

  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
  if (!sale) {
    return res.status(404).json({ success: false, error: 'Sotuv topilmadi' });
  }

  if (sale.status === 'returned') {
    return res.status(400).json({ success: false, error: 'Bu sotuv allaqachon qaytarilgan' });
  }

  const returnTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE sales SET
        status = 'returned',
        return_reason = ?,
        returned_at = CURRENT_TIMESTAMP,
        returned_by = ?
      WHERE id = ?
    `).run(reason, req.user.id, id);

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
    for (const it of items) {
      if (it.item_type === 'device' && it.device_id) {
        db.prepare("UPDATE devices SET status = 'omborda', sold_at = NULL WHERE id = ?").run(it.device_id);
        db.prepare(`
          INSERT INTO stock_movements (device_id, to_branch_id, type, notes, created_by)
          VALUES (?, ?, 'return', ?, ?)
        `).run(it.device_id, sale.branch_id, `Sotuv bekor qilindi (${sale.sale_number}): ${reason}`, req.user.id);
      } else if (it.item_type === 'accessory' && it.accessory_id) {
        db.prepare("UPDATE accessories SET stock_qty = stock_qty + ? WHERE id = ?").run(it.quantity, it.accessory_id);
        db.prepare(`
          INSERT INTO stock_movements (accessory_id, to_branch_id, type, quantity, notes, created_by)
          VALUES (?, ?, 'return', ?, ?, ?)
        `).run(it.accessory_id, sale.branch_id, it.quantity, `Sotuv bekor qilindi (${sale.sale_number})`, req.user.id);
      }
    }

    if (cash_account_id && sale.final_amount > 0) {
      db.prepare('UPDATE cash_accounts SET balance = balance - ? WHERE id = ?').run(sale.final_amount, cash_account_id);
      db.prepare(`
        INSERT INTO cash_transactions (
          branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by
        ) VALUES (?, ?, 'out', 'other', ?, 'UZS', ?, 'sale_return', ?, ?)
      `).run(
        sale.branch_id,
        cash_account_id,
        sale.final_amount,
        `Mijozga pul qaytarildi (Bekor qilingan chek: ${sale.sale_number})`,
        sale.id,
        req.user.id
      );
    }

    if (sale.sale_type === 'installment') {
      const inst = db.prepare('SELECT * FROM installments WHERE sale_id = ?').get(id);
      if (inst) {
        db.prepare("UPDATE installments SET status = 'cancelled' WHERE id = ?").run(inst.id);
        db.prepare('UPDATE customers SET debt = MAX(0, debt - ?) WHERE id = ?').run(inst.remaining_balance, inst.customer_id);
      }
    }
  });

  try {
    returnTransaction();
    logAudit(req, 'SALE_RETURN', 'sale', id, { status: sale.status }, { status: 'returned', reason });
    res.json({ success: true, message: 'Sotuv muvaffaqiyatli bekor qilindi va tovar omborga qaytarildi' });
  } catch (err) {
    console.error('Sale return error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pay monthly installment
router.post('/installments/:id/pay', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { amount, cash_account_id } = req.body;

  const installment = db.prepare(`
    SELECT i.*, c.name as customer_name FROM installments i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?
  `).get(id);

  if (!installment) {
    return res.status(404).json({ success: false, error: 'Nasiya shartnomasi topilmadi' });
  }

  const payAmount = Number(amount);
  if (payAmount <= 0) {
    return res.status(400).json({ success: false, error: "To'lov summasi 0 dan katta bo'lishi kerak" });
  }

  const payTx = db.transaction(() => {
    const pendingMonth = db.prepare(`
      SELECT * FROM installment_schedule WHERE installment_id = ? AND status = 'pending' ORDER BY month_number ASC LIMIT 1
    `).get(id);

    if (pendingMonth) {
      db.prepare(`
        UPDATE installment_schedule 
        SET paid_amount = paid_amount + ?, status = 'paid', paid_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(payAmount, pendingMonth.id);
    }

    const newRemaining = Math.max(0, installment.remaining_balance - payAmount);
    const newStatus = newRemaining === 0 ? 'completed' : installment.status;

    db.prepare(`
      UPDATE installments 
      SET remaining_balance = ?, status = ?, next_due_date = date(next_due_date, '+1 month') 
      WHERE id = ?
    `).run(newRemaining, newStatus, id);

    db.prepare('UPDATE customers SET debt = MAX(0, debt - ?) WHERE id = ?').run(payAmount, installment.customer_id);

    if (cash_account_id) {
      db.prepare('UPDATE cash_accounts SET balance = balance + ? WHERE id = ?').run(payAmount, cash_account_id);
      db.prepare(`
        INSERT INTO cash_transactions (
          branch_id, cash_account_id, type, category, amount, currency, description, reference_type, reference_id, created_by
        ) VALUES (1, ?, 'in', 'installment_payment', ?, 'UZS', ?, 'installment', ?, ?)
      `).run(
        cash_account_id,
        payAmount,
        `Nasiya oylik to'lovi (${installment.customer_name})`,
        id,
        req.user.id
      );
    }
  });

  try {
    payTx();
    logAudit(req, 'UPDATE', 'installment', id, null, { paid_amount: payAmount });
    res.json({ success: true, message: "Nasiya to'lovi muvaffaqiyatli qabul qilindi" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
