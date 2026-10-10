import { sectorPath, TAU } from './geometry';
import type { Fracture } from './types';

type Point = { x: number; y: number };

export type FlyingShard = {
  d: string;
  fill: string;
  tx: number;
  ty: number;
  spin: number;
  opacity: number;
};

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function jaggedLine(
  from: Point,
  heading: number,
  length: number,
  segments: number,
  wobble: number,
  random: () => number,
): Point[] {
  const points = [from];
  let x = from.x;
  let y = from.y;
  let direction = heading;
  for (let i = 0; i < segments; i += 1) {
    direction += (random() - 0.5) * wobble;
    const stepLength = (length / segments) * (0.7 + random() * 0.6);
    x += Math.cos(direction) * stepLength;
    y += Math.sin(direction) * stepLength;
    points.push({ x, y });
  }
  return points;
}

function trim(points: Point[], progress: number): Point[] {
  if (progress >= 1) return points;
  if (progress <= 0 || points.length < 2) return points.slice(0, 1);
  const total = (points.length - 1) * progress;
  const whole = Math.floor(total);
  const partial = total - whole;
  const kept = points.slice(0, whole + 1);
  if (whole < points.length - 1 && partial > 0) {
    const a = points[whole];
    const b = points[whole + 1];
    kept.push({ x: a.x + (b.x - a.x) * partial, y: a.y + (b.y - a.y) * partial });
  }
  return kept;
}

function toPath(points: Point[]): string {
  if (points.length < 2) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

export function fractureProgress(fracture: Fracture, elapsed: number) {
  return Math.min(1, Math.max(0, (elapsed - fracture.born) / 0.28));
}

function impactPoint(fracture: Fracture, cx: number, cy: number, impactRadius: number): Point {
  return {
    x: cx + Math.cos(fracture.angle) * impactRadius,
    y: cy + Math.sin(fracture.angle) * impactRadius,
  };
}

/**
 * Crack veins for one impact. Later hits grow denser. Lines grow outward over `progress`.
 */
export function fracturePaths(
  fracture: Fracture,
  cx: number,
  cy: number,
  impactRadius: number,
  outerRadius: number,
  innerRadius: number,
  progress: number,
): string[] {
  const random = rng(fracture.seed);
  const impact = impactPoint(fracture, cx, cy, impactRadius);
  const inward = fracture.angle + Math.PI;
  const paths: Point[][] = [];
  const density = 1 + fracture.generation * 0.55;

  const main = jaggedLine(
    impact,
    inward + (random() - 0.5) * 0.45,
    impactRadius - innerRadius + 8,
    7,
    0.85,
    random,
  );
  paths.push(trim(main, progress));

  const rim = jaggedLine(
    impact,
    fracture.angle + (random() - 0.5) * 0.55,
    outerRadius - impactRadius + 18,
    4,
    0.75,
    random,
  );
  paths.push(trim(rim, Math.min(1, progress * 1.35)));

  const starCount = 5 + fracture.generation;
  for (let i = 0; i < starCount; i += 1) {
    const heading = fracture.angle + (i / starCount) * TAU + (random() - 0.5) * 0.25;
    const chip = jaggedLine(impact, heading, 10 + random() * 16, 3, 0.7, random);
    paths.push(trim(chip, Math.min(1, progress * 1.8)));
  }

  const around = 1 + fracture.generation;
  for (let i = 0; i < around; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const arc = jaggedLine(
      impact,
      fracture.angle + side * (Math.PI / 2) + (random() - 0.5) * 0.4,
      (outerRadius - innerRadius) * (0.7 + random() * 0.5),
      5,
      0.95,
      random,
    );
    paths.push(trim(arc, Math.min(1, (progress - 0.12) / 0.88)));
  }

  const branchCount = Math.round((3 + fracture.generation) * density);
  for (let i = 0; i < branchCount; i += 1) {
    const at = 1 + Math.floor(random() * Math.max(1, main.length - 2));
    const side = random() < 0.5 ? -1 : 1;
    const heading = inward + side * (0.55 + random() * 0.85);
    const branch = jaggedLine(main[at], heading, impactRadius * (0.22 + random() * 0.38), 4, 1.05, random);
    paths.push(trim(branch, Math.min(1, Math.max(0, (progress - 0.22) / 0.78))));
  }

  return paths.map(toPath).filter(Boolean);
}

export function shockRadius(progress: number, impactRadius: number) {
  return impactRadius + progress * 46;
}

export function shatterPaths(seed: number, cx: number, cy: number, radius: number, progress: number): string[] {
  const random = rng(seed);
  const paths: Point[][] = [];
  const spokes = 14;
  for (let i = 0; i < spokes; i += 1) {
    const heading = (i / spokes) * TAU + (random() - 0.5) * 0.35;
    paths.push(trim(jaggedLine({ x: cx, y: cy }, heading, radius, 8, 0.72, random), progress));
  }
  for (let ring = 0; ring < 3; ring += 1) {
    const r = radius * (0.28 + ring * 0.24);
    const points: Point[] = [];
    const steps = 14 + ring * 4;
    const start = random() * TAU;
    const ringProgress = Math.min(1, Math.max(0, (progress - 0.18 - ring * 0.12) / 0.7));
    for (let i = 0; i <= steps; i += 1) {
      const a = start + (i / steps) * TAU;
      const wobble = r * (0.86 + random() * 0.26);
      points.push({ x: cx + Math.cos(a) * wobble, y: cy + Math.sin(a) * wobble });
      if (random() < 0.16 && points.length > 2) {
        paths.push(trim(points.splice(0, points.length), ringProgress));
        points.push({ x: cx + Math.cos(a) * wobble, y: cy + Math.sin(a) * wobble });
      }
    }
    paths.push(trim(points, ringProgress));
  }
  return paths.map(toPath).filter(Boolean);
}

export function flyingShards(
  seed: number,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  colorCount: number,
  rotation: number,
  fills: string[],
  t: number,
): FlyingShard[] {
  const random = rng(seed);
  const sector = TAU / colorCount;
  const pieces: FlyingShard[] = [];
  const ease = 1 - Math.pow(1 - Math.min(1, t), 2);
  for (let i = 0; i < colorCount; i += 1) {
    for (let slice = 0; slice < 2; slice += 1) {
      const start = rotation + i * sector + (slice / 2) * sector + 0.03;
      const end = rotation + i * sector + ((slice + 1) / 2) * sector - 0.03;
      const mid = (start + end) / 2;
      const dist = (28 + random() * 90) * ease;
      pieces.push({
        d: sectorPath(cx, cy, inner, outer, start, end),
        fill: fills[i] ?? '#FFFFFF',
        tx: Math.cos(mid) * dist,
        ty: Math.sin(mid) * dist,
        spin: (random() - 0.5) * 48 * ease,
        opacity: Math.max(0, 1 - t * 0.82),
      });
    }
  }
  return pieces;
}
