const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    const body = Buffer.concat([typeBuf, data]);
    let c = -1;
    for (let i = 0; i < body.length; i++) {
      c = (c >>> 8) ^ table[(c ^ body[i]) & 0xff];
    }
    crc.writeInt32BE(-1 ^ c, 0);
    return Buffer.concat([len, body, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      raw[dstIdx] = rgbaBuffer[srcIdx];
      raw[dstIdx + 1] = rgbaBuffer[srcIdx + 1];
      raw[dstIdx + 2] = rgbaBuffer[srcIdx + 2];
      raw[dstIdx + 3] = rgbaBuffer[srcIdx + 3];
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Background color: GitHub dark #24292f (r: 36, g: 41, b: 47)
  // Border radius: ~18% of size
  const radius = size * 0.2;
  const padding = size * 0.06;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check rounded rect
      const rx = Math.max(radius, Math.min(size - radius, x));
      const ry = Math.max(radius, Math.min(size - radius, y));
      const dx = x - rx;
      const dy = y - ry;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Inside rounded rect
        // Soft edge antialiasing
        const alpha = Math.min(1, Math.max(0, radius - dist + 0.5));
        
        // Gradient: subtle top to bottom
        const grad = 1 - (y / size) * 0.15;
        const r = Math.round(36 * grad);
        const g = Math.round(41 * grad);
        const b = Math.round(47 * grad);

        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = Math.round(255 * alpha);
      } else {
        buf[idx + 3] = 0; // transparent
      }
    }
  }

  // Draw Markdown "M" and "↓"
  // Normalize coordinates: inside bounds [size*0.18, size*0.82]
  const minX = size * 0.16;
  const maxX = size * 0.84;
  const minY = size * 0.24;
  const maxY = size * 0.76;

  // Let's draw M in left half, arrow in right half
  const mLeft = minX;
  const mRight = minX + (maxX - minX) * 0.54;
  const aLeft = mRight + (maxX - minX) * 0.1;
  const aRight = maxX;

  function setPixel(px, py, r, g, b, a = 255) {
    if (px < 0 || px >= size || py < 0 || py >= size) return;
    const idx = (py * size + px) * 4;
    // Blend with existing background
    const bgA = buf[idx + 3] / 255;
    const fgA = a / 255;
    const outA = fgA + bgA * (1 - fgA);
    if (outA > 0) {
      buf[idx] = Math.round((r * fgA + buf[idx] * bgA * (1 - fgA)) / outA);
      buf[idx + 1] = Math.round((g * fgA + buf[idx + 1] * bgA * (1 - fgA)) / outA);
      buf[idx + 2] = Math.round((b * fgA + buf[idx + 2] * bgA * (1 - fgA)) / outA);
      buf[idx + 3] = Math.round(outA * 255);
    }
  }

  const stroke = Math.max(1.2, size * 0.08);

  function drawThickLine(x0, y0, x1, y1, color = [255, 255, 255], thick = stroke) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(len * 2);
    const radius = thick / 2;
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      const radCeil = Math.ceil(radius);
      for (let oy = -radCeil; oy <= radCeil; oy++) {
        for (let ox = -radCeil; ox <= radCeil; ox++) {
          const d = Math.hypot(ox, oy);
          if (d <= radius) {
            const alpha = Math.min(1, Math.max(0, radius - d + 0.5));
            setPixel(Math.round(cx + ox), Math.round(cy + oy), color[0], color[1], color[2], Math.round(255 * alpha));
          }
        }
      }
    }
  }

  // Draw "M"
  const mMidX = (mLeft + mRight) / 2;
  const mMidY = (minY + maxY) / 2 + size * 0.05;
  drawThickLine(mLeft, maxY, mLeft, minY);
  drawThickLine(mLeft, minY, mMidX, mMidY);
  drawThickLine(mMidX, mMidY, mRight, minY);
  drawThickLine(mRight, minY, mRight, maxY);

  // Draw arrow "↓"
  const arrowMidX = (aLeft + aRight) / 2;
  const arrowStemTop = minY;
  const arrowStemBottom = maxY - size * 0.05;
  // Arrow color: GitHub blue #58a6ff
  const arrowColor = [88, 166, 255];
  drawThickLine(arrowMidX, arrowStemTop, arrowMidX, arrowStemBottom, arrowColor);
  // Arrow head
  const headSize = (aRight - aLeft) * 0.5;
  drawThickLine(arrowMidX - headSize, arrowStemBottom - headSize, arrowMidX, arrowStemBottom, arrowColor);
  drawThickLine(arrowMidX + headSize, arrowStemBottom - headSize, arrowMidX, arrowStemBottom, arrowColor);

  return createPng(size, size, buf);
}

const sizes = [16, 32, 48, 128];
const dirs = [path.join(__dirname, '../src/assets'), path.join(__dirname, '../dist/assets')];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

for (const size of sizes) {
  const png = renderIcon(size);
  for (const dir of dirs) {
    fs.writeFileSync(path.join(dir, `icon${size}.png`), png);
  }
}

console.log('Icons generated successfully for sizes:', sizes.join(', '));
