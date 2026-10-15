// 生成 1024x1024 应用图标（纯 Node 标准库实现 PNG 编码，零依赖）
// 用法: node scripts/make-icon.mjs
// 生成后由 `npx tauri icon` 派生出各尺寸 .png/.ico/.icns
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const SIZE = 1024;
const BG = [15, 23, 42]; // 深蓝灰底
const CARD = [56, 189, 248]; // 亮蓝色卡片
const INK = [15, 23, 42]; // 卡片上的 “M”

/** 点是否在圆角矩形内 */
function insideRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** 点到线段的距离（用于画 M 的两条斜线） */
function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy || 1;
  let t = ((px - ax) * vx + (py - ay) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

function colorAt(x, y) {
  if (!insideRoundRect(x, y, 140, 140, 884, 884, 170)) return BG;

  const sw = 76; // 笔画粗细
  const top = 300;
  const bottom = 724;
  const lx = 300; // 左竖笔
  const rx = 648; // 右竖笔

  if (x >= lx && x < lx + sw && y >= top && y <= bottom) return INK;
  if (x >= rx && x < rx + sw && y >= top && y <= bottom) return INK;

  // 两条斜笔：从竖笔顶端中心汇聚到中间下方的 V 点
  const midX = (lx + rx) / 2 + sw / 2;
  const vertexY = top + 0.62 * (bottom - top);
  const half = sw / 2;
  if (distToSegment(x, y, lx + sw / 2, top, midX, vertexY) <= half) return INK;
  if (distToSegment(x, y, rx + sw / 2, top, midX, vertexY) <= half) return INK;

  return CARD;
}

// ---------- PNG 编码 ----------
const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE); // 每行: 1 字节 filter + RGB
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 3 + 1);
  raw[rowStart] = 0; // filter type: None
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b] = colorAt(x, y);
    const o = rowStart + 1 + x * 3;
    raw[o] = r;
    raw[o + 1] = g;
    raw[o + 2] = b;
  }
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); // width
ihdr.writeUInt32BE(SIZE, 4); // height
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: 真彩色 RGB
ihdr[10] = 0; // 压缩方法
ihdr[11] = 0; // 过滤方法
ihdr[12] = 0; // 隔行扫描

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG 签名
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.resolve(import.meta.dirname, '../src-tauri/icons/app-icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`图标已生成: ${out} (${png.length} bytes)`);
