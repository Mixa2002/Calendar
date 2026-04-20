/**
 * generate-icons.js
 * One-shot script: node generate-icons.js
 * Produces icons/icon-16.png, icon-180.png, icon-192.png, icon-512.png
 * No npm packages required — pure Node.js built-ins only.
 *
 * Each icon is a solid #546B41 square with a white calendar glyph drawn
 * by rasterising simple geometric shapes at the target resolution.
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── colour constants ──────────────────────────────────────────────────────────
const BG  = [0x54, 0x6B, 0x41]; // #546B41  green background
const FG  = [0xFF, 0xFF, 0xFF]; // #FFFFFF  white foreground
const ACC = [0xFF, 0xF8, 0xEC]; // #FFF8EC  cream  (header strip of calendar)

// ── PNG helpers ───────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function uint32be(n) {
  return Buffer.from([(n>>>24)&0xFF,(n>>>16)&0xFF,(n>>>8)&0xFF,n&0xFF]);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len  = uint32be(data.length);
  const crc  = uint32be(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([len, typeBytes, data, crc]);
}

/**
 * Build a PNG from a pixel buffer (RGBA, row-major).
 * pixels: Uint8Array of length size*size*4
 */
function buildPNG(size, pixels) {
  // IHDR
  const ihdr = Buffer.concat([
    uint32be(size), uint32be(size),
    Buffer.from([8, 2, 0, 0, 0]) // 8-bit depth, RGB (no alpha needed but we'll use RGB)
  ]);

  // IDAT  — one filter byte (0 = None) per row
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    rawRows.push(0x00); // filter type None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      rawRows.push(pixels[i], pixels[i+1], pixels[i+2]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawRows), { level: 9 });

  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

// ── drawing primitives ────────────────────────────────────────────────────────

function fillRect(px, size, x, y, w, h, col) {
  for (let row = y; row < Math.min(y+h, size); row++) {
    for (let col_ = x; col_ < Math.min(x+w, size); col_++) {
      if (row < 0 || col_ < 0) continue;
      const i = (row * size + col_) * 3;
      px[i]=col[0]; px[i+1]=col[1]; px[i+2]=col[2];
    }
  }
}

function drawRoundRect(px, size, x, y, w, h, r, col) {
  // filled rounded rectangle via per-pixel distance to corner circles
  for (let row = y; row < y+h; row++) {
    for (let c = x; c < x+w; c++) {
      if (row < 0 || c < 0 || row >= size || c >= size) continue;
      // check corner exclusions
      const inCornerTL = (c < x+r && row < y+r);
      const inCornerTR = (c >= x+w-r && row < y+r);
      const inCornerBL = (c < x+r && row >= y+h-r);
      const inCornerBR = (c >= x+w-r && row >= y+h-r);
      if (inCornerTL) { const dx=c-(x+r), dy=row-(y+r); if (dx*dx+dy*dy > r*r) continue; }
      if (inCornerTR) { const dx=c-(x+w-r-1), dy=row-(y+r); if (dx*dx+dy*dy > r*r) continue; }
      if (inCornerBL) { const dx=c-(x+r), dy=row-(y+h-r-1); if (dx*dx+dy*dy > r*r) continue; }
      if (inCornerBR) { const dx=c-(x+w-r-1), dy=row-(y+h-r-1); if (dx*dx+dy*dy > r*r) continue; }
      const i = (row * size + c) * 3;
      px[i]=col[0]; px[i+1]=col[1]; px[i+2]=col[2];
    }
  }
}

// ── icon rasteriser ───────────────────────────────────────────────────────────

function makeIconPixels(size) {
  const px = new Uint8Array(size * size * 3);

  // background fill (solid green)
  px.fill(0);
  for (let i = 0; i < size * size; i++) {
    px[i*3]=BG[0]; px[i*3+1]=BG[1]; px[i*3+2]=BG[2];
  }

  const p = (v) => Math.round(v * size / 512); // scale from 512-unit design space

  // ── calendar body (white rounded rect) ──
  const bx = p(96), by = p(100), bw = p(320), bh = p(290), br = p(28);
  drawRoundRect(px, size, bx, by, bw, bh, br, FG);

  // ── header strip (cream) inside top of calendar ──
  const hh = p(76);
  // clip header to rounded rect top: just fill then re-round corners
  fillRect(px, size, bx + br, by, bw - br*2, hh, ACC);
  fillRect(px, size, bx, by + br, bw, hh - br, ACC);
  // restore green corner pixels lost from header strip
  // (the round-rect above already handles the white body; header is layered)
  // re-draw the top corners of the white body as ACC
  drawRoundRect(px, size, bx, by, bw, hh + br, br, ACC);
  // restore white below header
  fillRect(px, size, bx, by + hh, bw, bh - hh, FG);
  // redraw the border between header and body with a fine green line
  fillRect(px, size, bx, by + hh, bw, p(4), BG);

  // ── binding pins (2 white raised pegs at top) ──
  const pinW = p(20), pinH = p(52), pinR = p(10);
  const pin1x = bx + p(78), pin1y = by - p(30);
  const pin2x = bx + p(222), pin2y = by - p(30);
  drawRoundRect(px, size, pin1x, pin1y, pinW, pinH, pinR, FG);
  drawRoundRect(px, size, pin2x, pin2y, pinW, pinH, pinR, FG);
  // green inner hole on pins
  const holeR = p(6);
  fillRect(px, size, pin1x + p(3), pin1y + p(12), pinW - p(6), p(18), BG);
  fillRect(px, size, pin2x + p(3), pin2y + p(12), pinW - p(6), p(18), BG);

  // ── grid dots (3×3 arrangement) representing days ──
  const dotR = p(16);
  const gridStartX = bx + p(36);
  const gridStartY = by + hh + p(30);
  const cellW = p(82), cellH = p(64);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      // skip top-left (represents "today" or selected state — make it green)
      const dotCol = (row === 0 && col === 0) ? BG : BG;
      const cx = gridStartX + col * cellW + p(20);
      const cy = gridStartY + row * cellH + p(8);
      // small rounded square dot
      drawRoundRect(px, size, cx, cy, dotR*2, dotR*2, p(4), BG);
    }
  }

  // highlight first dot in ACC (today indicator)
  const tdx = gridStartX + p(20), tdy = gridStartY + p(8);
  drawRoundRect(px, size, tdx, tdy, dotR*2, dotR*2, p(4), ACC);

  return px;
}

// ── write files ───────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const sizes = [16, 180, 192, 512];
for (const size of sizes) {
  const pixels = makeIconPixels(size);
  const png = buildPNG(size, pixels);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Written ${outPath}  (${png.length} bytes)`);
}

console.log('\nDone. Icons written to /icons/');
