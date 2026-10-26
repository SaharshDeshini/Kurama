const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const flamePath = 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z';

function buildSvg({ scale, tx, ty, strokeWidth = 0.85, rx = 120, isMaskable = false }) {
  const borderMarkup = !isMaskable
    ? `<rect width="506" height="506" x="3" y="3" rx="${rx - 2}" stroke="#1E293B" stroke-width="3" fill="none" opacity="0.65" />`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
  <defs>
    <!-- Dark deep obsidian / space navy radial background -->
    <radialGradient id="bgRadial" cx="50%" cy="46%" r="65%">
      <stop offset="0%" stop-color="#0D1E38" />
      <stop offset="60%" stop-color="#060C18" />
      <stop offset="100%" stop-color="#030712" />
    </radialGradient>

    <!-- Radiant sky-to-white vertical flame gradient -->
    <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0284C7" />
      <stop offset="52%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <!-- Ambient glow filter -->
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base Container -->
  <rect width="512" height="512" rx="${isMaskable ? 0 : rx}" fill="url(#bgRadial)" />
  ${borderMarkup}

  <!-- Ambient Radiant Sky-Blue Aura -->
  <circle cx="256" cy="272" r="140" fill="#38BDF8" opacity="0.16" filter="url(#softGlow)" />
  <circle cx="256" cy="285" r="95" fill="#0284C7" opacity="0.22" filter="url(#softGlow)" />

  <!-- The Exact Kurama Fire Symbol -->
  <g transform="translate(${tx}, ${ty}) scale(${scale})">
    <path
      d="${flamePath}"
      fill="url(#flameGrad)"
      stroke="#38BDF8"
      stroke-width="${strokeWidth}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>`;
}

async function generateAll() {
  const iconsDir = path.resolve(__dirname, '../public/icons');
  const publicDir = path.resolve(__dirname, '../public');

  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  // 1. Standard icon SVG (for desktop "any" PWA shortcuts)
  // Scale 16.5, centered at (256, 256)
  const standardSvg = buildSvg({
    scale: 16.5,
    tx: 58,
    ty: 50,
    strokeWidth: 0.85,
    rx: 120,
    isMaskable: false
  });

  // 2. Maskable icon SVG (guarantees flame is within safe 80% circle for Android circular/squircle crops)
  // Scale 13.0, centered at (256, 256)
  const maskableSvg = buildSvg({
    scale: 13.0,
    tx: 100,
    ty: 93.5,
    strokeWidth: 0.95,
    rx: 0,
    isMaskable: true
  });

  // Save icon.svg
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), standardSvg, 'utf8');
  console.log('✓ Wrote public/icons/icon.svg');

  // Convert to high-res PNG buffers using Sharp
  const stdBuf = Buffer.from(standardSvg);
  const maskBuf = Buffer.from(maskableSvg);

  // icon-512.png
  await sharp(stdBuf)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ Generated public/icons/icon-512.png');

  // icon-192.png
  await sharp(stdBuf)
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ Generated public/icons/icon-192.png');

  // icon-maskable-512.png
  await sharp(maskBuf)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('✓ Generated public/icons/icon-maskable-512.png');

  // icon-maskable-192.png
  await sharp(maskBuf)
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-maskable-192.png'));
  console.log('✓ Generated public/icons/icon-maskable-192.png');

  // apple-touch-icon.png (180x180, uses maskable full-bleed so iOS rounded corners clip cleanly)
  await sharp(maskBuf)
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Generated public/apple-touch-icon.png');

  console.log('All PWA icon assets generated successfully with the exact fire symbol!');
}

generateAll().catch(err => {
  console.error('Failed to generate PWA icons:', err);
  process.exit(1);
});
