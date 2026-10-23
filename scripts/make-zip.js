const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const outputZipPath = path.join(__dirname, '..', 'taphoa-maicua-github-render.zip');
const output = fs.createWriteStream(outputZipPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', function () {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n============================================================`);
  console.log(`✓ ĐÃ ĐÓNG GÓI THÀNH CÔNG TỆP ZIP:`);
  console.log(`  --> ${outputZipPath}`);
  console.log(`  Dung lượng: ${sizeMB} MB (${archive.pointer()} bytes)`);
  console.log(`============================================================\n`);
});

archive.on('error', function (err) {
  throw err;
});

archive.pipe(output);

const rootDir = path.join(__dirname, '..');

// 1. Root files
const rootFiles = [
  'package.json',
  'render.yaml',
  'vercel.json',
  'README.md',
  '.gitignore',
  'start-4g.js',
  'CHAY_MAI_CUA_4G_5G.bat'
];

for (const f of rootFiles) {
  const filePath = path.join(rootDir, f);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: f });
  }
}

// 2. Server directory
archive.directory(path.join(rootDir, 'server'), 'server');

// 3. Client directory (excluding node_modules)
archive.directory(path.join(rootDir, 'client', 'src'), 'client/src');
archive.directory(path.join(rootDir, 'client', 'public'), 'client/public');
archive.directory(path.join(rootDir, 'client', 'dist'), 'client/dist');
archive.file(path.join(rootDir, 'client', 'package.json'), { name: 'client/package.json' });
archive.file(path.join(rootDir, 'client', 'vite.config.js'), { name: 'client/vite.config.js' });
archive.file(path.join(rootDir, 'client', 'index.html'), { name: 'client/index.html' });

// 4. Scripts directory
archive.directory(path.join(rootDir, 'scripts'), 'scripts');

// 5. Uploads placeholder
archive.file(path.join(rootDir, 'uploads', '.gitkeep'), { name: 'uploads/.gitkeep' });

archive.finalize();
