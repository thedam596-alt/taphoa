const express = require('express');
const os = require('os');
const { db } = require('../db');

const router = express.Router();

// Helper to get local network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ interface: name, ip: iface.address });
      }
    }
  }
  return ips;
}

// Get store settings + local network IPs
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM store_settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    const localIps = getLocalIpAddresses();

    res.json({
      success: true,
      data: settings,
      network: {
        ips: localIps,
        port: 5000,
        public_url: settings.public_https_url || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update store settings
router.put('/', (req, res) => {
  try {
    const updates = req.body; // { store_name, store_phone, store_address, store_logo, strict_stock, default_min_stock, cost_method, receipt_footer }

    const updateStmt = db.prepare(`
      INSERT INTO store_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      for (const [k, v] of Object.entries(updates)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          updateStmt.run(k, String(v));
        }
      }
      db.exec('COMMIT');

      const rows = db.prepare('SELECT key, value FROM store_settings').all();
      const settings = {};
      for (const r of rows) {
        settings[r.key] = r.value;
      }

      res.json({
        success: true,
        data: settings,
        message: 'Đã lưu cấu hình cửa hàng thành công'
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export complete database backup as JSON
router.get('/backup', (req, res) => {
  try {
    const backupData = {
      appName: 'TẠP HÓA MAI CUA',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      store_settings: db.prepare('SELECT * FROM store_settings').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      suppliers: db.prepare('SELECT * FROM suppliers').all(),
      products: db.prepare('SELECT * FROM products').all(),
      product_units: db.prepare('SELECT * FROM product_units').all(),
      sales_receipts: db.prepare('SELECT * FROM sales_receipts').all(),
      sales_receipt_items: db.prepare('SELECT * FROM sales_receipt_items').all(),
      purchase_receipts: db.prepare('SELECT * FROM purchase_receipts').all(),
      purchase_receipt_items: db.prepare('SELECT * FROM purchase_receipt_items').all(),
      inventory_transactions: db.prepare('SELECT * FROM inventory_transactions').all(),
      inventory_adjustments: db.prepare('SELECT * FROM inventory_adjustments').all()
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `SaoLuu_TapHoaMaiCua_${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Restore database from JSON backup
router.post('/restore', (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.products || !backup.store_settings) {
      return res.status(400).json({
        success: false,
        message: 'File sao lưu không hợp lệ hoặc thiếu cấu trúc dữ liệu TẠP HÓA MAI CUA'
      });
    }

    db.exec('BEGIN TRANSACTION');
    try {
      // Clear current tables in safe order
      db.exec(`
        DELETE FROM sales_receipt_items;
        DELETE FROM sales_receipts;
        DELETE FROM purchase_receipt_items;
        DELETE FROM purchase_receipts;
        DELETE FROM inventory_adjustments;
        DELETE FROM inventory_transactions;
        DELETE FROM product_units;
        DELETE FROM products;
        DELETE FROM suppliers;
        DELETE FROM categories;
        DELETE FROM store_settings;
      `);

      // 1. Settings
      if (Array.isArray(backup.store_settings)) {
        const stmt = db.prepare('INSERT INTO store_settings (key, value) VALUES (?, ?)');
        for (const row of backup.store_settings) {
          stmt.run(row.key, row.value);
        }
      }

      // 2. Categories
      if (Array.isArray(backup.categories)) {
        const stmt = db.prepare('INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)');
        for (const r of backup.categories) {
          stmt.run(r.id, r.name, r.description, r.created_at || new Date().toISOString());
        }
      }

      // 3. Suppliers
      if (Array.isArray(backup.suppliers)) {
        const stmt = db.prepare('INSERT INTO suppliers (id, name, phone, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        for (const r of backup.suppliers) {
          stmt.run(r.id, r.name, r.phone, r.address, r.notes, r.created_at || new Date().toISOString());
        }
      }

      // 4. Products
      if (Array.isArray(backup.products)) {
        const stmt = db.prepare(`
          INSERT INTO products (
            id, code, barcode, name, image_url, category_id, base_unit,
            cost_price, selling_price, current_stock, min_stock,
            default_supplier_id, notes, is_active, is_featured, featured_order,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.products) {
          stmt.run(
            r.id, r.code, r.barcode, r.name, r.image_url, r.category_id, r.base_unit,
            r.cost_price, r.selling_price, r.current_stock, r.min_stock,
            r.default_supplier_id, r.notes, r.is_active !== undefined ? r.is_active : 1,
            r.is_featured || 0, r.featured_order || 0,
            r.created_at || new Date().toISOString(), r.updated_at || new Date().toISOString()
          );
        }
      }

      // 5. Product Units
      if (Array.isArray(backup.product_units)) {
        const stmt = db.prepare(`
          INSERT INTO product_units (id, product_id, unit_name, conversion_factor, selling_price, barcode, is_base, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.product_units) {
          stmt.run(r.id, r.product_id, r.unit_name, r.conversion_factor, r.selling_price, r.barcode, r.is_base || 0, r.created_at || new Date().toISOString());
        }
      }

      // 6. Sales receipts & items
      if (Array.isArray(backup.sales_receipts)) {
        const stmt = db.prepare(`
          INSERT INTO sales_receipts (
            id, receipt_code, created_at, total_items, subtotal_amount,
            discount_amount, final_amount, customer_paid, change_amount,
            payment_method, notes, status, cancelled_reason, cancelled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.sales_receipts) {
          stmt.run(
            r.id, r.receipt_code, r.created_at, r.total_items, r.subtotal_amount,
            r.discount_amount || 0, r.final_amount, r.customer_paid, r.change_amount || 0,
            r.payment_method || 'cash', r.notes, r.status || 'completed',
            r.cancelled_reason, r.cancelled_at
          );
        }
      }

      if (Array.isArray(backup.sales_receipt_items)) {
        const stmt = db.prepare(`
          INSERT INTO sales_receipt_items (
            id, receipt_id, product_id, product_name, product_code,
            unit_name, conversion_factor, quantity, base_quantity,
            unit_price, cost_price, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.sales_receipt_items) {
          stmt.run(
            r.id, r.receipt_id, r.product_id, r.product_name, r.product_code,
            r.unit_name, r.conversion_factor || 1, r.quantity, r.base_quantity || r.quantity,
            r.unit_price, r.cost_price || 0, r.subtotal
          );
        }
      }

      // 7. Purchase receipts & items
      if (Array.isArray(backup.purchase_receipts)) {
        const stmt = db.prepare(`
          INSERT INTO purchase_receipts (
            id, receipt_code, created_at, supplier_id, total_amount,
            paid_amount, debt_amount, status, notes, cancelled_reason, cancelled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.purchase_receipts) {
          stmt.run(
            r.id, r.receipt_code, r.created_at, r.supplier_id, r.total_amount,
            r.paid_amount || 0, r.debt_amount || 0, r.status || 'completed',
            r.notes, r.cancelled_reason, r.cancelled_at
          );
        }
      }

      if (Array.isArray(backup.purchase_receipt_items)) {
        const stmt = db.prepare(`
          INSERT INTO purchase_receipt_items (
            id, receipt_id, product_id, product_name, unit_name,
            conversion_factor, quantity, base_quantity, cost_price, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.purchase_receipt_items) {
          stmt.run(
            r.id, r.receipt_id, r.product_id, r.product_name, r.unit_name,
            r.conversion_factor || 1, r.quantity, r.base_quantity || r.quantity,
            r.cost_price, r.subtotal
          );
        }
      }

      // 8. Inventory logs
      if (Array.isArray(backup.inventory_transactions)) {
        const stmt = db.prepare(`
          INSERT INTO inventory_transactions (
            id, product_id, transaction_type, reference_id, reference_code,
            quantity_change, stock_before, stock_after, unit_cost, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.inventory_transactions) {
          stmt.run(
            r.id, r.product_id, r.transaction_type, r.reference_id, r.reference_code,
            r.quantity_change, r.stock_before, r.stock_after, r.unit_cost || 0,
            r.notes, r.created_at || new Date().toISOString()
          );
        }
      }

      if (Array.isArray(backup.inventory_adjustments)) {
        const stmt = db.prepare(`
          INSERT INTO inventory_adjustments (
            id, adjustment_code, created_at, product_id, old_stock,
            new_stock, difference, reason, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of backup.inventory_adjustments) {
          stmt.run(
            r.id, r.adjustment_code, r.created_at, r.product_id, r.old_stock,
            r.new_stock, r.difference, r.reason, r.notes
          );
        }
      }

      db.exec('COMMIT');

      res.json({
        success: true,
        message: 'Khôi phục toàn bộ cơ sở dữ liệu thành công!'
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export products to CSV (UTF-8 BOM for Excel)
router.get('/export-products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id ASC
    `).all();

    // CSV header with UTF-8 BOM (\uFEFF)
    let csv = '\uFEFFMã hàng,Mã vạch,Tên sản phẩm,Danh mục,Đơn vị tính,Giá nhập,Giá bán,Tồn kho,Mức tồn tối thiểu,Ghi chú\n';

    for (const p of products) {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };
      csv += [
        escape(p.code),
        escape(p.barcode || ''),
        escape(p.name),
        escape(p.category_name || ''),
        escape(p.base_unit),
        p.cost_price || 0,
        p.selling_price || 0,
        p.current_stock || 0,
        p.min_stock || 5,
        escape(p.notes || '')
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="DanhSachSanPham_TapHoaMaiCua.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import products from CSV content
router.post('/import-products', (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || !csvData.trim()) {
      return res.status(400).json({ success: false, message: 'Dữ liệu CSV rỗng' });
    }

    // Clean BOM if present
    const cleanCsv = csvData.replace(/^\uFEFF/, '');
    const lines = cleanCsv.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length <= 1) {
      return res.status(400).json({ success: false, message: 'File CSV không có dòng dữ liệu sản phẩm' });
    }

    // Parse CSV line helper handling quotes
    function parseCsvLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    // Skip header line
    const dataLines = lines.slice(1);
    let importedCount = 0;
    const errors = [];

    db.exec('BEGIN TRANSACTION');
    try {
      const insertCategoryStmt = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
      const getCategoryStmt = db.prepare('SELECT id FROM categories WHERE name = ?');
      const insertProductStmt = db.prepare(`
        INSERT INTO products (
          code, barcode, name, category_id, base_unit,
          cost_price, selling_price, current_stock, min_stock, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < dataLines.length; i++) {
        const cols = parseCsvLine(dataLines[i]);
        if (cols.length < 3) continue;

        let [code, barcode, name, categoryName, baseUnit, costPrice, sellingPrice, stock, minStock, notes] = cols;

        if (!name || !name.trim()) {
          errors.push(`Dòng ${i + 2}: Thiếu tên sản phẩm`);
          continue;
        }

        name = name.trim();
        baseUnit = (baseUnit && baseUnit.trim()) || 'cái';
        const cost = Math.max(0, parseFloat(costPrice) || 0);
        const price = Math.max(0, parseFloat(sellingPrice) || 0);
        const curStock = Math.max(0, parseFloat(stock) || 0);
        const minStk = Math.max(0, parseFloat(minStock) || 5);

        // Code auto-generation if not given or duplicated
        let prodCode = (code && code.trim()) ? code.trim() : null;
        if (!prodCode) {
          prodCode = 'SP' + String(Date.now()).slice(-4) + Math.floor(Math.random() * 100);
        } else {
          const exists = db.prepare('SELECT id FROM products WHERE code = ?').get(prodCode);
          if (exists) {
            prodCode = prodCode + '_' + Math.floor(Math.random() * 100);
          }
        }

        let prodBarcode = (barcode && barcode.trim()) ? barcode.trim() : null;
        if (prodBarcode) {
          const existsBarcode = db.prepare('SELECT id FROM products WHERE barcode = ?').get(prodBarcode);
          if (existsBarcode) {
            prodBarcode = null; // reset if duplicate to avoid crash
          }
        }

        let categoryId = null;
        if (categoryName && categoryName.trim()) {
          const catTrim = categoryName.trim();
          insertCategoryStmt.run(catTrim);
          const cat = getCategoryStmt.get(catTrim);
          if (cat) categoryId = cat.id;
        }

        const info = insertProductStmt.run(
          prodCode,
          prodBarcode,
          name,
          categoryId,
          baseUnit,
          cost,
          price,
          curStock,
          minStk,
          notes ? notes.trim() : null
        );

        if (curStock > 0) {
          db.prepare(`
            INSERT INTO inventory_transactions (
              product_id, transaction_type, reference_code,
              quantity_change, stock_before, stock_after, unit_cost, notes
            ) VALUES (?, 'INITIAL', 'CSV_IMPORT', ?, 0, ?, ?, 'Nhập dữ liệu ban đầu từ file CSV')
          `).run(info.lastInsertRowid, curStock, curStock, cost);
        }

        importedCount++;
      }

      db.exec('COMMIT');

      res.json({
        success: true,
        imported_count: importedCount,
        errors,
        message: `Đã nhập thành công ${importedCount} sản phẩm từ file CSV!`
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
