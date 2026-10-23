const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadsDir } = require('../db');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh!'));
    }
  }
});

// Upload image file
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy file tải lên' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: imageUrl, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Base64 upload support (e.g. from camera canvas)
router.post('/base64', express.json({ limit: '10mb' }), (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Dữ liệu ảnh base64 không hợp lệ' });
    }

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    let ext = '.jpg';
    let data = imageBase64;

    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? '.jpg' : `.${matches[1]}`;
      data = matches[2];
    }

    const buffer = Buffer.from(data, 'base64');
    const filename = `cam_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);
    res.json({ success: true, url: `/uploads/${filename}`, filename });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
