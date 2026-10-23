const { spawn } = require('child_process');
const path = require('path');
const cloudflared = require('cloudflared');
const qrcode = require('qrcode-terminal');
const { app, server } = require('./server/server');
const { db } = require('./server/db');

console.clear ? console.clear() : null;
console.log('================================================================');
console.log('     TẠP HÓA MAI CUA - KHỞI TẠO ĐƯỜNG TRUYỀN 4G/5G IPHONE       ');
console.log('================================================================');
console.log('>> Đang kết nối mạng Cloudflare HTTPS bảo mật cho iPhone...');

// Launch cloudflared tunnel
const tunnel = spawn(cloudflared.bin, ['tunnel', '--url', 'http://localhost:5000']);

let foundUrl = false;

tunnel.stderr.on('data', (data) => {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !foundUrl) {
    foundUrl = true;
    const publicUrl = match[0];

    // Save to database so client UI sees it
    try {
      db.prepare(`
        INSERT INTO store_settings (key, value) VALUES ('public_https_url', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(publicUrl);
    } catch (e) {}

    console.log('\n================================================================');
    console.log('  KẾT NỐI THÀNH CÔNG! ĐÃ CÓ LINK HTTPS DÙNG ĐƯỢC KHI BẬT 4G/5G  ');
    console.log('================================================================');
    console.log(`\n  ĐỊA CHỈ TRUY CẬP CHO IPHONE:`);
    console.log(`  --> \x1b[32m\x1b[1m${publicUrl}\x1b[0m\n`);
    console.log('  QUÉT MÃ QR DƯỚI ĐÂY BẰNG CAMERA IPHONE ĐỂ MỞ NGAY LẬP TỨC:');
    
    // Generate ASCII QR code in terminal
    qrcode.generate(publicUrl, { small: true });

    console.log('----------------------------------------------------------------');
    console.log('  HƯỚNG DẪN CÀI ĐẶT LÊN MÀN HÌNH CHÍNH IPHONE:');
    console.log('  1. Dùng iPhone (đang bật 4G hoặc 5G) quét mã QR ở trên.');
    console.log('  2. Safari mở ra, chạm vào biểu tượng "Chia sẻ" (ô vuông có mũi tên lên).');
    console.log('  3. Chọn "Thêm vào MH chính" (Add to Home Screen).');
    console.log('  4. Đặt tên "Mai Cua" rồi bấm "Thêm".');
    console.log('  5. Từ nay, mở ứng dụng trực tiếp từ màn hình chính iPhone!');
    console.log('  * Camera quét mã vạch và tải ảnh hoạt động 100% nhờ có HTTPS.');
    console.log('================================================================\n');
    console.log('  (Nhấn Ctrl + C trên bàn phím để dừng máy chủ)');
  }
});

tunnel.on('close', (code) => {
  console.log('Đường truyền Cloudflare đã đóng.');
});

process.on('SIGINT', () => {
  console.log('\nĐang tắt máy chủ...');
  tunnel.kill();
  server.close(() => {
    process.exit(0);
  });
});
