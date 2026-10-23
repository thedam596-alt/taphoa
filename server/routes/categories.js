const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Get all categories with product count
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create category
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(trimmedName);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Danh mục này đã tồn tại' });
    }

    const stmt = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const info = stmt.run(trimmedName, description ? description.trim() : null);

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: created, message: 'Đã thêm danh mục thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update category
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').get(trimmedName, id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên danh mục đã trùng với danh mục khác' });
    }

    db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(
      trimmedName,
      description ? description.trim() : null,
      id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Đã cập nhật danh mục' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete category
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
