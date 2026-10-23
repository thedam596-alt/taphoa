const express = require('express');
const { db } = require('../db');

const router = express.Router();

function generatePurchaseCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `PN${yy}${mm}${dd}`;

  const last = db.prepare(`
    SELECT receipt_code FROM purchase_receipts 
    WHERE receipt_code LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}-%`);

  if (!last || !last.receipt_code) {
    return `${prefix}-0001`;
  }

  const parts = last.receipt_code.split('-');
  const seq = parseInt(parts[1], 10) || 0;
  return `${prefix}-${String(seq + 1).padStart(4, '0')}`;
}

// Create purchase receipt / Nhập kho
router.post('/', (req, res) => {
  try {
    const {
      supplier_id,
      items, // [{ product_id, unit_name, conversion_factor, quantity, cost_price }]
      paid_amount = 0,
      notes = ''
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách sản phẩm nhập không được để trống' });
    }

    const costMethodSetting = db.prepare('SELECT value FROM store_settings WHERE key = ?').get('cost_method');
    const costMethod = costMethodSetting ? costMethodSetting.value : 'latest';

    db.exec('BEGIN TRANSACTION');
    try {
      let totalAmount = 0;
      const validatedItems = [];

      for (const item of items) {
        const qty = Number(item.quantity);
        const cost = Number(item.cost_price);
        if (isNaN(qty) || qty <= 0) {
          throw new Error('Số lượng nhập phải lớn hơn 0');
        }
        if (isNaN(cost) || cost < 0) {
          throw new Error('Giá nhập không được âm');
        }

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) {
          throw new Error(`Sản phẩm #${item.product_id} không tồn tại`);
        }

        const factor = Math.max(0.0001, Number(item.conversion_factor) || 1);
        const unitName = (item.unit_name && item.unit_name.trim()) || product.base_unit;
        const lineTotal = Math.round(qty * cost);
        const baseQty = qty * factor;
        const baseUnitCost = Math.round(cost / factor);

        totalAmount += lineTotal;

        validatedItems.push({
          product,
          unitName,
          conversionFactor: factor,
          quantity: qty,
          baseQuantity: baseQty,
          costPrice: cost,
          baseUnitCost,
          lineTotal
        });
      }

      const paid = Math.max(0, Number(paid_amount) || 0);
      const debt = Math.max(0, totalAmount - paid);
      const receiptCode = generatePurchaseCode();
      const supId = supplier_id ? Number(supplier_id) : null;

      // Insert purchase receipt
      const receiptInfo = db.prepare(`
        INSERT INTO purchase_receipts (
          receipt_code, created_at, supplier_id, total_amount,
          paid_amount, debt_amount, status, notes
        ) VALUES (?, datetime('now', 'localtime'), ?, ?, ?, ?, 'completed', ?)
      `).run(receiptCode, supId, totalAmount, paid, debt, notes ? notes.trim() : null);

      const receiptId = Number(receiptInfo.lastInsertRowid);

      const insertItemStmt = db.prepare(`
        INSERT INTO purchase_receipt_items (
          receipt_id, product_id, product_name, unit_name,
          conversion_factor, quantity, base_quantity, cost_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateProductStmt = db.prepare(`
        UPDATE products 
        SET current_stock = current_stock + ?,
            cost_price = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      const insertInvTransStmt = db.prepare(`
        INSERT INTO inventory_transactions (
          product_id, transaction_type, reference_id, reference_code,
          quantity_change, stock_before, stock_after, unit_cost, notes
        ) VALUES (?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vi of validatedItems) {
        insertItemStmt.run(
          receiptId,
          vi.product.id,
          vi.product.name,
          vi.unitName,
          vi.conversionFactor,
          vi.quantity,
          vi.baseQuantity,
          vi.costPrice,
          vi.lineTotal
        );

        const stockBefore = vi.product.current_stock;
        const stockAfter = stockBefore + vi.baseQuantity;

        // Calculate new cost
        let newCostPrice = vi.baseUnitCost;
        if (costMethod === 'weighted_average' && stockBefore > 0) {
          const totalVal = (stockBefore * vi.product.cost_price) + (vi.baseQuantity * vi.baseUnitCost);
          newCostPrice = Math.round(totalVal / stockAfter);
        }

        updateProductStmt.run(vi.baseQuantity, newCostPrice, vi.product.id);

        insertInvTransStmt.run(
          vi.product.id,
          receiptId,
          receiptCode,
          vi.baseQuantity,
          stockBefore,
          stockAfter,
          vi.baseUnitCost,
          `Nhập hàng theo phiếu ${receiptCode}`
        );
      }

      db.exec('COMMIT');

      const created = db.prepare(`
        SELECT pr.*, s.name as supplier_name, s.phone as supplier_phone
        FROM purchase_receipts pr
        LEFT JOIN suppliers s ON s.id = pr.supplier_id
        WHERE pr.id = ?
      `).get(receiptId);
      created.items = db.prepare('SELECT * FROM purchase_receipt_items WHERE receipt_id = ?').all(receiptId);

      res.status(201).json({
        success: true,
        data: created,
        message: 'Tạo phiếu nhập và tăng tồn kho thành công'
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all purchase receipts
router.get('/', (req, res) => {
  try {
    const { from_date, to_date, supplier_id, search, limit = 100 } = req.query;

    let query = `
      SELECT pr.*, s.name as supplier_name, s.phone as supplier_phone
      FROM purchase_receipts pr
      LEFT JOIN suppliers s ON s.id = pr.supplier_id
      WHERE 1=1
    `;
    const params = [];

    if (from_date) {
      query += ` AND date(pr.created_at) >= date(?)`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND date(pr.created_at) <= date(?)`;
      params.push(to_date);
    }
    if (supplier_id) {
      query += ` AND pr.supplier_id = ?`;
      params.push(Number(supplier_id));
    }
    if (search && search.trim()) {
      query += ` AND pr.receipt_code LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY pr.id DESC LIMIT ?`;
    params.push(Number(limit));

    const receipts = db.prepare(query).all(...params);
    res.json({ success: true, data: receipts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single purchase receipt detail
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const receipt = db.prepare(`
      SELECT pr.*, s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address
      FROM purchase_receipts pr
      LEFT JOIN suppliers s ON s.id = pr.supplier_id
      WHERE pr.id = ? OR pr.receipt_code = ?
    `).get(id, id);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
    }

    receipt.items = db.prepare('SELECT * FROM purchase_receipt_items WHERE receipt_id = ?').all(receipt.id);
    res.json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel purchase receipt
router.post('/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Hủy phiếu nhập sai' } = req.body;

    const receipt = db.prepare('SELECT * FROM purchase_receipts WHERE id = ?').get(id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu nhập' });
    }
    if (receipt.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Phiếu nhập này đã được hủy trước đó!' });
    }

    const items = db.prepare('SELECT * FROM purchase_receipt_items WHERE receipt_id = ?').all(id);

    db.exec('BEGIN TRANSACTION');
    try {
      const deductStockStmt = db.prepare(`
        UPDATE products 
        SET current_stock = current_stock - ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      const insertInvTransStmt = db.prepare(`
        INSERT INTO inventory_transactions (
          product_id, transaction_type, reference_id, reference_code,
          quantity_change, stock_before, stock_after, unit_cost, notes
        ) VALUES (?, 'PURCHASE_CANCEL', ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const prod = db.prepare('SELECT current_stock, cost_price FROM products WHERE id = ?').get(item.product_id);
        if (prod) {
          const stockBefore = prod.current_stock;
          const stockAfter = stockBefore - item.base_quantity;

          deductStockStmt.run(item.base_quantity, item.product_id);

          insertInvTransStmt.run(
            item.product_id,
            receipt.id,
            receipt.receipt_code,
            -item.base_quantity,
            stockBefore,
            stockAfter,
            item.cost_price,
            `Hủy phiếu nhập ${receipt.receipt_code}: ${reason}`
          );
        }
      }

      db.prepare(`
        UPDATE purchase_receipts 
        SET status = 'cancelled', cancelled_reason = ?, cancelled_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(reason, id);

      db.exec('COMMIT');

      const updated = db.prepare('SELECT * FROM purchase_receipts WHERE id = ?').get(id);
      updated.items = items;

      res.json({
        success: true,
        data: updated,
        message: `Đã hủy phiếu nhập ${receipt.receipt_code} và trừ lại tồn kho thành công`
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
