import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const fullLogoPath = path.join(root, 'docs/design/logo-taskflow.png');
const wordmarkPath = path.join(root, 'docs/design/logo-taskflow-titulo.png');
const imagesDir = path.join(root, 'public/images');
const publicDir = path.join(root, 'public');

// CSS pixel boxes from the prototype screenshots, which are about 1 image pixel per CSS pixel.
// login-light.png: the "TaskFlow" title ink is 22px tall. The full logo is scaled so its wordmark matches.
// dashboard-1-light.png: the sidebar wordmark ink is 14px tall. Width follows the logo's own aspect ratio.
// The mobile symbol is 32px tall, the auth glyph size (w-8) in taskflow_dashboard.tsx.
const FULL_LOGO = { width: 126, height: 85 };
const WORDMARK = { width: 80, height: 14 };
const SYMBOL = { width: 72, height: 32 };
const FAVICON_SIZES = [16, 32, 48];
const FAVICON_PADDING_RATIO = 0.08;
const INK_ALPHA = 16;

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * @param {Buffer} data
 * @param {number} width
 * @param {number} height
 * @param {number} channels
 */
function measureInk(data, width, height, channels) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  const rowHasInk = new Array(height).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha <= INK_ALPHA) {
        continue;
      }
      rowHasInk[y] = true;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0) {
    throw new Error('Logo has no visible pixels.');
  }

  return { left, top, right, bottom, rowHasInk };
}

/**
 * @param {string} file
 */
async function readRgba(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/**
 * @param {{ left: number, top: number, right: number, bottom: number, rowHasInk: boolean[] }} ink
 */
function symbolBox(ink) {
  let gapStart = -1;
  let gapLength = 0;
  let y = ink.top;

  while (y <= ink.bottom) {
    if (ink.rowHasInk[y]) {
      y += 1;
      continue;
    }
    const start = y;
    while (y <= ink.bottom && !ink.rowHasInk[y]) {
      y += 1;
    }
    const length = y - start;
    if (length > gapLength) {
      gapStart = start;
      gapLength = length;
    }
  }

  if (gapStart < 0 || gapLength < 8) {
    throw new Error('Could not find the gap between the symbol and the wordmark in the full logo.');
  }

  return {
    left: ink.left,
    top: ink.top,
    width: ink.right - ink.left + 1,
    height: gapStart - ink.top,
  };
}

/**
 * @param {string} file
 */
async function trimmedPng(file) {
  const image = await readRgba(file);
  const ink = measureInk(image.data, image.width, image.height, image.channels);
  return sharp(file)
    .extract({
      left: ink.left,
      top: ink.top,
      width: ink.right - ink.left + 1,
      height: ink.bottom - ink.top + 1,
    })
    .png()
    .toBuffer();
}

/**
 * @param {string} file
 */
async function symbolPng(file) {
  const image = await readRgba(file);
  const ink = measureInk(image.data, image.width, image.height, image.channels);
  return sharp(file).extract(symbolBox(ink)).png().toBuffer();
}

/**
 * @param {Buffer} source
 * @param {number} width
 * @param {number} height
 */
function resize(source, width, height) {
  return sharp(source).resize(width, height, {
    fit: 'contain',
    background: transparent,
  });
}

/**
 * @param {Buffer} source
 * @param {{ width: number, height: number }} size
 * @param {string} baseName
 */
async function writeScaledPair(source, size, baseName) {
  for (const scale of [1, 2]) {
    const suffix = scale === 1 ? '' : '@2x';
    const width = size.width * scale;
    const height = size.height * scale;
    const image = resize(source, width, height);
    await image
      .clone()
      .png({ compressionLevel: 9 })
      .toFile(path.join(imagesDir, `${baseName}${suffix}.png`));
    await image
      .clone()
      .webp({ lossless: true })
      .toFile(path.join(imagesDir, `${baseName}${suffix}.webp`));
    console.log(`${baseName}${suffix} ${width}x${height}`);
  }
}

/**
 * @param {Buffer} symbol
 * @param {number} size
 */
async function squareIcon(symbol, size) {
  const padding = Math.max(1, Math.round(size * FAVICON_PADDING_RATIO));
  const inner = size - padding * 2;
  const fitted = await resize(symbol, inner, inner).png().toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent,
    },
  })
    .composite([{ input: fitted, gravity: 'centre' }])
    .png()
    .toBuffer();
}

/**
 * @param {{ size: number, png: Buffer }[]} icons
 */
function toIco(icons) {
  const headerLength = 6 + icons.length * 16;
  const bodyLength = icons.reduce((sum, icon) => sum + icon.png.length, 0);
  const file = Buffer.alloc(headerLength + bodyLength);
  file.writeUInt16LE(0, 0);
  file.writeUInt16LE(1, 2);
  file.writeUInt16LE(icons.length, 4);

  let offset = headerLength;
  icons.forEach((icon, index) => {
    const entry = 6 + index * 16;
    const dimension = icon.size >= 256 ? 0 : icon.size;
    file.writeUInt8(dimension, entry);
    file.writeUInt8(dimension, entry + 1);
    file.writeUInt16LE(1, entry + 4);
    file.writeUInt16LE(32, entry + 6);
    file.writeUInt32LE(icon.png.length, entry + 8);
    file.writeUInt32LE(offset, entry + 12);
    icon.png.copy(file, offset);
    offset += icon.png.length;
  });

  return file;
}

const fullLogo = await trimmedPng(fullLogoPath);
const wordmark = await trimmedPng(wordmarkPath);
const symbol = await symbolPng(fullLogoPath);

await mkdir(imagesDir, { recursive: true });
await writeScaledPair(fullLogo, FULL_LOGO, 'logo');
await writeScaledPair(wordmark, WORDMARK, 'wordmark');
await writeScaledPair(symbol, SYMBOL, 'symbol');

const faviconPng = await squareIcon(symbol, 32);
await writeFile(path.join(publicDir, 'favicon.png'), faviconPng);

const ico = toIco(
  await Promise.all(
    FAVICON_SIZES.map(async (size) => ({
      size,
      png: await squareIcon(symbol, size),
    })),
  ),
);
await writeFile(path.join(publicDir, 'favicon.ico'), ico);
console.log(`favicon.ico ${FAVICON_SIZES.join(', ')} and favicon.png 32x32`);
