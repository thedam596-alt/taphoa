const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Helper to generate receipt code: HD + YYMMDD + -XXXX
function generateReceiptCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `HD${yy}${mm}${dd}`;

  const last = db.prepare(`
    SELECT receipt_code FROM sales_receipts 
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

// Complete checkout / Create sales receipt
router.post('/checkout', (req, res) => {
  try {
    const {
      items, // [{ product_id, quantity, unit_name, conversion_factor, unit_price }]
      discount_amount = 0,
      customer_paid = 0,
      payment_method = 'cash',
      notes = ''
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống! Vui lòng chọn sản phẩm.' });
    }

    // Check strict_stock setting
    const strictStockSetting = db.prepare('SELECT value FROM store_settings WHERE key = ?').get('strict_stock');
    const isStrictStock = strictStockSetting ? strictStockSetting.value === 'true' : true;

    // Start atomic transaction
    db.exec('BEGIN TRANSACTION');
    try {
      let subtotalAmount = 0;
      let totalItemsCount = 0;
      const validatedItems = [];

      for (const item of items) {
        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Số lượng mặt hàng không hợp lệ`);
        }

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) {
          throw new Error(`Sản phẩm mã #${item.product_id} không tồn tại`);
        }
        if (product.is_active === 0) {
          throw new Error(`Sản phẩm "${product.name}" đã ngừng kinh doanh`);
        }

        const conversionFactor = Math.max(0.0001, Number(item.conversion_factor) || 1);
        const unitName = (item.unit_name && item.unit_name.trim()) || product.base_unit;
        const unitPrice = Number(item.unit_price) >= 0 ? Number(item.unit_price) : product.selling_price;
        const lineTotal = Math.round(qty * unitPrice);
        const baseQty = qty * conversionFactor;

        // Stock validation if strict mode is ON
        if (isStrictStock && product.current_stock < baseQty) {
          throw new Error(
            `Sản phẩm "${product.name}" hiện chỉ còn ${product.current_stock} ${product.base_unit}, không đủ để bán ${qty} ${unitName} (${baseQty} ${product.base_unit})!`
          );
        }

        subtotalAmount += lineTotal;
        totalItemsCount += qty;

        validatedItems.push({
          product,
          unitName,
          conversionFactor,
          quantity: qty,
          baseQuantity: baseQty,
          unitPrice,
          costPrice: product.cost_price, // Snapshot cost price
          lineTotal
        });
      }

      const discount = Math.max(0, Math.min(subtotalAmount, Number(discount_amount) || 0));
      const finalAmount = Math.max(0, subtotalAmount - discount);
      const paid = Math.max(0, Number(customer_paid) || 0);
      const change = paid >= finalAmount ? paid - finalAmount : 0;

      const receiptCode = generateReceiptCode();

      // Insert sales receipt
      const insertReceiptStmt = db.prepare(`
        INSERT INTO sales_receipts (
          receipt_code, created_at, total_items, subtotal_amount,
          discount_amount, final_amount, customer_paid, change_amount,
          payment_method, notes, status
        ) VALUES (?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `);

      const receiptInfo = insertReceiptStmt.run(
        receiptCode,
        totalItemsCount,
        subtotalAmount,
        discount,
        finalAmount,
        paid,
        change,
        payment_method,
        notes ? notes.trim() : null
      );

      const receiptId = Number(receiptInfo.lastInsertRowid);

      // Insert receipt items & deduct stock & log inventory transaction
      const insertItemStmt = db.prepare(`
        INSERT INTO sales_receipt_items (
          receipt_id, product_id, product_name, product_code,
          unit_name, conversion_factor, quantity, base_quantity,
          unit_price, cost_price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE products 
        SET current_stock = current_stock - ?, updated_at = datetime('now', 'localtime') 
        WHERE id = ?
      `);

      const insertInvTransStmt = db.prepare(`
        INSERT INTO inventory_transactions (
          product_id, transaction_type, reference_id, reference_code,
          quantity_change, stock_before, stock_after, unit_cost, notes
        ) VALUES (?, 'SALE', ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vi of validatedItems) {
        // 1. Insert item
        insertItemStmt.run(
          receiptId,
          vi.product.id,
          vi.product.name,
          vi.product.code,
          vi.unitName,
          vi.conversionFactor,
          vi.quantity,
          vi.baseQuantity,
          vi.unitPrice,
          vi.costPrice,
          vi.lineTotal
        );

        // 2. Deduct stock
        const stockBefore = vi.product.current_stock;
        const stockAfter = stockBefore - vi.baseQuantity;
        updateStockStmt.run(vi.baseQuantity, vi.product.id);

        // 3. Log inventory movement
        insertInvTransStmt.run(
          vi.product.id,
          receiptId,
          receiptCode,
          -vi.baseQuantity,
          stockBefore,
          stockAfter,
          vi.costPrice,
          `Bán hàng theo hóa đơn ${receiptCode}`
        );
      }

      db.exec('COMMIT');

      // Fetch created receipt with items for immediate receipt preview / print
      const receipt = db.prepare('SELECT * FROM sales_receipts WHERE id = ?').get(receiptId);
      const itemsList = db.prepare('SELECT * FROM sales_receipt_items WHERE receipt_id = ?').all(receiptId);
      receipt.items = itemsList;

      res.status(201).json({
        success: true,
        data: receipt,
        message: 'Thanh toán thành công'
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get sales receipts history
router.get('/receipts', (req, res) => {
  try {
    const { from_date, to_date, search, status, limit = 100 } = req.query;

    let query = `SELECT * FROM sales_receipts WHERE 1=1`;
    const params = [];

    if (from_date) {
      query += ` AND date(created_at) >= date(?)`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND date(created_at) <= date(?)`;
      params.push(to_date);
    }
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    if (search && search.trim()) {
      query += ` AND receipt_code LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY id DESC LIMIT ?`;
    params.push(Number(limit));

    const receipts = db.prepare(query).all(...params);

    res.json({ success: true, data: receipts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single receipt detail
router.get('/receipts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const receipt = db.prepare('SELECT * FROM sales_receipts WHERE id = ? OR receipt_code = ?').get(id, id);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }

    const items = db.prepare('SELECT * FROM sales_receipt_items WHERE receipt_id = ?').all(receipt.id);
    receipt.items = items;

    res.json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel / Return receipt (hoàn trả hóa đơn, phục hồi tồn kho)
router.post('/receipts/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Khách trả hàng' } = req.body;

    const receipt = db.prepare('SELECT * FROM sales_receipts WHERE id = ?').get(id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }
    if (receipt.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Hóa đơn này đã được hủy trước đó!' });
    }

    const items = db.prepare('SELECT * FROM sales_receipt_items WHERE receipt_id = ?').all(id);

    db.exec('BEGIN TRANSACTION');
    try {
      // 1. Restore inventory for each item
      const restoreStockStmt = db.prepare(`
        UPDATE products 
        SET current_stock = current_stock + ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      const insertInvTransStmt = db.prepare(`
        INSERT INTO inventory_transactions (
          product_id, transaction_type, reference_id, reference_code,
          quantity_change, stock_before, stock_after, unit_cost, notes
        ) VALUES (?, 'SALE_CANCEL', ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const prod = db.prepare('SELECT current_stock, cost_price FROM products WHERE id = ?').get(item.product_id);
        if (prod) {
          const stockBefore = prod.current_stock;
          const stockAfter = stockBefore + item.base_quantity;

          restoreStockStmt.run(item.base_quantity, item.product_id);

          insertInvTransStmt.run(
            item.product_id,
            receipt.id,
            receipt.receipt_code,
            item.base_quantity,
            stockBefore,
            stockAfter,
            prod.cost_price,
            `Hủy hóa đơn ${receipt.receipt_code}: ${reason}`
          );
        }
      }

      // 2. Update receipt status
      db.prepare(`
        UPDATE sales_receipts 
        SET status = 'cancelled', cancelled_reason = ?, cancelled_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(reason, id);

      db.exec('COMMIT');

      const updated = db.prepare('SELECT * FROM sales_receipts WHERE id = ?').get(id);
      updated.items = items;

      res.json({
        success: true,
        data: updated,
        message: `Đã hủy hóa đơn ${receipt.receipt_code} và hoàn lại tồn kho thành công`
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
