const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Helper to generate next product code
function generateProductCode() {
  const last = db.prepare(`
    SELECT code FROM products 
    WHERE code LIKE 'SP%' 
    ORDER BY id DESC LIMIT 1
  `).get();

  if (!last || !last.code) {
    return 'SP0001';
  }

  const match = last.code.match(/^SP(\d+)$/);
  if (!match) {
    return 'SP' + String(Date.now()).slice(-4);
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return 'SP' + String(nextNum).padStart(4, '0');
}

// Get all products with units and category info
router.get('/', (req, res) => {
  try {
    const { search, category_id, is_active, sort, featured_only } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.default_supplier_id
      WHERE 1=1
    `;
    const params = [];

    if (is_active !== undefined && is_active !== '') {
      query += ` AND p.is_active = ?`;
      params.push(Number(is_active));
    }

    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(Number(category_id));
    }

    if (featured_only === 'true' || featured_only === '1') {
      query += ` AND p.is_featured = 1`;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ?)`;
      params.push(term, term, term);
    }

    // Sorting
    if (featured_only === 'true' || featured_only === '1') {
      query += ` ORDER BY p.featured_order ASC, p.id DESC`;
    } else if (sort === 'name_asc') {
      query += ` ORDER BY p.name ASC`;
    } else if (sort === 'name_desc') {
      query += ` ORDER BY p.name DESC`;
    } else if (sort === 'price_asc') {
      query += ` ORDER BY p.selling_price ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY p.selling_price DESC`;
    } else if (sort === 'stock_asc') {
      query += ` ORDER BY p.current_stock ASC`;
    } else if (sort === 'stock_desc') {
      query += ` ORDER BY p.current_stock DESC`;
    } else {
      query += ` ORDER BY p.id DESC`;
    }

    const products = db.prepare(query).all(...params);

    // Fetch units for each product
    const unitsStmt = db.prepare('SELECT * FROM product_units WHERE product_id = ? ORDER BY id ASC');
    const productsWithUnits = products.map(p => {
      const units = unitsStmt.all(p.id);
      return {
        ...p,
        units
      };
    });

    res.json({ success: true, data: productsWithUnits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lookup product by barcode or code (scanned via camera / barcode reader)
router.get('/by-barcode/:code', (req, res) => {
  try {
    const rawCode = req.params.code.trim();
    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'Mã không hợp lệ' });
    }

    // 1. Direct match on product barcode or code
    let product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE (p.barcode = ? OR p.code = ?) AND p.is_active = 1
    `).get(rawCode, rawCode);

    let matchedUnit = null;

    if (product) {
      const units = db.prepare('SELECT * FROM product_units WHERE product_id = ?').all(product.id);
      product.units = units;
      // Default to base unit
      matchedUnit = {
        unit_name: product.base_unit,
        conversion_factor: 1,
        selling_price: product.selling_price,
        is_base: 1
      };
      return res.json({ success: true, data: product, matchedUnit });
    }

    // 2. Check if barcode belongs to a specific conversion unit
    const unitMatch = db.prepare(`
      SELECT u.*, p.id as p_id
      FROM product_units u
      JOIN products p ON p.id = u.product_id
      WHERE u.barcode = ? AND p.is_active = 1
    `).get(rawCode);

    if (unitMatch) {
      product = db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
      `).get(unitMatch.p_id);

      const units = db.prepare('SELECT * FROM product_units WHERE product_id = ?').all(product.id);
      product.units = units;
      matchedUnit = {
        unit_name: unitMatch.unit_name,
        conversion_factor: unitMatch.conversion_factor,
        selling_price: unitMatch.selling_price,
        is_base: unitMatch.is_base
      };
      return res.json({ success: true, data: product, matchedUnit });
    }

    // Not found
    return res.status(404).json({
      success: false,
      message: `Chưa có sản phẩm nào mang mã "${rawCode}"`,
      code: rawCode
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get product detail by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.default_supplier_id
      WHERE p.id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const units = db.prepare('SELECT * FROM product_units WHERE product_id = ?').all(id);
    product.units = units;

    // Check transaction count
    const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales_receipt_items WHERE product_id = ?').get(id).count;
    const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM purchase_receipt_items WHERE product_id = ?').get(id).count;
    product.has_transactions = (salesCount + purchaseCount) > 0;

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create product
router.post('/', (req, res) => {
  try {
    const {
      name,
      code,
      barcode,
      image_url,
      category_id,
      base_unit,
      cost_price,
      selling_price,
      initial_stock,
      min_stock,
      default_supplier_id,
      notes,
      units, // Array of { unit_name, conversion_factor, selling_price, barcode }
      is_featured
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm không được để trống' });
    }
    if (!base_unit || !base_unit.trim()) {
      return res.status(400).json({ success: false, message: 'Đơn vị tính cơ sở không được để trống' });
    }

    const productCode = (code && code.trim()) ? code.trim() : generateProductCode();
    const productBarcode = (barcode && barcode.trim()) ? barcode.trim() : null;

    // Check duplicate code
    const existingCode = db.prepare('SELECT id FROM products WHERE code = ?').get(productCode);
    if (existingCode) {
      return res.status(400).json({ success: false, message: `Mã sản phẩm "${productCode}" đã tồn tại!` });
    }

    // Check duplicate barcode if provided
    if (productBarcode) {
      const existingBarcode = db.prepare('SELECT id, name FROM products WHERE barcode = ?').get(productBarcode);
      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: `Mã vạch "${productBarcode}" đã được dùng cho sản phẩm "${existingBarcode.name}"!`
        });
      }
      const existingUnitBarcode = db.prepare('SELECT product_id FROM product_units WHERE barcode = ?').get(productBarcode);
      if (existingUnitBarcode) {
        return res.status(400).json({
          success: false,
          message: `Mã vạch "${productBarcode}" đã được dùng cho một đơn vị quy đổi khác!`
        });
      }
    }

    const cost = Math.max(0, Number(cost_price) || 0);
    const price = Math.max(0, Number(selling_price) || 0);
    const stock = Math.max(0, Number(initial_stock) || 0);
    const minStock = Math.max(0, Number(min_stock) || 5);
    const catId = category_id ? Number(category_id) : null;
    const supId = default_supplier_id ? Number(default_supplier_id) : null;
    const featured = is_featured ? 1 : 0;

    // Execute atomic creation
    db.exec('BEGIN TRANSACTION');
    try {
      const insertProductStmt = db.prepare(`
        INSERT INTO products (
          code, barcode, name, image_url, category_id, base_unit,
          cost_price, selling_price, current_stock, min_stock,
          default_supplier_id, notes, is_featured, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);

      const info = insertProductStmt.run(
        productCode,
        productBarcode,
        name.trim(),
        image_url || null,
        catId,
        base_unit.trim(),
        cost,
        price,
        stock,
        minStock,
        supId,
        notes ? notes.trim() : null,
        featured
      );

      const productId = Number(info.lastInsertRowid);

      // Record initial inventory transaction if initial_stock > 0
      if (stock > 0) {
        db.prepare(`
          INSERT INTO inventory_transactions (
            product_id, transaction_type, reference_code,
            quantity_change, stock_before, stock_after, unit_cost, notes
          ) VALUES (?, 'INITIAL', 'TON_DAU', ?, 0, ?, ?, 'Tồn kho ban đầu khi tạo sản phẩm')
        `).run(productId, stock, stock, cost);
      }

      // Insert conversion units
      if (Array.isArray(units) && units.length > 0) {
        const insertUnitStmt = db.prepare(`
          INSERT INTO product_units (product_id, unit_name, conversion_factor, selling_price, barcode, is_base)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const u of units) {
          if (u.unit_name && u.unit_name.trim()) {
            const factor = Math.max(0.0001, Number(u.conversion_factor) || 1);
            const uPrice = Math.max(0, Number(u.selling_price) || 0);
            const uBarcode = (u.barcode && u.barcode.trim()) ? u.barcode.trim() : null;

            if (uBarcode) {
              const dupBarcode = db.prepare('SELECT id FROM products WHERE barcode = ?').get(uBarcode);
              const dupUnitBarcode = db.prepare('SELECT id FROM product_units WHERE barcode = ?').get(uBarcode);
              if (dupBarcode || dupUnitBarcode) {
                throw new Error(`Mã vạch quy đổi "${uBarcode}" bị trùng lặp!`);
              }
            }

            insertUnitStmt.run(
              productId,
              u.unit_name.trim(),
              factor,
              uPrice,
              uBarcode,
              0
            );
          }
        }
      }

      db.exec('COMMIT');

      const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      created.units = db.prepare('SELECT * FROM product_units WHERE product_id = ?').all(productId);

      res.status(201).json({
        success: true,
        data: created,
        message: 'Đã thêm sản phẩm thành công'
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update product
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      barcode,
      image_url,
      category_id,
      base_unit,
      cost_price,
      selling_price,
      min_stock,
      default_supplier_id,
      notes,
      units,
      is_featured,
      featured_order
    } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm không được để trống' });
    }

    const productCode = (code && code.trim()) ? code.trim() : existing.code;
    const productBarcode = (barcode && barcode.trim()) ? barcode.trim() : null;

    // Check duplicate code
    const dupCode = db.prepare('SELECT id FROM products WHERE code = ? AND id != ?').get(productCode, id);
    if (dupCode) {
      return res.status(400).json({ success: false, message: `Mã sản phẩm "${productCode}" đã bị trùng!` });
    }

    // Check duplicate barcode
    if (productBarcode) {
      const dupBarcode = db.prepare('SELECT id, name FROM products WHERE barcode = ? AND id != ?').get(productBarcode, id);
      if (dupBarcode) {
        return res.status(400).json({
          success: false,
          message: `Mã vạch "${productBarcode}" đã được dùng cho sản phẩm "${dupBarcode.name}"!`
        });
      }
      const dupUnitBarcode = db.prepare('SELECT id FROM product_units WHERE barcode = ? AND product_id != ?').get(productBarcode, id);
      if (dupUnitBarcode) {
        return res.status(400).json({
          success: false,
          message: `Mã vạch "${productBarcode}" đã được dùng cho một đơn vị quy đổi khác!`
        });
      }
    }

    const cost = cost_price !== undefined ? Math.max(0, Number(cost_price) || 0) : existing.cost_price;
    const price = selling_price !== undefined ? Math.max(0, Number(selling_price) || 0) : existing.selling_price;
    const minStock = min_stock !== undefined ? Math.max(0, Number(min_stock) || 0) : existing.min_stock;
    const catId = category_id !== undefined ? (category_id ? Number(category_id) : null) : existing.category_id;
    const supId = default_supplier_id !== undefined ? (default_supplier_id ? Number(default_supplier_id) : null) : existing.default_supplier_id;
    const feat = is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured;
    const featOrder = featured_order !== undefined ? Number(featured_order) : existing.featured_order;

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare(`
        UPDATE products SET
          name = ?,
          code = ?,
          barcode = ?,
          image_url = ?,
          category_id = ?,
          base_unit = ?,
          cost_price = ?,
          selling_price = ?,
          min_stock = ?,
          default_supplier_id = ?,
          notes = ?,
          is_featured = ?,
          featured_order = ?,
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        name.trim(),
        productCode,
        productBarcode,
        image_url !== undefined ? image_url : existing.image_url,
        catId,
        base_unit ? base_unit.trim() : existing.base_unit,
        cost,
        price,
        minStock,
        supId,
        notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
        feat,
        featOrder,
        id
      );

      // Replace units if provided
      if (Array.isArray(units)) {
        db.prepare('DELETE FROM product_units WHERE product_id = ?').run(id);
        const insertUnitStmt = db.prepare(`
          INSERT INTO product_units (product_id, unit_name, conversion_factor, selling_price, barcode, is_base)
          VALUES (?, ?, ?, ?, ?, 0)
        `);

        for (const u of units) {
          if (u.unit_name && u.unit_name.trim()) {
            const factor = Math.max(0.0001, Number(u.conversion_factor) || 1);
            const uPrice = Math.max(0, Number(u.selling_price) || 0);
            const uBarcode = (u.barcode && u.barcode.trim()) ? u.barcode.trim() : null;

            insertUnitStmt.run(
              id,
              u.unit_name.trim(),
              factor,
              uPrice,
              uBarcode
            );
          }
        }
      }

      db.exec('COMMIT');

      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      updated.units = db.prepare('SELECT * FROM product_units WHERE product_id = ?').all(id);

      res.json({ success: true, data: updated, message: 'Đã cập nhật sản phẩm' });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle active status (Đang bán / Ngừng kinh doanh)
router.put('/:id/toggle-active', (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT id, is_active, name FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const nextActive = product.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE products SET is_active = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(nextActive, id);

    res.json({
      success: true,
      data: { is_active: nextActive },
      message: nextActive === 1 ? `Đã kích hoạt bán lại sản phẩm "${product.name}"` : `Đã chuyển "${product.name}" sang trạng thái Ngừng kinh doanh`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle featured product (Sản phẩm bán chạy trang chủ)
router.put('/:id/toggle-featured', (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT id, is_featured, name FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const nextFeatured = product.is_featured === 1 ? 0 : 1;
    db.prepare('UPDATE products SET is_featured = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(nextFeatured, id);

    res.json({
      success: true,
      data: { is_featured: nextFeatured },
      message: nextFeatured === 1 ? `Đã thêm "${product.name}" vào danh sách bán chạy trang chủ` : `Đã bỏ "${product.name}" khỏi danh sách bán chạy trang chủ`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete product (Safely checks transaction history)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    // Check sales history
    const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales_receipt_items WHERE product_id = ?').get(id).count;
    // Check purchase history
    const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM purchase_receipt_items WHERE product_id = ?').get(id).count;

    if (salesCount > 0 || purchaseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Sản phẩm "${product.name}" đã phát sinh giao dịch (${salesCount} lần bán, ${purchaseCount} lần nhập). Để bảo toàn báo cáo và số liệu hóa đơn, bạn không thể xóa vĩnh viễn mà hãy chọn "Ngừng kinh doanh".`
      });
    }

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM inventory_transactions WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM product_units WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
      db.exec('COMMIT');

      res.json({ success: true, message: `Đã xóa vĩnh viễn sản phẩm "${product.name}" thành công` });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
