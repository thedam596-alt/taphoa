const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Get all suppliers with total purchase and debt summary
router.get('/', (req, res) => {
  try {
    const suppliers = db.prepare(`
      SELECT s.*, 
        COUNT(pr.id) as receipt_count,
        COALESCE(SUM(CASE WHEN pr.status != 'cancelled' THEN pr.total_amount ELSE 0 END), 0) as total_bought,
        COALESCE(SUM(CASE WHEN pr.status != 'cancelled' THEN pr.debt_amount ELSE 0 END), 0) as total_debt
      FROM suppliers s
      LEFT JOIN purchase_receipts pr ON pr.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create supplier
router.post('/', (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên nhà cung cấp không được để trống' });
    }

    const stmt = db.prepare('INSERT INTO suppliers (name, phone, address, notes) VALUES (?, ?, ?, ?)');
    const info = stmt.run(
      name.trim(),
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      notes ? notes.trim() : null
    );

    const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: created, message: 'Đã thêm nhà cung cấp thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update supplier
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên nhà cung cấp không được để trống' });
    }

    db.prepare('UPDATE suppliers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?').run(
      name.trim(),
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      notes ? notes.trim() : null,
      id
    );

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Đã cập nhật nhà cung cấp' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete supplier
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const used = db.prepare('SELECT COUNT(*) as count FROM purchase_receipts WHERE supplier_id = ?').get(id);
    if (used.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Nhà cung cấp này đã có lịch sử phiếu nhập hàng, không thể xóa để bảo toàn dữ liệu!'
      });
    }

    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    res.json({ success: true, message: 'Đã xóa nhà cung cấp' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
