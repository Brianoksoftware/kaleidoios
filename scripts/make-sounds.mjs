/**
 * Original short WAVs for Kaleido. No third-party samples.
 * Run: node scripts/make-sounds.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((clamped * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function silence(seconds) {
  return new Float32Array(Math.floor(RATE * seconds));
}

function mix(into, from, offset) {
  for (let i = 0; i < from.length; i++) {
    const index = offset + i;
    if (index >= 0 && index < into.length) into[index] += from[i];
  }
}

function normalize(buffer, peak) {
  let max = 0;
  for (let i = 0; i < buffer.length; i++) max = Math.max(max, Math.abs(buffer[i]));
  if (max < 1e-8) return buffer;
  const gain = peak / max;
  for (let i = 0; i < buffer.length; i++) buffer[i] *= gain;
  return buffer;
}

function fadeEdges(buffer, seconds) {
  const fade = Math.min(buffer.length >> 1, Math.floor(RATE * seconds));
  for (let i = 0; i < fade; i++) {
    const gain = i / fade;
    buffer[i] *= gain;
    buffer[buffer.length - 1 - i] *= gain;
  }
  return buffer;
}

function bell(freq, seconds, amp) {
  const out = silence(seconds);
  const partials = [
    [1, 1],
    [2, 0.38],
    [2.76, 0.16],
    [4.07, 0.07],
  ];
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, i / (RATE * 0.008));
    const decay = Math.exp(-t * (5.2 / seconds));
    let sample = 0;
    for (const [ratio, gain] of partials) {
      sample += gain * Math.sin(2 * Math.PI * freq * ratio * t);
    }
    out[i] = sample * attack * decay * amp;
  }
  return out;
}

function sweep(start, end, seconds, amp) {
  const out = silence(seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    const freq = start + (end - start) * t;
    phase += (2 * Math.PI * freq) / RATE;
    const attack = Math.min(1, i / (RATE * 0.01));
    const decay = Math.pow(1 - t, 1.4);
    out[i] = Math.sin(phase) * attack * decay * amp;
    out[i] += 0.25 * Math.sin(phase * 2) * attack * decay * amp;
  }
  return out;
}

function noise(seconds, seed) {
  const out = silence(seconds);
  let state = seed >>> 0;
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const white = state / 4294967296 * 2 - 1;
    low += 0.18 * (white - low);
    const t = i / out.length;
    out[i] = low * Math.pow(1 - t, 1.6);
  }
  return out;
}

function tick() {
  const out = silence(0.055);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 70);
    out[i] = Math.sin(2 * Math.PI * 1680 * t) * env * 0.55;
    out[i] += Math.sin(2 * Math.PI * 2460 * t) * env * 0.2;
  }
  return normalize(out, 0.55);
}

function catchTone() {
  return normalize(bell(784, 0.16, 0.7), 0.72);
}

function rush() {
  const out = silence(0.14);
  mix(out, bell(1174, 0.14, 0.7), 0);
  mix(out, bell(1568, 0.09, 0.28), Math.floor(RATE * 0.02));
  return normalize(out, 0.74);
}

function rainbow() {
  const out = silence(0.32);
  const notes = [784, 988, 1175, 1568];
  notes.forEach((freq, index) => mix(out, bell(freq, 0.16, 0.55), Math.floor(index * 0.055 * RATE)));
  return normalize(out, 0.7);
}

function prism() {
  const out = silence(0.42);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.sin(Math.min(1, t / 0.03) * Math.PI * 0.5) * Math.exp(-t * 4.2);
    const shimmer = 0.5 + 0.5 * Math.sin(2 * Math.PI * 14 * t);
    out[i] =
      (Math.sin(2 * Math.PI * 1480 * t) * 0.55 +
        Math.sin(2 * Math.PI * 2217 * t) * 0.28 +
        Math.sin(2 * Math.PI * 2960 * t) * 0.12 * shimmer) *
      env;
  }
  return normalize(out, 0.62);
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Bright, high-passed noise: the snap of glass giving way. */
function snap(seconds, decayRate, seed, amp) {
  const out = silence(seconds);
  const random = rng(seed);
  let prev = 0;
  for (let i = 0; i < out.length; i++) {
    const white = random() * 2 - 1;
    const bright = white - prev * 0.92;
    prev = white;
    const t = i / RATE;
    out[i] = bright * Math.exp(-t * decayRate) * amp;
  }
  return out;
}

/** Sparse micro-clicks spreading out over time, like a fissure running. */
function crackle(seconds, count, seed, amp) {
  const out = silence(seconds);
  const random = rng(seed);
  for (let n = 0; n < count; n++) {
    const at = Math.floor(Math.pow(random(), 1.6) * out.length * 0.9);
    const length = Math.floor(RATE * (0.0012 + random() * 0.0025));
    const gain = (0.3 + random() * 0.7) * amp;
    let prev = 0;
    for (let i = 0; i < length && at + i < out.length; i++) {
      const white = random() * 2 - 1;
      const bright = white - prev * 0.9;
      prev = white;
      out[at + i] += bright * (1 - i / length) * gain;
    }
  }
  return out;
}

