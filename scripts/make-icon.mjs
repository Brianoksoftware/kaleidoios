import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

const TAU = Math.PI * 2;
const HUES = ['#FF4D6D', '#FFBE0B', '#70E000', '#00F5D4', '#9B5DE5', '#F15BB5'];

function hex(color) {
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
    255,
  ];
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pixel = Buffer.alloc(4);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      paint(x, y, size, pixel);
      pixel.copy(raw, row + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, checksum]);
}

function paintIcon(x, y, size, pixel, transparentOutside, scale = 1) {
  const cx = (size - 1) / 2;
  const cy = cx;
  const dx = (x - cx) / scale;
  const dy = (y - cy) / scale;
  const radius = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const outer = size * 0.34;
  const inner = size * 0.13;
  const bg = [20, 8, 36, transparentOutside ? 0 : 255];
  if (radius > size * 0.48) {
    pixel.set(bg);
    return;
  }
  const sector = TAU / 6;
  const shifted = (angle + TAU + sector / 2) % sector;
  const gap = sector * 0.08;
  const index = Math.floor(((angle + TAU) % TAU) / sector) % 6;
  const color = hex(HUES[index]);
  if (radius >= inner && radius <= outer && shifted > gap && shifted < sector - gap) {
    pixel.set(color);
    return;
  }
  if (radius < inner * 0.72) {
    pixel.set([255, 255, 255, 255]);
    return;
  }
  if (radius < inner) {
    pixel.set([18, 8, 24, 255]);
    return;
  }
  const spark = size * 0.44;
  if (Math.hypot(dx - spark, dy) < size * 0.035) {
    pixel.set([255, 255, 255, 255]);
    return;
  }
  pixel.set(bg);
}

const assets = path.join(process.cwd(), 'assets');
fs.writeFileSync(
  path.join(assets, 'icon.png'),
  png(1024, (x, y, size, pixel) => paintIcon(x, y, size, pixel, false)),
);
fs.writeFileSync(
  path.join(assets, 'android-icon-foreground.png'),
  png(1024, (x, y, size, pixel) => paintIcon(x, y, size, pixel, true, 0.72)),
);
fs.writeFileSync(
  path.join(assets, 'android-icon-background.png'),
  png(512, (x, y, size, pixel) => pixel.set([20, 8, 36, 255])),
);
fs.writeFileSync(
  path.join(assets, 'android-icon-monochrome.png'),
  png(1024, (x, y, size, pixel) => {
    paintIcon(x, y, size, pixel, true, 0.72);
    if (pixel[3] > 0) pixel.set([255, 255, 255, 255]);
  }),
);
fs.writeFileSync(
  path.join(assets, 'favicon.png'),
  png(192, (x, y, size, pixel) => paintIcon(x, y, size, pixel, false)),
);
console.log('icons written');
