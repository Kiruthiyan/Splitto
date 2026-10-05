const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SYMBOL_SRC = 'C:/Users/kirut/.gemini/antigravity-ide/brain/28bf4d11-b931-469c-b76c-354a40a10790/.user_uploaded/media_1791209358208.png';
const FULL_LOGO_SRC = 'C:/Users/kirut/.gemini/antigravity-ide/brain/28bf4d11-b931-469c-b76c-354a40a10790/.user_uploaded/media_1791209367095.png';

const PUBLIC_DIR = path.resolve('e:/money/public');

async function processAssets() {
  console.log('Processing Splitto brand assets...');

  // 1. Process Full Logo (trim transparent margins)
  const fullLogoTrimmed = await sharp(FULL_LOGO_SRC)
    .trim()
    .toBuffer();

  const fullMeta = await sharp(fullLogoTrimmed).metadata();
  console.log(`Full Logo trimmed dimensions: ${fullMeta.width}x${fullMeta.height}`);

  // Save trimmed full logo
  await sharp(fullLogoTrimmed)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'splitto-logo.png'));
  console.log('Saved public/splitto-logo.png');

  // Also save a compact 2x header optimized version (height ~ 72px)
  await sharp(fullLogoTrimmed)
    .resize({ height: 80, fit: 'inside' })
    .png({ quality: 100 })
    .toFile(path.join(PUBLIC_DIR, 'splitto-logo-header.png'));
  console.log('Saved public/splitto-logo-header.png');

  // 2. Process Symbol-Only Image (trim transparent borders)
  const symbolTrimmed = await sharp(SYMBOL_SRC)
    .trim()
    .toBuffer();

  const symMeta = await sharp(symbolTrimmed).metadata();
  console.log(`Symbol trimmed dimensions: ${symMeta.width}x${symMeta.height}`);

  // Helper to place symbol centered on a square canvas with padding
  async function createSquareIcon(size, paddingRatio, bg = { r: 0, g: 0, b: 0, alpha: 0 }) {
    const innerSize = Math.round(size * (1 - paddingRatio * 2));
    const resizedSymbol = await sharp(symbolTrimmed)
      .resize(innerSize, innerSize, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bg,
      },
    })
      .composite([{ input: resizedSymbol, gravity: 'center' }])
      .png();
  }

  // Favicons
  await (await createSquareIcon(16, 0.05)).toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  await (await createSquareIcon(32, 0.05)).toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  await (await createSquareIcon(48, 0.05)).toFile(path.join(PUBLIC_DIR, 'favicon.ico')); // PNG-based ico widely supported
  console.log('Saved favicons (16, 32, ico)');

  // 180x180 Apple Touch Icon (clean padding on white/transparent or subtle rounded corner)
  // Apple touch icon should preferably have white or background fill since iOS renders transparent areas black
  await (await createSquareIcon(180, 0.12, { r: 240, g: 249, b: 255, alpha: 1 })).toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Saved public/apple-touch-icon.png (180x180)');

  // PWA 192x192 (transparent)
  await (await createSquareIcon(192, 0.10)).toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  console.log('Saved public/pwa-192x192.png');

  // PWA 512x512 (transparent)
  await (await createSquareIcon(512, 0.10)).toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  console.log('Saved public/pwa-512x512.png');

  // PWA 512x512 Maskable (Opaque background #F0F9FF with safe zone padding ~20%)
  // Android maskable requires 20% safe zone margin and opaque background
  await (await createSquareIcon(512, 0.20, { r: 240, g: 249, b: 255, alpha: 1 })).toFile(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'));
  console.log('Saved public/pwa-maskable-512x512.png (maskable icon with opaque background)');

  // Also save a raw symbol png
  await sharp(symbolTrimmed)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'splitto-symbol.png'));
  console.log('Saved public/splitto-symbol.png');

  console.log('All brand assets successfully generated!');
}

processAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