/** Thin inharmonic ring of a glass sheet. */
function glassRing(seconds, partials, amp) {
  const out = silence(seconds);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    let sample = 0;
    for (const [freq, gain, decay] of partials) {
      sample += Math.sin(2 * Math.PI * freq * t) * gain * Math.exp(-t * decay);
    }
    out[i] = sample * amp * Math.min(1, i / (RATE * 0.002));
  }
  return out;
}

function miss() {
  const out = silence(0.38);
  mix(out, snap(0.045, 190, 11, 1.15), 0);
  mix(out, snap(0.03, 240, 19, 0.55), Math.floor(RATE * 0.012));
  mix(out, crackle(0.24, 22, 23, 0.85), Math.floor(RATE * 0.004));
  mix(
    out,
    glassRing(
      0.32,
      [
        [2740, 0.42, 18],
        [3960, 0.5, 22],
        [5180, 0.34, 26],
        [6870, 0.22, 32],
        [8120, 0.12, 40],
      ],
      0.55,
    ),
    Math.floor(RATE * 0.002),
  );
  const body = silence(0.08);
  for (let i = 0; i < body.length; i++) {
    const t = i / RATE;
    body[i] = Math.sin(2 * Math.PI * (240 - t * 1100) * t) * Math.exp(-t * 38) * 0.38;
  }
  mix(out, body, 0);
  return normalize(fadeEdges(out, 0.003), 0.88);
}

function tinkle(freq, seconds, amp) {
  const out = silence(seconds);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, i / (RATE * 0.0015)) * Math.exp(-t * (6 / seconds));
    out[i] = (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2.71 * t)) * env * amp;
  }
  return out;
}

function bloom() {
  const out = silence(0.55);
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
    mix(out, bell(freq, 0.28, 0.6), Math.floor(index * 0.08 * RATE));
  });
  return normalize(out, 0.75);
}

function fever() {
  const out = silence(0.46);
  mix(out, bell(659.25, 0.22, 0.7), 0);
  mix(out, bell(1046.5, 0.32, 0.75), Math.floor(0.1 * RATE));
  mix(out, bell(1318.5, 0.2, 0.28), Math.floor(0.12 * RATE));
  return normalize(out, 0.76);
}

function hue() {
  return normalize(sweep(440, 990, 0.34, 0.65), 0.68);
}

function shatter() {
  const out = silence(1.05);
  const random = rng(4242);
  mix(out, snap(0.08, 90, 77, 1), 0);
  mix(out, snap(0.06, 120, 78, 0.7), Math.floor(RATE * 0.035));
  mix(out, crackle(0.5, 40, 91, 0.8), Math.floor(RATE * 0.01));
  mix(out, sweep(150, 46, 0.36, 0.75), 0);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] += Math.sin(2 * Math.PI * 72 * t) * Math.exp(-t * 7) * 0.4;
  }
  const wash = noise(0.6, 5);
  for (let i = 0; i < wash.length; i++) wash[i] *= 0.25;
  mix(out, wash, Math.floor(RATE * 0.02));
  const pieces = 26;
  for (let n = 0; n < pieces; n++) {
    const at = 0.04 + Math.pow(random(), 1.3) * 0.72;
    const freq = 2300 + random() * 4600;
    const length = 0.1 + random() * 0.2;
    const amp = 0.12 + random() * 0.22;
    mix(out, tinkle(freq, length, amp), Math.floor(at * RATE));
  }
  return normalize(fadeEdges(out, 0.01), 0.82);
}

function music() {
  const seconds = 8;
  const out = silence(seconds);
  const addPad = (freq, amp) => {
    const cycles = Math.round((freq * out.length) / RATE);
    const tuned = (cycles * RATE) / out.length;
    for (let i = 0; i < out.length; i++) {
      const t = i / RATE;
      out[i] += Math.sin(2 * Math.PI * tuned * t) * amp;
    }
  };
  addPad(130.81, 0.09);
  addPad(196.0, 0.05);
  addPad(261.63, 0.035);
  addPad(329.63, 0.02);

  const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  const pattern = [0, 2, 4, 2, 3, 1, 4, 2, 5, 4, 2, 3, 1, 2, 0, 4];
  pattern.forEach((degree, index) => {
    mix(out, bell(scale[degree], 0.46, 0.11), Math.floor(index * 0.5 * RATE));
  });
  return fadeEdges(normalize(out, 0.26), 0.03);
}

const files = {
  tick: tick(),
  catch: catchTone(),
  rush: rush(),
  rainbow: rainbow(),
  prism: prism(),
  miss: miss(),
  bloom: bloom(),
  fever: fever(),
  hue: hue(),
  shatter: shatter(),
  music: music(),
};

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(files)) {
  const path = join(OUT, `${name}.wav`);
  writeFileSync(path, wav(samples));
  console.log(`${name}.wav ${samples.length} samples`);
}
