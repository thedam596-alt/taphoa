const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { uploadsDir } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static directory for uploaded images
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TẠP HÓA MAI CUA',
    time: new Date().toISOString()
  });
});

// Serve frontend in production or if client/dist exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// SPA catch-all (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    const indexHtml = path.join(clientDistPath, 'index.html');
    return res.sendFile(indexHtml, (err) => {
      if (err) {
        res.status(200).send('Đang khởi chạy TẠP HÓA MAI CUA...');
      }
    });
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Đã xảy ra lỗi máy chủ nội bộ'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`  TẠP HÓA MAI CUA - HỆ THỐNG QUẢN LÝ BÁN HÀNG   `);
  console.log(`=================================================`);
  console.log(`* Máy chủ nội bộ:  http://localhost:${PORT}`);
  
  // Show LAN IPs for phone access
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`* Truy cập điện thoại / mạng LAN (${name}): http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log(`=================================================`);
});

module.exports = { app, server };
