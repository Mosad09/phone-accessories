const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function blendPixel(buf, idx, r, g, b, a) {
  const alpha = Math.max(0, Math.min(1, a));
  const inv = 1 - alpha;
  buf[idx] = Math.round(buf[idx] * inv + r * alpha);
  buf[idx + 1] = Math.round(buf[idx + 1] * inv + g * alpha);
  buf[idx + 2] = Math.round(buf[idx + 2] * inv + b * alpha);
  buf[idx + 3] = Math.round(Math.min(255, buf[idx + 3] + alpha * 255 * inv + (buf[idx + 3] === 0 ? alpha * 255 : 0)));
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function drawRoundedRectAlpha(x, y, size, r) {
  const cx = Math.max(r, Math.min(size - r, x));
  const cy = Math.max(r, Math.min(size - r, y));
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);
  if (x >= r && x <= size - r && y >= 0 && y <= size) return 1;
  if (y >= r && y <= size - r && x >= 0 && x <= size) return 1;
  return Math.max(0, Math.min(1, 0.5 - (d - r)));
}

function renderStoreIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const s = size / 64;
  const bagPts = [[17.5 * s, 24 * s], [46.5 * s, 24 * s], [48.5 * s, 46.5 * s], [44.5 * s, 49.5 * s], [19.5 * s, 49.5 * s], [15.5 * s, 46.5 * s]];
  const boltPts = [[34 * s, 28 * s], [27 * s, 37.5 * s], [32 * s, 37.5 * s], [30 * s, 45.5 * s], [37.5 * s, 35.5 * s], [32.5 * s, 35.5 * s]];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const t = (x + y) / (2 * size);
      // Gradient from #0d9488 to #0f766e (and deep teal shadow)
      const bgR = Math.round(13 * (1 - t) + 15 * t);
      const bgG = Math.round(148 * (1 - t) + 118 * t);
      const bgB = Math.round(136 * (1 - t) + 110 * t);

      const bgAlpha = drawRoundedRectAlpha(x + 0.5, y + 0.5, size, size * 0.22);
      buf[idx] = bgR;
      buf[idx + 1] = bgG;
      buf[idx + 2] = bgB;
      buf[idx + 3] = Math.round(bgAlpha * 255);

      if (bgAlpha <= 0) continue;

      // Bag handle arc above 24*s centered at (32*s, 24*s), r=9*s
      const hx = x - 32 * s;
      const hy = y - 22.5 * s;
      if (hy <= 1.8 * s) {
        const hd = Math.abs(Math.hypot(hx, hy) - 8.5 * s);
        const hAlpha = Math.max(0, Math.min(1, 1.8 * s - hd));
        if (hAlpha > 0) blendPixel(buf, idx, 255, 255, 255, hAlpha);
      }

      // Bag outline & subtle fill
      if (pointInPoly(x, y, bagPts)) {
        blendPixel(buf, idx, 255, 255, 255, 0.22);
      }
      for (let i = 0; i < bagPts.length; i++) {
        const a = bagPts[i];
        const b = bagPts[(i + 1) % bagPts.length];
        const d = distToSegment(x, y, a[0], a[1], b[0], b[1]);
        const strokeAlpha = Math.max(0, Math.min(1, 1.7 * s - d));
        if (strokeAlpha > 0) blendPixel(buf, idx, 255, 255, 255, strokeAlpha);
      }

      // Golden lightning spark inside bag
      if (pointInPoly(x, y, boltPts)) {
        blendPixel(buf, idx, 253, 230, 138, 1);
      }
    }
  }
  return encodePng(size, size, buf);
}

function renderAdminIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const s = size / 64;
  const shieldPts = [[32 * s, 12 * s], [49 * s, 19 * s], [49 * s, 32 * s], [41 * s, 45 * s], [32 * s, 52 * s], [23 * s, 45 * s], [15 * s, 32 * s], [15 * s, 19 * s]];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const t = (x + y) / (2 * size);
      // Dark charcoal #13222b -> #0f766e
      const bgR = Math.round(19 * (1 - t) + 15 * t);
      const bgG = Math.round(34 * (1 - t) + 118 * t);
      const bgB = Math.round(43 * (1 - t) + 110 * t);
      const bgAlpha = drawRoundedRectAlpha(x + 0.5, y + 0.5, size, size * 0.22);
      buf[idx] = bgR;
      buf[idx + 1] = bgG;
      buf[idx + 2] = bgB;
      buf[idx + 3] = Math.round(bgAlpha * 255);
      if (bgAlpha <= 0) continue;

      if (pointInPoly(x, y, shieldPts)) {
        blendPixel(buf, idx, 255, 255, 255, 0.12);
      }
      for (let i = 0; i < shieldPts.length; i++) {
        const a = shieldPts[i];
        const b = shieldPts[(i + 1) % shieldPts.length];
        const d = distToSegment(x, y, a[0], a[1], b[0], b[1]);
        const strokeAlpha = Math.max(0, Math.min(1, 1.7 * s - d));
        if (strokeAlpha > 0) blendPixel(buf, idx, 94, 234, 212, strokeAlpha);
      }

      // 4 crisp dashboard squares inside shield
      const inTopLeft = x >= 23.5 * s && x <= 30.5 * s && y >= 24.5 * s && y <= 31.5 * s;
      const inTopRight = x >= 33.5 * s && x <= 40.5 * s && y >= 24.5 * s && y <= 31.5 * s;
      const inBotLeft = x >= 23.5 * s && x <= 30.5 * s && y >= 34.5 * s && y <= 41.5 * s;
      const inBotRight = x >= 33.5 * s && x <= 40.5 * s && y >= 34.5 * s && y <= 41.5 * s;
      if (inTopLeft || inBotRight) blendPixel(buf, idx, 255, 255, 255, 1);
      if (inTopRight) blendPixel(buf, idx, 253, 230, 138, 1);
      if (inBotLeft) blendPixel(buf, idx, 94, 234, 212, 1);
    }
  }
  return encodePng(size, size, buf);
}

const outDir = path.join(__dirname, "..", "my-store", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [180, 192, 512]) {
  fs.writeFileSync(path.join(outDir, `store-${size}.png`), renderStoreIcon(size));
  fs.writeFileSync(path.join(outDir, `admin-${size}.png`), renderAdminIcon(size));
}
console.log("Generated store & admin icons in", outDir);
