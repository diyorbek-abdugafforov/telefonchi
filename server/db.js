import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pos_system.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 15-digit Luhn Algorithm Validator for IMEI
export function validateIMEI(imei) {
  if (!imei) return false;
  const cleaned = String(imei).trim();
  if (!/^\d{15}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(cleaned.charAt(i), 10);
    // Double every second digit from left (0-indexed: 1, 3, 5, 7, 9, 11, 13)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit = (digit % 10) + 1;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// Generate valid 15-digit Luhn IMEI for seeds/testing
export function generateValidIMEI(prefix = '35874210') {
  let imei = prefix;
  while (imei.length < 14) {
    imei += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(imei.charAt(i), 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit = (digit % 10) + 1;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return imei + checkDigit.toString();
}

export function initDatabase() {
  // Create tables according to TZ specifications
  db.exec(`
    -- Branches (Filiallar)
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      is_main INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users (Foydalanuvchilar va xodimlar)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL, -- 'admin', 'manager', 'seller', 'cashier', 'warehouse', 'technician'
      branch_id INTEGER REFERENCES branches(id),
      phone TEXT,
      status TEXT DEFAULT 'active', -- 'active', 'archived' (Ishdan ketgan)
      salary_type TEXT DEFAULT 'fixed_plus_pct', -- 'fixed', 'pct_sales', 'pct_profit', 'fixed_plus_pct'
      base_salary DECIMAL(15,2) DEFAULT 0,
      commission_pct DECIMAL(5,2) DEFAULT 0,
      hire_date DATE,
      exit_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Roles and custom permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      permission_key TEXT NOT NULL,
      is_granted INTEGER DEFAULT 1,
      UNIQUE(user_id, permission_key)
    );

    -- Brands & Models
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      ram TEXT,
      storage TEXT,
      release_year INTEGER,
      UNIQUE(brand_id, name, storage)
    );

    -- Colors
    CREATE TABLE IF NOT EXISTS colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      hex_code TEXT
    );

    -- Devices (Telefon kartochkasi)
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER REFERENCES models(id),
      color_id INTEGER REFERENCES colors(id),
      country_version TEXT, -- 'AQSH', 'Yevropa', 'Dubay', 'Gonkong', 'Yaponiya', 'MDH'
      imei1 TEXT UNIQUE NOT NULL,
      imei2 TEXT,
      serial_number TEXT,
      condition_type TEXT NOT NULL, -- 'Yangi (muhrlangan)', 'Yangi (ochilgan)', 'B/U (ishlatilgan)', 'Ta'mirdan chiqqan', 'Renovated'
      battery_pct INTEGER, -- e.g. 88
      condition_grade TEXT, -- 'A+', 'A', 'B', 'C'
      defects TEXT, -- JSON array of defect descriptions
      package_items TEXT, -- JSON array e.g. ['quti', 'kabel']
      icloud_clean INTEGER DEFAULT 1,
      face_id_works INTEGER DEFAULT 1,
      sim_unlocked INTEGER DEFAULT 1,
      purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      extra_costs DECIMAL(15,2) DEFAULT 0,
      cost_price DECIMAL(15,2) NOT NULL DEFAULT 0, -- Tannarx = xarid + extra_costs
      selling_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      min_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      branch_id INTEGER REFERENCES branches(id),
      status TEXT DEFAULT 'omborda', -- 'omborda', 'zahirada', 'sotilgan', 'ta'mirda', 'qaytarilgan', 'yo'qolgan', 'yo'lda'
      warranty_months INTEGER DEFAULT 12,
      photos TEXT, -- JSON array of photo URLs
      supplier_id INTEGER,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sold_at DATETIME
    );

    -- Accessories (Aksessuarlar - IMEI siz, sonli hisob)
    CREATE TABLE IF NOT EXISTS accessories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      name TEXT NOT NULL,
      category TEXT, -- 'G'ilof', 'Oyna', 'Zaryadlovchi', 'Kabel', 'Quloqchin'
      sku TEXT,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      selling_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      min_alert_qty INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers (Yetkazib beruvchilar)
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      company_name TEXT,
      address TEXT,
      debt DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers (Mijozlar)
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      passport_series TEXT,
      passport_number TEXT,
      address TEXT,
      birth_date DATE,
      debt DECIMAL(15,2) DEFAULT 0,
      bonus_balance DECIMAL(15,2) DEFAULT 0,
      is_blacklisted INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cash Accounts (Kassalar va hisob raqamlar)
    CREATE TABLE IF NOT EXISTS cash_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'cash_uzs', 'cash_usd', 'bank_card', 'bank_account'
      balance DECIMAL(15,2) DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Shifts (Smena)
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      cashier_id INTEGER REFERENCES users(id),
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      opening_balance DECIMAL(15,2) DEFAULT 0,
      closing_expected DECIMAL(15,2) DEFAULT 0,
      closing_actual DECIMAL(15,2) DEFAULT 0,
      difference DECIMAL(15,2) DEFAULT 0, -- kamomad (-) yoki ortiqcha (+)
      status TEXT DEFAULT 'open', -- 'open', 'closed'
      notes TEXT
    );

    -- Purchases (Yetkazib beruvchidan xaridlar)
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      branch_id INTEGER REFERENCES branches(id),
      currency TEXT DEFAULT 'UZS', -- 'UZS' or 'USD'
      exchange_rate DECIMAL(15,2) DEFAULT 1,
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      extra_costs DECIMAL(15,2) DEFAULT 0,
      paid_amount DECIMAL(15,2) DEFAULT 0,
      debt_amount DECIMAL(15,2) DEFAULT 0,
      payment_method TEXT,
      cash_account_id INTEGER REFERENCES cash_accounts(id),
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
      device_id INTEGER REFERENCES devices(id),
      unit_cost DECIMAL(15,2) NOT NULL
    );

    -- Buyouts / Trade-In (Aholidan b/u telefon xaridi - Skupka akti)
    CREATE TABLE IF NOT EXISTS buyouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      act_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      passport_series TEXT NOT NULL,
      passport_number TEXT NOT NULL,
      passport_photo TEXT,
      device_id INTEGER REFERENCES devices(id),
      model_name TEXT NOT NULL,
      imei TEXT NOT NULL,
      condition_details TEXT,
      checklist_json TEXT, -- checklist (screen, body, camera, etc.)
      agreed_price DECIMAL(15,2) NOT NULL,
      cash_account_id INTEGER REFERENCES cash_accounts(id),
      is_clean_confirmed INTEGER DEFAULT 1,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sales (Sotuvlar)
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT UNIQUE NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      customer_id INTEGER REFERENCES customers(id),
      seller_id INTEGER REFERENCES users(id),
      cashier_id INTEGER REFERENCES users(id),
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      final_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
      gross_profit DECIMAL(15,2) NOT NULL DEFAULT 0,
      payment_type TEXT NOT NULL, -- 'cash_uzs', 'cash_usd', 'card', 'transfer', 'mixed', 'installment'
      payment_details TEXT, -- JSON for mixed payments
      sale_type TEXT DEFAULT 'standard', -- 'standard', 'installment', 'trade_in'
      trade_in_buyout_id INTEGER REFERENCES buyouts(id),
      warranty_end_date DATE,
      status TEXT DEFAULT 'completed', -- 'completed', 'returned', 'cancelled'
      return_reason TEXT,
      returned_at DATETIME,
      returned_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sale Items
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL, -- 'device', 'accessory', 'service'
      device_id INTEGER REFERENCES devices(id),
      accessory_id INTEGER REFERENCES accessories(id),
      item_name TEXT NOT NULL,
      imei TEXT,
      unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
      unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      quantity INTEGER DEFAULT 1,
      discount DECIMAL(15,2) DEFAULT 0,
      total_price DECIMAL(15,2) NOT NULL,
      profit DECIMAL(15,2) NOT NULL
    );

    -- Installments (Nasiya / Bo'lib to'lash)
    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id),
      total_principal DECIMAL(15,2) NOT NULL,
      markup_pct DECIMAL(5,2) DEFAULT 0,
      total_payable DECIMAL(15,2) NOT NULL,
      upfront_payment DECIMAL(15,2) DEFAULT 0,
      remaining_balance DECIMAL(15,2) NOT NULL,
      duration_months INTEGER NOT NULL,
      monthly_amount DECIMAL(15,2) NOT NULL,
      next_due_date DATE,
      status TEXT DEFAULT 'active', -- 'active', 'completed', 'overdue'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS installment_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      installment_id INTEGER REFERENCES installments(id) ON DELETE CASCADE,
      month_number INTEGER NOT NULL,
      due_date DATE NOT NULL,
      due_amount DECIMAL(15,2) NOT NULL,
      paid_amount DECIMAL(15,2) DEFAULT 0,
      status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
      paid_at DATETIME,
      payment_id INTEGER
    );

    -- Cash Transactions (Kassa harakatlari)
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      cash_account_id INTEGER REFERENCES cash_accounts(id),
      type TEXT NOT NULL, -- 'in', 'out', 'transfer'
      category TEXT NOT NULL, -- 'sale', 'purchase', 'buyout', 'expense', 'salary', 'dividend', 'transfer', 'installment_payment', 'other'
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT DEFAULT 'UZS',
      exchange_rate DECIMAL(15,2) DEFAULT 1,
      description TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Expenses (Xarajatlar)
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER REFERENCES branches(id),
      category TEXT NOT NULL, -- 'Ijara', 'Maosh', 'Kommunal', 'Reklama', 'Transport', 'Uskunalar', 'Boshqa'
      amount DECIMAL(15,2) NOT NULL,
      cash_account_id INTEGER REFERENCES cash_accounts(id),
      date DATE NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Repairs & Warranty Orders (Ta'mirlash va kafolat)
    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      device_type TEXT NOT NULL, -- 'customer', 'stock'
      device_id INTEGER REFERENCES devices(id),
      model_name TEXT NOT NULL,
      imei TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      issue_description TEXT NOT NULL,
      technician_id INTEGER REFERENCES users(id),
      parts_cost DECIMAL(15,2) DEFAULT 0,
      labor_cost DECIMAL(15,2) DEFAULT 0,
      total_cost DECIMAL(15,2) DEFAULT 0,
      status TEXT DEFAULT 'received', -- 'received', 'in_progress', 'ready', 'delivered', 'cancelled'
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- Stock Transfers & Movements (Ombor harakatlari)
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER REFERENCES devices(id),
      accessory_id INTEGER REFERENCES accessories(id),
      from_branch_id INTEGER REFERENCES branches(id),
      to_branch_id INTEGER REFERENCES branches(id),
      type TEXT NOT NULL, -- 'intake', 'transfer_sent', 'transfer_received', 'sale', 'return', 'repair'
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'completed', -- 'completed', 'in_transit'
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Inventory Audits (Inventarizatsiya)
    CREATE TABLE IF NOT EXISTS inventory_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_number TEXT UNIQUE NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      total_expected INTEGER DEFAULT 0,
      total_scanned INTEGER DEFAULT 0,
      total_missing INTEGER DEFAULT 0,
      total_surplus INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS inventory_audit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_id INTEGER REFERENCES inventory_audits(id) ON DELETE CASCADE,
      device_id INTEGER REFERENCES devices(id),
      imei TEXT NOT NULL,
      model_name TEXT,
      result TEXT NOT NULL, -- 'matched', 'missing', 'surplus'
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Active Sessions (Faol seanslar)
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      device_info TEXT,
      browser TEXT,
      ip_address TEXT,
      location TEXT,
      logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_revoked INTEGER DEFAULT 0
    );

    -- Login Events (Kirish tarixi va shubhali urinishlar)
    CREATE TABLE IF NOT EXISTS login_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      login TEXT,
      ip_address TEXT,
      device_info TEXT,
      is_success INTEGER NOT NULL,
      failure_reason TEXT,
      is_suspicious INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Security Alerts (Ogohlantirishlar)
    CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      alert_type TEXT NOT NULL, -- 'out_of_hours_login', 'new_device', 'wrong_passwords', 'abnormal_discount'
      severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Reservations (Bron)
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER REFERENCES devices(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      deposit_amount DECIMAL(15,2) DEFAULT 0,
      expiry_date DATE NOT NULL,
      status TEXT DEFAULT 'active', -- 'active', 'sold', 'cancelled'
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs (Audit jurnali)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'PRICE_CHANGE', 'SALE_RETURN'
      entity_type TEXT NOT NULL, -- 'device', 'sale', 'price', 'user', 'cash'
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Settings & Exchange rates
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );
  `);

  // Check if initial seed is needed
  const branchCount = db.prepare('SELECT COUNT(*) as count FROM branches').get().count;
  if (branchCount === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  console.log("Seeding initial data for phone sales & inventory system...");

  const insertBranch = db.prepare(`
    INSERT INTO branches (name, address, phone, is_main) VALUES (?, ?, ?, ?)
  `);
  const b1 = insertBranch.run("Bosh ofis va Ombor", "Toshkent sh., Chilonzor 9-mavze, 12-uy", "+998 71 200 00 01", 1).lastInsertRowid;
  const b2 = insertBranch.run("Malika savdo markazi (Do'kon A-24)", "Toshkent sh., Kichik Halka yo'li, Malika Savdo Markazi, A-24", "+998 90 100 24 24", 0).lastInsertRowid;
  const b3 = insertBranch.run("Chilonzor filiali (Rayhon ro'parasi)", "Toshkent sh., Qatortol ko'chasi, 45-uy", "+998 90 200 45 45", 0).lastInsertRowid;
  const b4 = insertBranch.run("Yunusobod filiali (Mega Planet yonida)", "Toshkent sh., Ahmad Donish ko'chasi, 2-uy", "+998 90 300 02 02", 0).lastInsertRowid;

  // Insert Users with passwords (all standard test password: 'password123')
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync("password123", salt);

  const insertUser = db.prepare(`
    INSERT INTO users (name, login, password_hash, role, branch_id, phone, status, salary_type, base_salary, commission_pct, hire_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Users for each role
  const uAdmin = insertUser.run("Azizbek Karimov (Do'kon Egasi)", "admin", passwordHash, "admin", b1, "+998 90 111 22 33", "active", "fixed", 15000000, 0, "2023-01-01").lastInsertRowid;
  const uManager = insertUser.run("Sardor Rahimov (Menejer)", "manager", passwordHash, "manager", b2, "+998 90 222 33 44", "active", "fixed_plus_pct", 6000000, 2.5, "2023-03-15").lastInsertRowid;
  const uSeller = insertUser.run("Jasur Mirzayev (Sotuvchi)", "seller", passwordHash, "seller", b2, "+998 90 333 44 55", "active", "fixed_plus_pct", 3500000, 3.0, "2023-06-01").lastInsertRowid;
  const uCashier = insertUser.run("Nilufar Qodirova (Kassir)", "cashier", passwordHash, "cashier", b2, "+998 90 444 55 66", "active", "fixed", 4500000, 0.5, "2023-07-10").lastInsertRowid;
  const uWarehouse = insertUser.run("Shavkat Aliyev (Omborchi)", "warehouse", passwordHash, "warehouse", b1, "+998 90 555 66 77", "active", "fixed", 5000000, 0, "2023-04-01").lastInsertRowid;
  const uTechnician = insertUser.run("Farrux Saidov (Usta-muhandis)", "technician", passwordHash, "technician", b1, "+998 90 666 77 88", "active", "fixed_plus_pct", 4000000, 20.0, "2023-08-01").lastInsertRowid;
  const uArchived = insertUser.run("Otabek Umarov (Sobiq xodim)", "former", passwordHash, "seller", b3, "+998 90 777 88 99", "archived", "fixed", 3000000, 2.0, "2023-02-01").lastInsertRowid;

  // Insert Brands & Models
  const insertBrand = db.prepare("INSERT INTO brands (name) VALUES (?)");
  const bApple = insertBrand.run("Apple").lastInsertRowid;
  const bSamsung = insertBrand.run("Samsung").lastInsertRowid;
  const bXiaomi = insertBrand.run("Xiaomi").lastInsertRowid;

  const insertModel = db.prepare("INSERT INTO models (brand_id, name, ram, storage, release_year) VALUES (?, ?, ?, ?, ?)");
  const m1 = insertModel.run(bApple, "iPhone 16 Pro Max", "8 GB", "256 GB", 2024).lastInsertRowid;
  const m2 = insertModel.run(bApple, "iPhone 16 Pro", "8 GB", "128 GB", 2024).lastInsertRowid;
  const m3 = insertModel.run(bApple, "iPhone 15 Pro", "8 GB", "128 GB", 2023).lastInsertRowid;
  const m4 = insertModel.run(bApple, "iPhone 15", "6 GB", "128 GB", 2023).lastInsertRowid;
  const m5 = insertModel.run(bApple, "iPhone 13", "4 GB", "128 GB", 2021).lastInsertRowid;
  const m6 = insertModel.run(bSamsung, "Galaxy S24 Ultra", "12 GB", "512 GB", 2024).lastInsertRowid;
  const m7 = insertModel.run(bSamsung, "Galaxy S24", "8 GB", "256 GB", 2024).lastInsertRowid;
  const m8 = insertModel.run(bSamsung, "Galaxy A55", "8 GB", "128 GB", 2024).lastInsertRowid;
  const m9 = insertModel.run(bXiaomi, "Redmi Note 13 Pro+", "12 GB", "512 GB", 2024).lastInsertRowid;
  const m10 = insertModel.run(bXiaomi, "Poco X6 Pro", "12 GB", "256 GB", 2024).lastInsertRowid;

  // Insert Colors
  const insertColor = db.prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)");
  const c1 = insertColor.run("Desert Titanium (Qumloq)", "#BFA796").lastInsertRowid;
  const c2 = insertColor.run("Black Titanium (Qora)", "#262626").lastInsertRowid;
  const c3 = insertColor.run("Natural Titanium (Tabiiy)", "#8C857B").lastInsertRowid;
  const c4 = insertColor.run("Blue (Moviy)", "#4B779A").lastInsertRowid;
  const c5 = insertColor.run("Midnight (Qora ko'k)", "#1B2430").lastInsertRowid;
  const c6 = insertColor.run("Titanium Gray (Kulrang)", "#737373").lastInsertRowid;
  const c7 = insertColor.run("Awesome Navy (To'q ko'k)", "#1E293B").lastInsertRowid;

  // Cash Accounts
  const insertCash = db.prepare(`
    INSERT INTO cash_accounts (branch_id, name, type, balance, is_default)
    VALUES (?, ?, ?, ?, ?)
  `);
  const ca1 = insertCash.run(b2, "Asosiy Naqd Kassa (UZS)", "cash_uzs", 48500000, 1).lastInsertRowid;
  const ca2 = insertCash.run(b2, "Dollar Kassa (USD)", "cash_usd", 4200, 0).lastInsertRowid;
  const ca3 = insertCash.run(b2, "Terminal / Karta (Humo & Uzcard)", "bank_card", 32400000, 0).lastInsertRowid;
  const ca4 = insertCash.run(b1, "Ipoteka Bank Hisob Raqami", "bank_account", 125000000, 0).lastInsertRowid;

  // Suppliers
  const insertSupplier = db.prepare("INSERT INTO suppliers (name, phone, company_name, debt) VALUES (?, ?, ?, ?)");
  const s1 = insertSupplier.run("Akmal aka (Dubai Optom)", "+998 90 100 99 88", "Dubai Mobile Logistics", 18500000).lastInsertRowid;
  const s2 = insertSupplier.run("Shenzhen Tech Import", "+998 97 700 88 11", "Shenzhen Direct Trade", 0).lastInsertRowid;
  const s3 = insertSupplier.run("Malika B-12 Ulgurji", "+998 93 300 11 22", "Malika Wholesale Co.", 6200000).lastInsertRowid;

  // Customers
  const insertCust = db.prepare(`
    INSERT INTO customers (name, phone, passport_series, passport_number, address, debt, bonus_balance, is_blacklisted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const cu1 = insertCust.run("Bobur Mansurov", "+998 90 123 45 67", "AA", "7654321", "Toshkent sh., Mirzo Ulug'bek t.", 0, 120000, 0).lastInsertRowid;
  const cu2 = insertCust.run("Madina Olimova", "+998 93 987 65 43", "AB", "1239874", "Toshkent sh., Yunusobod 14", 3600000, 85000, 0).lastInsertRowid;
  const cu3 = insertCust.run("Temur Xoliqov", "+998 97 555 44 33", "AC", "4561238", "Toshkent sh., Sergeli 7", 0, 50000, 0).lastInsertRowid;
  const cu4 = insertCust.run("Alisher Qosimov", "+998 99 888 77 66", "AA", "9998877", "Toshkent sh., Chilonzor 2", 8200000, 0, 1).lastInsertRowid;

  // Accessories
  const insertAcc = db.prepare(`
    INSERT INTO accessories (branch_id, name, category, sku, stock_qty, cost_price, selling_price, min_alert_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAcc.run(b2, "Apple 20W USB-C Power Adapter (Original)", "Zaryadlovchi", "ACC-APL-20W", 45, 140000, 240000, 10);
  insertAcc.run(b2, "iPhone 16 Pro Max Clear Case MagSafe", "G'ilof", "ACC-IP16PM-CLR", 28, 55000, 130000, 8);
  insertAcc.run(b2, "iPhone 15 Pro Max 9D Tempered Glass", "Oyna", "ACC-IP15PM-GLS", 60, 18000, 60000, 15);
  insertAcc.run(b2, "Hoco Type-C to Type-C 60W Cable", "Kabel", "ACC-HOCO-CC", 35, 25000, 65000, 10);
  insertAcc.run(b2, "AirPods Pro 2 USB-C Case (Original)", "Quloqchin", "ACC-AIRPODS-P2", 12, 1950000, 2600000, 3);

  // Devices Seed (Generating realistic valid Luhn IMEIs)
  const insertDevice = db.prepare(`
    INSERT INTO devices (
      model_id, color_id, country_version, imei1, imei2, serial_number, condition_type,
      battery_pct, condition_grade, defects, package_items, icloud_clean, face_id_works,
      sim_unlocked, purchase_price, extra_costs, cost_price, selling_price, min_price,
      branch_id, status, warranty_months, supplier_id, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const initialDevices = [
    // 1. iPhone 16 Pro Max 256GB - Brand New Sealed
    {
      model_id: m1, color_id: c1, country_version: "AQSH",
      imei1: generateValidIMEI("35698411"), imei2: generateValidIMEI("35698412"),
      serial: "F2L9QX4M01", condition: "Yangi (muhrlangan)",
      battery: 100, grade: "A+", defects: "[]",
      package_items: '["quti", "kabel", "hujjat"]',
      purchase: 14800000, extra: 200000, cost: 15000000, sell: 16800000, min: 16200000,
      branch: b2, status: "omborda", warranty: 12, supp: s1
    },
    // 2. iPhone 16 Pro 128GB - Brand New Sealed
    {
      model_id: m2, color_id: c2, country_version: "Dubay",
      imei1: generateValidIMEI("35698413"), imei2: generateValidIMEI("35698414"),
      serial: "F2L9QX4M02", condition: "Yangi (muhrlangan)",
      battery: 100, grade: "A+", defects: "[]",
      package_items: '["quti", "kabel", "hujjat"]',
      purchase: 12500000, extra: 150000, cost: 12650000, sell: 14200000, min: 13700000,
      branch: b2, status: "omborda", warranty: 12, supp: s1
    },
    // 3. iPhone 15 Pro 128GB - B/U (Ishlatilgan, 89% batareya)
    {
      model_id: m3, color_id: c3, country_version: "AQSH",
      imei1: generateValidIMEI("35698415"), imei2: generateValidIMEI("35698416"),
      serial: "F2L9QX4M03", condition: "B/U (ishlatilgan)",
      battery: 89, grade: "A", defects: '["Kichik mikroskopik chiziq korpus yonida"]',
      package_items: '["quti", "kabel"]',
      purchase: 8800000, extra: 100000, cost: 8900000, sell: 10400000, min: 9900000,
      branch: b2, status: "omborda", warranty: 6, supp: s3
    },
    // 4. iPhone 15 128GB - B/U (94% batareya)
    {
      model_id: m4, color_id: c4, country_version: "Yevropa",
      imei1: generateValidIMEI("35698417"), imei2: generateValidIMEI("35698418"),
      serial: "F2L9QX4M04", condition: "B/U (ishlatilgan)",
      battery: 94, grade: "A+", defects: "[]",
      package_items: '["quti", "kabel", "zaryadlovchi"]',
      purchase: 7100000, extra: 50000, cost: 7150000, sell: 8300000, min: 7900000,
      branch: b2, status: "omborda", warranty: 6, supp: null
    },
    // 5. iPhone 13 128GB - B/U (82% batareya)
    {
      model_id: m5, color_id: c5, country_version: "MDH",
      imei1: generateValidIMEI("35698419"), imei2: null,
      serial: "F2L9QX4M05", condition: "B/U (ishlatilgan)",
      battery: 82, grade: "B", defects: JSON.stringify(["Ekran himoya oynasi ostida mayda chiziq", "Burchakda bo'yoq ko'chgan"]),
      package_items: '["faqat telefon"]',
      purchase: 4600000, extra: 100000, cost: 4700000, sell: 5600000, min: 5300000,
      branch: b2, status: "omborda", warranty: 3, supp: null
    },
    // 6. Samsung Galaxy S24 Ultra 512GB - Brand New
    {
      model_id: m6, color_id: c6, country_version: "Dubay",
      imei1: generateValidIMEI("35789121"), imei2: generateValidIMEI("35789122"),
      serial: "R5CW30X1234", condition: "Yangi (muhrlangan)",
      battery: 100, grade: "A+", defects: "[]",
      package_items: '["quti", "kabel", "hujjat"]',
      purchase: 12800000, extra: 200000, cost: 13000000, sell: 14700000, min: 14100000,
      branch: b2, status: "omborda", warranty: 12, supp: s2
    },
    // 7. Samsung Galaxy A55 128GB - Brand New
    {
      model_id: m8, color_id: c7, country_version: "MDH",
      imei1: generateValidIMEI("35789123"), imei2: generateValidIMEI("35789124"),
      serial: "R5CW30X5678", condition: "Yangi (muhrlangan)",
      battery: 100, grade: "A+", defects: "[]",
      package_items: '["quti", "kabel", "hujjat"]',
      purchase: 3700000, extra: 50000, cost: 3750000, sell: 4350000, min: 4100000,
      branch: b2, status: "omborda", warranty: 12, supp: s3
    },
    // 8. Redmi Note 13 Pro+ 512GB - Brand New
    {
      model_id: m9, color_id: c2, country_version: "Xitoy Global",
      imei1: generateValidIMEI("86542101"), imei2: generateValidIMEI("86542102"),
      serial: "XM13PR7788", condition: "Yangi (muhrlangan)",
      battery: 100, grade: "A+", defects: "[]",
      package_items: JSON.stringify(["quti", "120W zaryadlovchi", "kabel", "g'ilof"]),
      purchase: 3900000, extra: 50000, cost: 3950000, sell: 4600000, min: 4300000,
      branch: b3, status: "omborda", warranty: 12, supp: s2
    },
    // 9. iPhone 15 Pro 128GB - In repair (Ta'mirda)
    {
      model_id: m3, color_id: c2, country_version: "AQSH",
      imei1: generateValidIMEI("35698425"), imei2: generateValidIMEI("35698426"),
      serial: "F2L9QX4M09", condition: "Ta'mirdan chiqqan",
      battery: 86, grade: "B", defects: '["Orqa shisha almashtirilmoqda"]',
      package_items: '["telefon"]',
      purchase: 7800000, extra: 450000, cost: 8250000, sell: 9700000, min: 9200000,
      branch: b1, status: "ta'mirda", warranty: 3, supp: null
    },
    // 10. iPhone 16 Pro Max - In Transit (Yo'lda - Filiallararo ko'chirish)
    {
      model_id: m1, color_id: c2, country_version: "Dubay",
      imei1: generateValidIMEI("35698427"), imei2: generateValidIMEI("35698428"),
      serial: "F2L9QX4M10", condition: "Yangi (muhrlangan)",
      battery: 100, grade: "A+", defects: "[]",
      package_items: '["quti", "kabel"]',
      purchase: 14900000, extra: 100000, cost: 15000000, sell: 16800000, min: 16300000,
      branch: b3, status: "yo'lda", warranty: 12, supp: s1
    }
  ];

  const deviceIds = [];
  for (const d of initialDevices) {
    const res = insertDevice.run(
      d.model_id, d.color_id, d.country_version, d.imei1, d.imei2, d.serial, d.condition,
      d.battery, d.grade, d.defects, d.package_items, 1, 1, 1,
      d.purchase, d.extra, d.cost, d.sell, d.min,
      d.branch, d.status, d.warranty, d.supp, uWarehouse
    );
    deviceIds.push(res.lastInsertRowid);
  }

  // Seed sample completed sales to populate reports and dashboards immediately
  const insertSale = db.prepare(`
    INSERT INTO sales (
      sale_number, branch_id, customer_id, seller_id, cashier_id,
      total_amount, discount_amount, final_amount, total_cost, gross_profit,
      payment_type, sale_type, warranty_end_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '+12 month'), datetime('now', ?))
  `);

  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (
      sale_id, item_type, device_id, item_name, imei, unit_cost, unit_price, quantity, discount, total_price, profit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sale 1: iPhone 16 Pro sold yesterday
  const sRes1 = insertSale.run(
    "INV-2026-001", b2, cu1, uSeller, uCashier,
    14200000, 200000, 14000000, 12650000, 1350000,
    "mixed", "standard", "-1 day"
  );
  insertSaleItem.run(sRes1.lastInsertRowid, "device", deviceIds[1], "iPhone 16 Pro 128GB Black Titanium", initialDevices[1].imei1, 12650000, 14200000, 1, 200000, 14000000, 1350000);

  // Sale 2: Samsung Galaxy A55 + Accessories sold 2 days ago
  const sRes2 = insertSale.run(
    "INV-2026-002", b2, cu3, uSeller, uCashier,
    4650000, 50000, 4600000, 3823000, 777000,
    "card", "standard", "-2 day"
  );
  insertSaleItem.run(sRes2.lastInsertRowid, "device", deviceIds[6], "Galaxy A55 128GB Awesome Navy", initialDevices[6].imei1, 3750000, 4350000, 1, 50000, 4300000, 550000);
  insertSaleItem.run(sRes2.lastInsertRowid, "accessory", null, "iPhone 15 Pro Max 9D Tempered Glass + O'rnatish", null, 18000, 60000, 1, 0, 60000, 42000);
  insertSaleItem.run(sRes2.lastInsertRowid, "accessory", null, "Apple 20W USB-C Power Adapter (Original)", null, 140000, 240000, 1, 0, 240000, 100000);

  // Sale 3: Installment Sale (Nasiya) - iPhone 15 B/U with 6 month installment plan
  const sRes3 = insertSale.run(
    "INV-2026-003", b2, cu2, uSeller, uCashier,
    9500000, 0, 9500000, 7150000, 2350000,
    "installment", "installment", "-15 day"
  );
  insertSaleItem.run(sRes3.lastInsertRowid, "device", deviceIds[3], "iPhone 15 128GB Blue (B/U)", initialDevices[3].imei1, 7150000, 9500000, 1, 0, 9500000, 2350000);

  // Create installment entry
  const insertInst = db.prepare(`
    INSERT INTO installments (
      sale_id, customer_id, total_principal, markup_pct, total_payable,
      upfront_payment, remaining_balance, duration_months, monthly_amount, next_due_date, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '+15 day'), 'active', datetime('now', '-15 day'))
  `);
  const instId = insertInst.run(sRes3.lastInsertRowid, cu2, 8300000, 14.5, 9500000, 2300000, 7200000, 6, 1200000).lastInsertRowid;

  // Installment schedule
  const insertSched = db.prepare(`
    INSERT INTO installment_schedule (installment_id, month_number, due_date, due_amount, paid_amount, status, paid_at)
    VALUES (?, ?, date('now', ?), ?, ?, ?, ?)
  `);
  // Month 1 paid
  insertSched.run(instId, 1, "-5 day", 1200000, 1200000, "paid", "2026-11-12 14:20:00");
  // Month 2 pending
  insertSched.run(instId, 2, "+25 day", 1200000, 0, "pending", null);
  insertSched.run(instId, 3, "+55 day", 1200000, 0, "pending", null);
  insertSched.run(instId, 4, "+85 day", 1200000, 0, "pending", null);
  insertSched.run(instId, 5, "+115 day", 1200000, 0, "pending", null);
  insertSched.run(instId, 6, "+145 day", 1200000, 0, "pending", null);

  // Insert initial expenses
  const insertExpense = db.prepare(`
    INSERT INTO expenses (branch_id, category, amount, cash_account_id, date, is_recurring, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertExpense.run(b2, "Ijara", 12000000, ca4, "2026-11-01", 1, "Malika A-24 do'kon oylik ijara to'lovi", uAdmin);
  insertExpense.run(b2, "Kommunal", 1450000, ca1, "2026-11-05", 1, "Elektr energiyasi va internet to'lovi", uManager);
  insertExpense.run(b2, "Reklama", 3200000, ca4, "2026-11-08", 0, "Instagram va Telegram kanallarda targets reklama", uManager);
  insertExpense.run(b1, "Transport", 650000, ca1, "2026-11-10", 0, "Dubai yuklarini aeroportdan omborga yetkazish", uWarehouse);

  // Insert Repair Order
  const insertRepair = db.prepare(`
    INSERT INTO repairs (
      order_number, device_type, device_id, model_name, imei,
      customer_name, customer_phone, issue_description, technician_id,
      parts_cost, labor_cost, total_cost, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRepair.run(
    "REP-2026-001", "stock", deviceIds[8], "iPhone 15 Pro", initialDevices[8].imei1,
    "Do'kon telefoni", "+998 71 200 00 01", "Orqa panel shishasi singan, yangi original shisha o'rnatish",
    uTechnician, 300000, 150000, 450000, "in_progress", uManager
  );
  insertRepair.run(
    "REP-2026-002", "customer", null, "iPhone 13 Pro", generateValidIMEI("35698433"),
    "Olimjon Rahmonov", "+998 90 999 11 22", "Batareya tez tugamoqda (76%), yangi 100% original batareyaga almashtirish",
    uTechnician, 450000, 150000, 600000, "ready", uSeller
  );

  // Insert Skupka / Buyout sample (Aholidan olingan akt)
  const insertBuyout = db.prepare(`
    INSERT INTO buyouts (
      act_number, customer_name, customer_phone, passport_series, passport_number,
      model_name, imei, condition_details, agreed_price, cash_account_id, is_clean_confirmed, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBuyout.run(
    "AKT-2026-089", "Shoxruh Karimov", "+998 90 411 33 22", "AD", "8877665",
    "iPhone 13 128GB Midnight", initialDevices[4].imei1, "B/U, Batareya 82%, yengil chizilgan, toza",
    4600000, ca1, 1, uSeller
  );

  // Insert Settings
  const insertSetting = db.prepare("INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)");
  insertSetting.run("usd_rate", "12850", "Markaziy Bank kunlik dollar kursi (UZS)");
  insertSetting.run("company_name", "iStore Uzbekistan - Telefon savdosi va xizmat ko'rsatish", "Kompaniya rasmiy nomi");
  insertSetting.run("phone", "+998 71 200 00 01", "Aloqa telefoni");
  insertSetting.run("receipt_header", "iStore Mobile Tashkent", "Chekdagi sarlavha");
  insertSetting.run("receipt_footer", "Xaridingiz uchun rahmat! Kafolat bo'yicha chekni saqlang.", "Chekdagi quyi yozuv");
  insertSetting.run("work_hours_start", "09:00", "Do'kon ish boshlash vaqti");
  insertSetting.run("work_hours_end", "20:00", "Do'kon ish tugash vaqti");
  insertSetting.run("idle_timeout_min", "15", "Bo'sh turgan sessiya avtomatik yopilish vaqti (daqiqa)");

  // Initial Audit Log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, old_values, new_values, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run(uAdmin, "Azizbek Karimov (Do'kon Egasi)", "SYSTEM_INIT", "system", "0", null, "Tizim ishga tushirildi va boshlang'ich ma'lumotlar kiritildi", "127.0.0.1");

  // Active Sessions
  const insertSession = db.prepare(`
    INSERT INTO sessions (user_id, token, device_info, browser, ip_address, location, logged_in_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-30 minute'), datetime('now', '-2 minute'))
  `);
  insertSession.run(uAdmin, "demo_token_admin_sess", "Windows PC (Desktop)", "Chrome 131.0", "195.158.12.34", "Toshkent, O'zbekiston");
  insertSession.run(uSeller, "demo_token_seller_sess", "Samsung Galaxy Tab S9", "Chrome Mobile", "195.158.12.35", "Toshkent (Malika filiali)");

  // Sample security alert for out-of-hours login
  const insertAlert = db.prepare(`
    INSERT INTO security_alerts (user_id, alert_type, severity, message, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '-6 hour'))
  `);
  insertAlert.run(uSeller, "out_of_hours_login", "warning", "Sotuvchi Jasur Mirzayev 23:45 da yangi IP (84.54.120.19) orqali tizimga kirdi", 0);

  console.log("Database seeded successfully with realistic market data!");
}

export default db;
