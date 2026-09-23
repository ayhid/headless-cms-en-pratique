// Genere les images de demo (PNG) sans aucune dependance ni telechargement.
// Usage : node scripts/seed/generate-assets.mjs  (les PNG produits sont versionnes)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'assets');
mkdirSync(outDir, { recursive: true });

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const palettes = [
  [[79, 70, 229], [236, 72, 153]],
  [[16, 185, 129], [59, 130, 246]],
  [[245, 158, 11], [239, 68, 68]],
  [[14, 165, 233], [99, 102, 241]],
  [[132, 204, 22], [20, 184, 166]],
  [[168, 85, 247], [249, 115, 22]],
  [[30, 41, 59], [100, 116, 139]],
];

palettes.forEach(([c1, c2], i) => {
  const W = 1200, H = 630;
  const cx = 300 + i * 120, cy = 315, r = 180;
  const buf = png(W, H, (x, y) => {
    const base = mix(c1, c2, (x / W) * 0.7 + (y / H) * 0.3);
    const d = Math.hypot(x - cx, y - cy);
    if (d < r) return mix(base, [255, 255, 255], 0.25);
    if ((x + y) % 80 < 6) return mix(base, [255, 255, 255], 0.12);
    return base;
  });
  writeFileSync(join(outDir, `cover-${i + 1}.png`), buf);
});

palettes.slice(0, 3).forEach(([c1, c2], i) => {
  const S = 256;
  const buf = png(S, S, (x, y) => {
    const d = Math.hypot(x - S / 2, y - S / 2.4);
    const body = Math.hypot(x - S / 2, y - S * 1.05) < S * 0.45;
    if (d < S * 0.2 || body) return [245, 245, 245];
    return mix(c1, c2, y / S);
  });
  writeFileSync(join(outDir, `avatar-${i + 1}.png`), buf);
});

console.log(`Images generees dans ${outDir}`);
