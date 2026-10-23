const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

// Ensure data folder exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'taphoa_maicua.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency and performance + foreign keys
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

function initSchema() {
  db.exec(`
    -- Cài đặt cửa hàng
    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Danh mục hàng hóa
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Nhà cung cấp
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Sản phẩm
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      image_url TEXT,
      category_id INTEGER,
      base_unit TEXT NOT NULL DEFAULT 'cái',
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 5,
      default_supplier_id INTEGER,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      featured_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    -- Đơn vị tính bán quy đổi
    CREATE TABLE IF NOT EXISTS product_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      unit_name TEXT NOT NULL,
      conversion_factor REAL NOT NULL DEFAULT 1,
      selling_price REAL NOT NULL DEFAULT 0,
      barcode TEXT,
      is_base INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Hóa đơn bán hàng
    CREATE TABLE IF NOT EXISTS sales_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      total_items REAL NOT NULL DEFAULT 0,
      subtotal_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      final_amount REAL NOT NULL DEFAULT 0,
      customer_paid REAL NOT NULL DEFAULT 0,
      change_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      cancelled_reason TEXT,
      cancelled_at TEXT
    );

    -- Chi tiết hóa đơn bán hàng
    CREATE TABLE IF NOT EXISTS sales_receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_code TEXT,
      unit_name TEXT NOT NULL,
      conversion_factor REAL NOT NULL DEFAULT 1,
      quantity REAL NOT NULL DEFAULT 1,
      base_quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (receipt_id) REFERENCES sales_receipts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Phiếu nhập hàng
    CREATE TABLE IF NOT EXISTS purchase_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      supplier_id INTEGER,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      debt_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT,
      cancelled_reason TEXT,
      cancelled_at TEXT,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    -- Chi tiết phiếu nhập hàng
    CREATE TABLE IF NOT EXISTS purchase_receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      conversion_factor REAL NOT NULL DEFAULT 1,
      quantity REAL NOT NULL DEFAULT 1,
      base_quantity REAL NOT NULL DEFAULT 1,
      cost_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Lịch sử biến động kho
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL,
      reference_id INTEGER,
      reference_code TEXT,
      quantity_change REAL NOT NULL,
      stock_before REAL NOT NULL,
      stock_after REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Phiếu kiểm kê và điều chỉnh kho
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      product_id INTEGER NOT NULL,
      old_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      difference REAL NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Chỉ mục để tối ưu tốc độ tìm kiếm mã vạch, mã sản phẩm và ngày tháng
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
    CREATE INDEX IF NOT EXISTS idx_product_units_barcode ON product_units(barcode);
    CREATE INDEX IF NOT EXISTS idx_sales_receipts_date ON sales_receipts(created_at);
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
  `);

  // Default settings
  const defaultSettings = [
    ['store_name', 'TẠP HÓA MAI CUA'],
    ['store_phone', ''],
    ['store_address', ''],
    ['store_logo', ''],
    ['strict_stock', 'true'],
    ['default_min_stock', '5'],
    ['cost_method', 'latest'],
    ['receipt_footer', 'Cảm ơn Quý khách! Hẹn gặp lại!']
  ];

  const checkStmt = db.prepare('SELECT value FROM store_settings WHERE key = ?');
  const insertStmt = db.prepare('INSERT INTO store_settings (key, value) VALUES (?, ?)');

  for (const [key, val] of defaultSettings) {
    const existing = checkStmt.get(key);
    if (!existing) {
      insertStmt.run(key, val);
    }
  }
}

initSchema();

module.exports = {
  db,
  dataDir,
  uploadsDir
};
