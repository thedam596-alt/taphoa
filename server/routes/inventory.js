const express = require('express');
const { db } = require('../db');

const router = express.Router();

function generateAdjustmentCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `KK${yy}${mm}${dd}`;

  const last = db.prepare(`
    SELECT adjustment_code FROM inventory_adjustments 
    WHERE adjustment_code LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}-%`);

  if (!last || !last.adjustment_code) {
    return `${prefix}-0001`;
  }

  const parts = last.adjustment_code.split('-');
  const seq = parseInt(parts[1], 10) || 0;
  return `${prefix}-${String(seq + 1).padStart(4, '0')}`;
}

// Get inventory summary & list
router.get('/', (req, res) => {
  try {
    const { status, category_id, search } = req.query;

    let query = `
      SELECT p.*, c.name as category_name,
        ROUND(p.current_stock * p.cost_price, 2) as inventory_value,
        CASE 
          WHEN p.current_stock <= 0 THEN 'out_of_stock'
          WHEN p.current_stock <= p.min_stock THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(Number(category_id));
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (p.name LIKE ? OR p.code LIKE ? OR p.barcode LIKE ?)`;
      params.push(term, term, term);
    }

    if (status === 'out_of_stock') {
      query += ` AND p.current_stock <= 0`;
    } else if (status === 'low_stock') {
      query += ` AND p.current_stock > 0 AND p.current_stock <= p.min_stock`;
    } else if (status === 'in_stock') {
      query += ` AND p.current_stock > p.min_stock`;
    }

    query += ` ORDER BY p.current_stock ASC, p.id DESC`;

    const products = db.prepare(query).all(...params);

    // Calculate overview summary
    const summary = db.prepare(`
      SELECT 
        COUNT(id) as total_products,
        COALESCE(SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count,
        COALESCE(SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(CASE WHEN current_stock > min_stock THEN 1 ELSE 0 END), 0) as in_stock_count,
        COALESCE(SUM(current_stock * cost_price), 0) as total_inventory_value
      FROM products
      WHERE is_active = 1
    `).get();

    res.json({
      success: true,
      data: products,
      summary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Perform stock adjustment (Kiểm kê kho)
router.post('/adjust', (req, res) => {
  try {
    const { product_id, new_stock, reason, notes } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn sản phẩm cần điều chỉnh' });
    }
    if (new_stock === undefined || new_stock === null || isNaN(Number(new_stock)) || Number(new_stock) < 0) {
      return res.status(400).json({ success: false, message: 'Số lượng tồn kho thực tế phải >= 0' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn lý do kiểm kê/điều chỉnh' });
    }

    const targetStock = Number(new_stock);

    db.exec('BEGIN TRANSACTION');
    try {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }

      const oldStock = product.current_stock;
      const difference = targetStock - oldStock;

      if (difference === 0) {
        throw new Error('Số lượng mới trùng khớp với số lượng hiện tại trong hệ thống');
      }

      const adjustmentCode = generateAdjustmentCode();

      // Record adjustment
      const adjInfo = db.prepare(`
        INSERT INTO inventory_adjustments (
          adjustment_code, created_at, product_id, old_stock,
          new_stock, difference, reason, notes
        ) VALUES (?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?)
      `).run(
        adjustmentCode,
        product.id,
        oldStock,
        targetStock,
        difference,
        reason.trim(),
        notes ? notes.trim() : null
      );

      // Update product current stock
      db.prepare(`
        UPDATE products 
        SET current_stock = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(targetStock, product.id);

      // Record inventory transaction
      db.prepare(`
        INSERT INTO inventory_transactions (
          product_id, transaction_type, reference_id, reference_code,
          quantity_change, stock_before, stock_after, unit_cost, notes
        ) VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        product.id,
        adjInfo.lastInsertRowid,
        adjustmentCode,
        difference,
        oldStock,
        targetStock,
        product.cost_price,
        `Kiểm kê kho (${reason.trim()}): ${difference > 0 ? '+' : ''}${difference} ${product.base_unit}`
      );

      db.exec('COMMIT');

      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
      res.json({
        success: true,
        data: updated,
        adjustment_code: adjustmentCode,
        message: `Đã điều chỉnh tồn kho sản phẩm "${product.name}" từ ${oldStock} sang ${targetStock} ${product.base_unit}`
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get inventory transactions history (Audit trail)
router.get('/transactions', (req, res) => {
  try {
    const { product_id, type, from_date, to_date, limit = 100 } = req.query;

    let query = `
      SELECT it.*, p.name as product_name, p.code as product_code, p.base_unit
      FROM inventory_transactions it
      JOIN products p ON p.id = it.product_id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      query += ` AND it.product_id = ?`;
      params.push(Number(product_id));
    }
    if (type) {
      query += ` AND it.transaction_type = ?`;
      params.push(type);
    }
    if (from_date) {
      query += ` AND date(it.created_at) >= date(?)`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND date(it.created_at) <= date(?)`;
      params.push(to_date);
    }

    query += ` ORDER BY it.id DESC LIMIT ?`;
    params.push(Number(limit));

    const transactions = db.prepare(query).all(...params);
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
