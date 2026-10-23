const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPNG(size, primaryColor = [21, 128, 61, 255]) {
  const width = size;
  const height = size;

  // Raw pixel data: each row starts with filter byte 0
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  const radius = size * 0.44;
  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rect check (Apple iOS style icon)
      let inside = true;
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);
      if (dx < cornerRadius && dy < cornerRadius) {
        const cornerDist = Math.hypot(cornerRadius - dx, cornerRadius - dy);
        if (cornerDist > cornerRadius) {
          inside = false;
        }
      }

      if (!inside) {
        // Transparent outside rounded icon
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Inside: Background gradient (Deep emerald green #15803d to #16a34a)
      const grad = y / height;
      let r = Math.round(21 + grad * 10);
      let g = Math.round(128 + grad * 35);
      let b = Math.round(61 + grad * 15);
      let a = 255;

      // Draw shopping basket shape in white
      // Basket body: trapezium from y: 0.38 to 0.76
      const by1 = size * 0.38;
      const by2 = size * 0.74;
      if (y >= by1 && y <= by2) {
        const prog = (y - by1) / (by2 - by1);
        const bxLeft = size * (0.20 + prog * 0.08);
        const bxRight = size * (0.80 - prog * 0.08);
        if (x >= bxLeft && x <= bxRight) {
          r = 255; g = 255; b = 255;
          // Basket vertical slats (green grooves)
          const slat1 = size * 0.38;
          const slat2 = size * 0.50;
          const slat3 = size * 0.62;
          const slatW = Math.max(2, size * 0.035);
          if (y > by1 + size * 0.12 && y < by2 - size * 0.08) {
            if (Math.abs(x - slat1) < slatW || Math.abs(x - slat2) < slatW || Math.abs(x - slat3) < slatW) {
              r = 21; g = 128; b = 61;
            }
          }
        }
      }

      // Basket handle: arc from y: 0.18 to 0.38
      const handleCy = size * 0.38;
      const handleRx = size * 0.22;
      const handleRy = size * 0.20;
      const handleThick = Math.max(3, size * 0.045);
      const hDist = Math.hypot((x - cx) / handleRx, (y - handleCy) / handleRy);
      if (y < handleCy && Math.abs(hDist - 1) < (handleThick / handleRx)) {
        r = 255; g = 255; b = 255;
      }

      // Golden coin / badge in top right
      const coinCx = size * 0.72;
      const coinCy = size * 0.28;
      const coinR = size * 0.11;
      const coinDist = Math.hypot(x - coinCx, y - coinCy);
      if (coinDist <= coinR) {
        r = 250; g = 204; b = 21; // Yellow gold
        if (coinDist > coinR - Math.max(1, size * 0.015)) {
          r = 234; g = 179; b = 8;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress with zlib
  const compressedData = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const publicDir = path.join(__dirname, '..', 'client', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate Apple Touch Icon (180x180)
const icon180 = createPNG(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), icon180);
console.log('✓ Created apple-touch-icon.png (180x180)');

// Generate PWA 192x192
const icon192 = createPNG(192);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
console.log('✓ Created pwa-192x192.png (192x192)');

// Generate PWA 512x512
const icon512 = createPNG(512);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
console.log('✓ Created pwa-512x512.png (512x512)');

// Copy to favicon.ico / png
fs.writeFileSync(path.join(publicDir, 'favicon.png'), icon192);
console.log('✓ All PWA and iOS Apple icons generated successfully!');
