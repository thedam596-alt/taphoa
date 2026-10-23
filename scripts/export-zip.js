const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const tempDir = path.join(root, 'temp_export');
const zipOutput = path.join(root, 'taphoa-maicua-render-github.zip');

// Clean temp directory
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
if (fs.existsSync(zipOutput)) {
  fs.rmSync(zipOutput, { force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('>> Đang tổng hợp các tệp mã nguồn sạch (không kèm node_modules)...');

// 1. Copy root files
const rootFiles = [
  'package.json',
  'render.yaml',
  'vercel.json',
  'README.md',
  '.gitignore',
  'start-4g.js',
  'CHAY_MAI_CUA_4G_5G.bat'
];
for (const file of rootFiles) {
  const p = path.join(root, file);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(tempDir, file));
  }
}

// 2. Copy directories
copyDir(path.join(root, 'server'), path.join(tempDir, 'server'));
copyDir(path.join(root, 'scripts'), path.join(tempDir, 'scripts'));
copyDir(path.join(root, 'uploads'), path.join(tempDir, 'uploads'));

// 3. Copy client (excluding node_modules)
fs.mkdirSync(path.join(tempDir, 'client'), { recursive: true });
copyDir(path.join(root, 'client', 'src'), path.join(tempDir, 'client', 'src'));
copyDir(path.join(root, 'client', 'public'), path.join(tempDir, 'client', 'public'));
copyDir(path.join(root, 'client', 'dist'), path.join(tempDir, 'client', 'dist'));

const clientFiles = ['package.json', 'vite.config.js', 'index.html'];
for (const f of clientFiles) {
  const cp = path.join(root, 'client', f);
  if (fs.existsSync(cp)) {
    fs.copyFileSync(cp, path.join(tempDir, 'client', f));
  }
}

console.log('>> Đang nén thành tệp ZIP chuẩn...');
// Compress with PowerShell
execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipOutput}' -Force"`);

// Clean up temp
fs.rmSync(tempDir, { recursive: true, force: true });

const stat = fs.statSync(zipOutput);
const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

console.log(`\n============================================================`);
console.log(`✓ TỆP ZIP ĐÃ SẴN SÀNG:`);
console.log(`  Đường dẫn: ${zipOutput}`);
console.log(`  Dung lượng: ${sizeMB} MB`);
console.log(`============================================================\n`);
