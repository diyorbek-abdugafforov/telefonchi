import express from 'express';
import XLSX from 'xlsx';
import db from '../db.js';
import { authenticateToken, requireRoles } from '../auth.js';

const router = express.Router();

// 1. Comprehensive Profit & Loss (P&L) Report
router.get('/pnl', authenticateToken, requireRoles('admin', 'manager'), (req, res) => {
  const { from_date, to_date, branch_id } = req.query;

  let dateFilter = "1=1";
  const params = [];
  if (from_date) {
    dateFilter += " AND date(s.created_at) >= date(?)";
    params.push(from_date);
  }
  if (to_date) {
    dateFilter += " AND date(s.created_at) <= date(?)";
    params.push(to_date);
  }

  let branchFilter = "";
  if (branch_id && branch_id !== 'all') {
    branchFilter = " AND s.branch_id = " + Number(branch_id);
  }

  // Revenue & Cost of Goods Sold
  const sales = db.prepare(`
    SELECT 
      COUNT(s.id) as sales_count,
      COALESCE(SUM(s.total_amount), 0) as gross_sales,
      COALESCE(SUM(s.discount_amount), 0) as discounts,
      COALESCE(SUM(s.final_amount), 0) as net_sales,
      COALESCE(SUM(s.total_cost), 0) as cogs,
      COALESCE(SUM(s.gross_profit), 0) as gross_profit
    FROM sales s
    WHERE s.status = 'completed' AND ${dateFilter} ${branchFilter}
  `).get(...params);

  // Operating Expenses
  let expDateFilter = "1=1";
  const expParams = [];
  if (from_date) {
    expDateFilter += " AND date(date) >= date(?)";
    expParams.push(from_date);
  }
  if (to_date) {
    expDateFilter += " AND date(date) <= date(?)";
    expParams.push(to_date);
  }

  let expBranchFilter = "";
  if (branch_id && branch_id !== 'all') {
    expBranchFilter = " AND branch_id = " + Number(branch_id);
  }

  const expensesByCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE ${expDateFilter} ${expBranchFilter}
    GROUP BY category
    ORDER BY total DESC
  `).all(...expParams);

  const totalExpenses = expensesByCategory.reduce((sum, e) => sum + Number(e.total), 0);
  const netProfit = Number(sales.gross_profit) - totalExpenses;
  const marginPct = sales.net_sales > 0 ? ((sales.gross_profit / sales.net_sales) * 100).toFixed(1) : 0;
  const netMarginPct = sales.net_sales > 0 ? ((netProfit / sales.net_sales) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: {
      gross_sales: sales.gross_sales,
      discounts: sales.discounts,
      net_sales: sales.net_sales,
      cogs: sales.cogs,
      gross_profit: sales.gross_profit,
      margin_pct: marginPct,
      expenses_by_category: expensesByCategory,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      net_margin_pct: netMarginPct
    }
  });
});

// 2. Sellers Performance Report
router.get('/sellers', authenticateToken, requireRoles('admin', 'manager'), (req, res) => {
  const { period = 'month', branch_id } = req.query;

  let dateFilter = "s.created_at >= datetime('now', '-30 day')";
  if (period === 'today') dateFilter = "date(s.created_at) = date('now')";
  else if (period === 'week') dateFilter = "s.created_at >= datetime('now', '-7 day')";
  else if (period === 'year') dateFilter = "s.created_at >= datetime('now', '-365 day')";

  let branchFilter = "";
  if (branch_id && branch_id !== 'all') {
    branchFilter = " AND s.branch_id = " + Number(branch_id);
  }

  const report = db.prepare(`
    SELECT 
      u.id as user_id,
      u.name,
      u.role,
      u.salary_type,
      u.base_salary,
      u.commission_pct,
      b.name as branch_name,
      COUNT(s.id) as sales_count,
      COALESCE(SUM(s.final_amount), 0) as total_revenue,
      COALESCE(SUM(s.gross_profit), 0) as total_profit,
      COALESCE(SUM(s.discount_amount), 0) as total_discounts
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    LEFT JOIN sales s ON s.seller_id = u.id AND s.status = 'completed' AND ${dateFilter} ${branchFilter}
    WHERE u.role IN ('seller', 'manager')
    GROUP BY u.id, u.name
    ORDER BY total_revenue DESC
  `).all();

  const formatted = report.map(r => {
    let earnedCommission = 0;
    if (r.salary_type === 'pct_sales') {
      earnedCommission = Math.round(r.total_revenue * (r.commission_pct / 100));
    } else {
      earnedCommission = Math.round(r.total_profit * (r.commission_pct / 100));
    }

    return {
      ...r,
      earned_commission: earnedCommission,
      total_estimated_payout: Number(r.base_salary) + earnedCommission
    };
  });

  res.json({ success: true, data: formatted });
});

// 3. New vs B/U Comparison Report
router.get('/new-vs-used', authenticateToken, requireRoles('admin', 'manager'), (req, res) => {
  const stats = db.prepare(`
    SELECT 
      CASE 
        WHEN d.condition_type LIKE 'Yangi%' THEN 'Yangi telefonlar'
        ELSE 'B/U (Ishlatilgan) telefonlar'
      END as category_group,
      COUNT(si.id) as sold_count,
      COALESCE(SUM(si.unit_cost * si.quantity), 0) as total_cost,
      COALESCE(SUM(si.total_price), 0) as total_revenue,
      COALESCE(SUM(si.profit), 0) as total_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN devices d ON si.device_id = d.id
    WHERE s.status = 'completed'
    GROUP BY category_group
  `).all();

  const formatted = stats.map(s => {
    const margin = s.total_revenue > 0 ? ((s.total_profit / s.total_revenue) * 100).toFixed(1) : 0;
    const markup = s.total_cost > 0 ? ((s.total_profit / s.total_cost) * 100).toFixed(1) : 0;
    return {
      ...s,
      margin_pct: margin,
      markup_pct: markup
    };
  });

  res.json({ success: true, data: formatted });
});

// 4. Daily summary for Telegram bot format
router.get('/daily-summary', authenticateToken, (req, res) => {
  const todaySales = db.prepare(`
    SELECT 
      COUNT(id) as count,
      COALESCE(SUM(final_amount), 0) as revenue,
      COALESCE(SUM(gross_profit), 0) as profit,
      COALESCE(SUM(discount_amount), 0) as discounts
    FROM sales
    WHERE status = 'completed' AND date(created_at) = date('now')
  `).get();

  const todayExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date(date) = date('now')
  `).get().total;

  const cashBalances = db.prepare(`
    SELECT name, balance FROM cash_accounts
  `).all();

  const stockCount = db.prepare(`
    SELECT COUNT(*) as count FROM devices WHERE status = 'omborda'
  `).get().count;

  const textSummary = `
📊 KUNLIK SAVDO HISOBOTI (${new Date().toLocaleDateString('uz-UZ')})
-----------------------------------------
🛒 Sotuvlar soni: ${todaySales.count} ta
💰 Jami tushum: ${todaySales.revenue.toLocaleString()} so'm
💵 Yalpi foyda: ${todaySales.profit.toLocaleString()} so'm
📉 Xarajatlar: ${todayExpenses.toLocaleString()} so'm
🌟 Sof foyda: ${(todaySales.profit - todayExpenses).toLocaleString()} so'm
📦 Omborda qoldiq: ${stockCount} ta telefon
-----------------------------------------
Kassalar:
${cashBalances.map(c => `• ${c.name}: ${Number(c.balance).toLocaleString()} so'm`).join('\n')}
  `.trim();

  res.json({
    success: true,
    data: {
      stats: todaySales,
      expenses: todayExpenses,
      cashBalances,
      stockCount,
      telegramMessage: textSummary
    }
  });
});

// 5. Excel Export
router.get('/export/:type', authenticateToken, (req, res) => {
  const { type } = req.params;
  let data = [];
  let sheetName = 'Hisobot';

  if (type === 'devices') {
    sheetName = 'Telefonlar';
    data = db.prepare(`
      SELECT 
        d.id as ID,
        b.name as Brend,
        m.name as Model,
        m.ram as RAM,
        m.storage as Xotira,
        c.name as Rang,
        d.country_version as Davlat,
        d.imei1 as IMEI_1,
        d.imei2 as IMEI_2,
        d.condition_type as Holati,
        d.battery_pct as Batareya_foiz,
        d.condition_grade as Baho,
        d.cost_price as Tannarx_UZS,
        d.selling_price as Sotuv_narxi_UZS,
        d.min_price as Minimal_narx_UZS,
        br.name as Filial,
        d.status as Status,
        d.created_at as Qabul_sanasi
      FROM devices d
      LEFT JOIN models m ON d.model_id = m.id
      LEFT JOIN brands b ON m.brand_id = b.id
      LEFT JOIN colors c ON d.color_id = c.id
      LEFT JOIN branches br ON d.branch_id = br.id
      ORDER BY d.id DESC
    `).all();
  } else if (type === 'sales') {
    sheetName = 'Sotuvlar';
    data = db.prepare(`
      SELECT 
        s.sale_number as Chek_raqami,
        s.created_at as Sana,
        c.name as Mijoz,
        c.phone as Mijoz_telefoni,
        u_sel.name as Sotuvchi,
        s.total_amount as Umumiy_summa,
        s.discount_amount as Chegirma,
        s.final_amount as Yakuniy_tolov,
        s.payment_type as Tolov_turi,
        s.sale_type as Sotuv_turi,
        s.status as Holat,
        br.name as Filial
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u_sel ON s.seller_id = u_sel.id
      LEFT JOIN branches br ON s.branch_id = br.id
      ORDER BY s.id DESC
    `).all();
  } else if (type === 'customers') {
    sheetName = 'Mijozlar';
    data = db.prepare(`
      SELECT id, name as Ism, phone as Telefon, passport_series as Pasport_Seriya, passport_number as Pasport_Raqam, debt as Qarz_UZS, bonus_balance as Bonus_balans, is_blacklisted as Qora_royxatda, address as Manzil
      FROM customers
      ORDER BY id DESC
    `).all();
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=hisobot_${type}_${Date.now()}.xlsx`);
  res.send(buffer);
});

export default router;
