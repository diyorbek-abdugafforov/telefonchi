import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

router.get('/stats', authenticateToken, (req, res) => {
  const { period = 'month', branch_id } = req.query;
  const role = req.user.role;
  const userBranchId = req.user.branch_id;

  // Filter conditions
  let dateFilter = "created_at >= datetime('now', '-30 day')";
  if (period === 'today') dateFilter = "date(created_at) = date('now')";
  else if (period === 'week') dateFilter = "created_at >= datetime('now', '-7 day')";
  else if (period === 'year') dateFilter = "created_at >= datetime('now', '-365 day')";

  let branchSql = "";
  const params = [];
  if (branch_id && branch_id !== 'all') {
    branchSql = " AND branch_id = ?";
    params.push(Number(branch_id));
  } else if (role !== 'admin' && userBranchId) {
    // Non-admins only see their own branch
    branchSql = " AND branch_id = ?";
    params.push(userBranchId);
  }

  // 1. Sales and Revenue
  const salesQuery = `
    SELECT 
      COUNT(*) as total_sales_count,
      COALESCE(SUM(final_amount), 0) as total_revenue,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(gross_profit), 0) as total_gross_profit,
      COALESCE(SUM(discount_amount), 0) as total_discounts
    FROM sales 
    WHERE status = 'completed' AND ${dateFilter} ${branchSql}
  `;
  const salesStats = db.prepare(salesQuery).get(...params);

  // 2. Sold devices breakdown (Yangi vs B/U)
  const devicesBreakdown = db.prepare(`
    SELECT 
      d.condition_type,
      COUNT(si.id) as count,
      COALESCE(SUM(si.total_price), 0) as revenue,
      COALESCE(SUM(si.profit), 0) as profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN devices d ON si.device_id = d.id
    WHERE s.status = 'completed' AND s.${dateFilter} ${branchSql ? " AND s.branch_id = " + params[0] : ""}
    GROUP BY d.condition_type
  `).all();

  let countNew = 0;
  let countUsed = 0;
  devicesBreakdown.forEach(item => {
    if (item.condition_type && item.condition_type.includes('Yangi')) {
      countNew += item.count;
    } else {
      countUsed += item.count;
    }
  });

  // 3. Current Warehouse Stock count & valuation
  let stockBranchFilter = "";
  if (branch_id && branch_id !== 'all') {
    stockBranchFilter = " AND branch_id = " + Number(branch_id);
  } else if (role !== 'admin' && userBranchId) {
    stockBranchFilter = " AND branch_id = " + userBranchId;
  }

  const stockStats = db.prepare(`
    SELECT 
      COUNT(*) as total_devices_in_stock,
      COALESCE(SUM(cost_price), 0) as total_stock_cost_value,
      COALESCE(SUM(selling_price), 0) as total_stock_retail_value
    FROM devices 
    WHERE status = 'omborda' ${stockBranchFilter}
  `).get();

  // 4. Cash Balances
  let cashBranchFilter = "";
  if (branch_id && branch_id !== 'all') {
    cashBranchFilter = " WHERE branch_id = " + Number(branch_id);
  } else if (role !== 'admin' && userBranchId) {
    cashBranchFilter = " WHERE branch_id = " + userBranchId;
  }

  const cashBalances = db.prepare(`
    SELECT type, name, balance 
    FROM cash_accounts 
    ${cashBranchFilter}
  `).all();

  // 5. Total Expenses
  let expenseBranchFilter = "";
  if (branch_id && branch_id !== 'all') {
    expenseBranchFilter = " AND branch_id = " + Number(branch_id);
  } else if (role !== 'admin' && userBranchId) {
    expenseBranchFilter = " AND branch_id = " + userBranchId;
  }
  const expenseStats = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses 
    WHERE ${dateFilter.replace(/created_at/g, 'date')} ${expenseBranchFilter}
  `).get();

  // 6. Receivables (Nasiya qarzdorlik) and Supplier Debts
  const installmentDebts = db.prepare(`
    SELECT 
      COALESCE(SUM(remaining_balance), 0) as total_receivable,
      COUNT(*) as active_installments_count
    FROM installments 
    WHERE status IN ('active', 'overdue')
  `).get();

  const supplierDebts = db.prepare(`
    SELECT COALESCE(SUM(debt), 0) as total_supplier_debt FROM suppliers
  `).get();

  // 7. Top Models
  const topModels = db.prepare(`
    SELECT 
      si.item_name,
      COUNT(si.id) as sold_count,
      SUM(si.total_price) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed' AND s.${dateFilter} ${branchSql ? " AND s.branch_id = " + params[0] : ""}
    GROUP BY si.item_name
    ORDER BY sold_count DESC
    LIMIT 5
  `).all();

  // 8. Top Sellers Leaderboard
  const topSellers = db.prepare(`
    SELECT 
      u.id,
      u.name,
      COUNT(s.id) as sales_count,
      COALESCE(SUM(s.final_amount), 0) as total_revenue,
      COALESCE(SUM(s.gross_profit), 0) as total_profit
    FROM users u
    JOIN sales s ON s.seller_id = u.id
    WHERE s.status = 'completed' AND s.${dateFilter} ${branchSql ? " AND s.branch_id = " + params[0] : ""}
    GROUP BY u.id, u.name
    ORDER BY total_revenue DESC
    LIMIT 5
  `).all();

  // 9. Daily sales chart (last 14 days)
  const chartSales = db.prepare(`
    SELECT 
      date(created_at) as sale_date,
      COUNT(id) as count,
      COALESCE(SUM(final_amount), 0) as revenue,
      COALESCE(SUM(gross_profit), 0) as profit
    FROM sales
    WHERE status = 'completed' AND created_at >= datetime('now', '-14 day') ${branchSql ? " AND branch_id = " + params[0] : ""}
    GROUP BY date(created_at)
    ORDER BY sale_date ASC
  `).all();

  // 10. Critical Alerts
  // A) Low stock accessories
  const lowStockAccessories = db.prepare(`
    SELECT name, stock_qty, min_alert_qty 
    FROM accessories 
    WHERE stock_qty <= min_alert_qty
    LIMIT 5
  `).all();

  // B) Aging stock phones (>30 days in warehouse)
  const agingPhones = db.prepare(`
    SELECT d.id, m.name as model_name, d.imei1, d.created_at,
           CAST((julianday('now') - julianday(d.created_at)) AS INTEGER) as days_in_stock
    FROM devices d
    JOIN models m ON d.model_id = m.id
    WHERE d.status = 'omborda' AND d.created_at <= datetime('now', '-30 day')
    ORDER BY days_in_stock DESC
    LIMIT 5
  `).all();

  // C) Overdue installments
  const overdueInstallments = db.prepare(`
    SELECT i.id, c.name as customer_name, c.phone, i.monthly_amount, i.next_due_date,
           CAST((julianday('now') - julianday(i.next_due_date)) AS INTEGER) as days_overdue
    FROM installments i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.status = 'overdue' OR (i.status = 'active' AND date(i.next_due_date) < date('now'))
    LIMIT 5
  `).all();

  // Sanitize for Seller / Cashier
  const isPrivileged = role === 'admin' || role === 'manager';

  const netProfit = isPrivileged ? (salesStats.total_gross_profit - expenseStats.total_expenses) : null;
  const marginPct = (isPrivileged && salesStats.total_revenue > 0)
    ? ((salesStats.total_gross_profit / salesStats.total_revenue) * 100).toFixed(1)
    : null;

  res.json({
    success: true,
    data: {
      metrics: {
        total_sales_count: salesStats.total_sales_count,
        count_new_sold: countNew,
        count_used_sold: countUsed,
        total_revenue: isPrivileged ? salesStats.total_revenue : undefined,
        total_cost: isPrivileged ? salesStats.total_cost : undefined,
        total_gross_profit: isPrivileged ? salesStats.total_gross_profit : undefined,
        total_expenses: isPrivileged ? expenseStats.total_expenses : undefined,
        net_profit: netProfit,
        margin_pct: marginPct,
        total_devices_in_stock: stockStats.total_devices_in_stock,
        total_stock_cost_value: isPrivileged ? stockStats.total_stock_cost_value : undefined,
        total_stock_retail_value: stockStats.total_stock_retail_value,
        total_receivable: isPrivileged ? installmentDebts.total_receivable : undefined,
        active_installments_count: installmentDebts.active_installments_count,
        total_supplier_debt: isPrivileged ? supplierDebts.total_supplier_debt : undefined
      },
      cashBalances: (isPrivileged || role === 'cashier') ? cashBalances : [],
      topModels,
      topSellers: isPrivileged 
        ? topSellers 
        : topSellers.map(s => ({ id: s.id, name: s.name, sales_count: s.sales_count })),
      chartSales: isPrivileged 
        ? chartSales 
        : chartSales.map(c => ({ sale_date: c.sale_date, count: c.count })),
      alerts: {
        lowStockAccessories,
        agingPhones,
        overdueInstallments: isPrivileged ? overdueInstallments : []
      }
    }
  });
});

export default router;
