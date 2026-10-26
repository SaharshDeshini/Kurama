const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generateIconPNG(size) {
  const width = size;
  const height = size;

  // Raw pixel data: each row has 1 filter byte (0) + width * 4 (RGBA) bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = (x - cx) / (width * 0.45);
      const dy = (y - cy) / (height * 0.45);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background rounded container (#060A14 to #0A1224)
      let rBg = 6, gBg = 10, bBg = 20, aBg = 255;
      const cornerR = 0.22;
      const nx = Math.abs(x - cx) / (width * 0.5);
      const ny = Math.abs(y - cy) / (height * 0.5);

      let isInsideContainer = true;
      if (nx > (1 - cornerR) && ny > (1 - cornerR)) {
        const cdist = Math.hypot(nx - (1 - cornerR), ny - (1 - cornerR));
        if (cdist > cornerR) isInsideContainer = false;
      } else if (nx > 1 || ny > 1) {
        isInsideContainer = false;
      }

      if (!isInsideContainer) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Inside container: dark radiant navy
      const grad = Math.min(1, Math.max(0, (y / height)));
      rBg = Math.round(6 + grad * 8);
      gBg = Math.round(10 + grad * 14);
      bBg = Math.round(20 + grad * 25);

      // Flame shape logic
      // Normalize flame coords: (fx from -1 to 1, fy from -1 to 1)
      const fx = (x - cx) / (width * 0.24);
      const fy = (y - (cy + height * 0.05)) / (height * 0.30); // center slightly lower

      // Flame parametric envelope
      // Bottom is rounded, top tapers to a point with flame flicker
      let inFlame = false;
      let flameIntensity = 0;

      if (fy > -1.2 && fy < 1.0) {
        // Base width: wider near bottom (fy ~ 0.3)
        const baseW = Math.sqrt(Math.max(0, 1 - fy * fy * 0.7)) * 0.9;
        // Flame tip taper
        const taper = Math.max(0, 1 - ((fy + 1.2) / 2.2));
        // Wave/curl
        const wave = 0.12 * Math.sin(fy * 3.5);
        const w = Math.max(0.05, (1 - fy * 0.5) * 0.6 + wave * 0.3);

        const distFromAxis = Math.abs(fx - wave);
        if (distFromAxis < w && fy < 0.9) {
          inFlame = true;
          flameIntensity = 1 - (distFromAxis / w);
        }
      }

      // Inner flame core (bright cyan / white #38BDF8 / #FFFFFF)
      if (inFlame) {
        // Cyan #38BDF8 to Royal Blue #0284C7 to Gold/White core
        const coreFx = (x - cx) / (width * 0.12);
        const coreFy = (y - (cy + height * 0.10)) / (height * 0.20);
        const isCore = Math.hypot(coreFx, coreFy) < 0.6;

        if (isCore) {
          // White-cyan radiant core
          rawData[pxOffset] = 224;     // R
          rawData[pxOffset + 1] = 247; // G
          rawData[pxOffset + 2] = 255; // B
          rawData[pxOffset + 3] = 255; // A
        } else {
          // Vivid glowing Cyan #38BDF8
          const factor = Math.min(1, Math.max(0, flameIntensity));
          rawData[pxOffset] = Math.round(56 * factor + rBg * (1 - factor));
          rawData[pxOffset + 1] = Math.round(189 * factor + gBg * (1 - factor));
          rawData[pxOffset + 2] = Math.round(248 * factor + bBg * (1 - factor));
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Background with subtle outer cyan glow
        const glowDist = Math.hypot(fx, fy);
        if (glowDist < 1.8) {
          const glow = Math.pow(Math.max(0, (1.8 - glowDist) / 1.8), 2) * 0.35;
          rawData[pxOffset] = Math.round(rBg * (1 - glow) + 56 * glow);
          rawData[pxOffset + 1] = Math.round(gBg * (1 - glow) + 189 * glow);
          rawData[pxOffset + 2] = Math.round(bBg * (1 - glow) + 248 * glow);
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = rBg;
          rawData[pxOffset + 1] = gBg;
          rawData[pxOffset + 2] = bBg;
          rawData[pxOffset + 3] = aBg;
        }
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon-192.png'), generateIconPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), generateIconPNG(512));
fs.writeFileSync(path.join(outDir, 'icon-maskable-192.png'), generateIconPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), generateIconPNG(512));
fs.writeFileSync(path.resolve(__dirname, '../public/apple-touch-icon.png'), generateIconPNG(180));
console.log('Successfully generated PWA PNG icons!');
