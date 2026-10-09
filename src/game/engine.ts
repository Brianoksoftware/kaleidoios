import { angleDiff, assertGeometry, colorMatches, TAU, wrapAngle } from './geometry';
import { colorCountFor, hue } from './palette';
import type { GameEvent, GameState, Spark, SparkKind } from './types';
import type { Profile } from '../storage';

const MAX_SPARKS = 7;
const MAX_PARTICLES = 96;

export function ringOuter(size: number): number {
  return size * 0.25;
}

export function ringInner(size: number): number {
  return size * 0.12;
}

export function catchRadius(size: number): number {
  return ringOuter(size) + 2;
}

export function spawnRadius(size: number): number {
  return size * 0.47;
}

export function createState(profile: Profile): GameState {
  return {
    phase: 'menu',
    score: 0,
    best: profile.best,
    bestCombo: profile.bestCombo,
    combo: 0,
    maxCombo: 0,
    cracks: 0,
    rotation: -0.2,
    targetRotation: -0.2,
    sparks: [],
    particles: [],
    floaters: [],
    spawnIn: 0,
    colorCount: 3,
    fever: 0,
    prism: 0,
    chainColor: null,
    chainCount: 0,
    chainTime: 0,
    shake: 0,
    banner: '',
    bannerTime: 0,
    flash: 0,
    flashColor: '#FFFFFF',
    pulse: 0,
    pulseColor: 0,
    catches: 0,
    nextId: 1,
    isNewBest: false,
    haptics: profile.haptics,
    elapsed: 0,
    glow: 4,
  };
}

export function begin(state: GameState): void {
  state.phase = 'playing';
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.cracks = 0;
  state.rotation = 0;
  state.targetRotation = 0;
  state.sparks = [];
  state.particles = [];
  state.floaters = [];
  state.spawnIn = 0.15;
  state.colorCount = 3;
  state.fever = 0;
  state.prism = 0;
  state.chainColor = null;
  state.chainCount = 0;
  state.chainTime = 0;
  state.shake = 0;
  state.banner = 'MATCH THE HUE';
  state.bannerTime = 1.4;
  state.flash = 0;
  state.pulse = 0;
  state.catches = 0;
  state.isNewBest = false;
  state.elapsed = 0;
  state.glow = 4;
}

export function toMenu(state: GameState): void {
  state.phase = 'menu';
  state.sparks = [];
  state.particles = [];
  state.floaters = [];
  state.flash = 0;
  state.bannerTime = 0;
  state.shake = 0;
  state.fever = 0;
  state.prism = 0;
}

export function rotate(state: GameState, direction: -1 | 1): void {
  if (state.phase !== 'playing') return;
  const sector = TAU / state.colorCount;
  const pending = state.targetRotation - state.rotation;
  if (Math.abs(pending + direction * sector) > sector * 2.05) return;
  state.targetRotation += direction * sector;
}

export function step(state: GameState, dt: number, size: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (size < 40) return events;
  if (state.phase === 'playing') simulate(state, dt, size, events);
  if (state.phase === 'playing' || state.phase === 'over') present(state, dt);
  return events;
}

function simulate(state: GameState, dt: number, size: number, events: GameEvent[]): void {
  const diff = state.targetRotation - state.rotation;
  state.rotation += diff * Math.min(1, dt * 16);
  if (Math.abs(state.targetRotation - state.rotation) < 0.002) {
    state.rotation = state.targetRotation;
  }

  state.fever = Math.max(0, state.fever - dt);
  state.prism = Math.max(0, state.prism - dt);
  if (state.chainTime > 0) {
    state.chainTime -= dt;
    if (state.chainTime <= 0) {
      state.chainTime = 0;
      state.chainCount = 0;
      state.chainColor = null;
    }
  }

  const slow = state.prism > 0 ? 0.5 : 1;
  const gate = catchRadius(size);
  for (let i = state.sparks.length - 1; i >= 0; i -= 1) {
    const spark = state.sparks[i];
    if (!spark) continue;
    spark.radius -= spark.speed * slow * dt;
    if (spark.radius > gate) continue;
    state.sparks.splice(i, 1);
    resolve(state, spark, size, events);
    if (state.phase !== 'playing') break;
  }

  if (state.phase !== 'playing') return;

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (state.sparks.length < MAX_SPARKS) pushSpark(state, size);
    state.spawnIn = spawnGap(state.catches) * (0.85 + Math.random() * 0.3);
  }
}

function resolve(state: GameState, spark: Spark, size: number, events: GameEvent[]): void {
  const matched =
    spark.kind === 'rainbow' ||
    spark.kind === 'prism' ||
    colorMatches(spark.angle, state.rotation, spark.color, state.colorCount);
  const point = polar(size, spark.angle, Math.max(spark.radius, ringOuter(size)));

  if (!matched) {
    state.cracks += 1;
    state.combo = 0;
    state.chainCount = 0;
    state.chainTime = 0;
    state.chainColor = null;
    state.fever = 0;
    state.shake = 1;
    state.flash = 0.5;
    state.flashColor = '#FF4D6D';
    state.banner = state.cracks >= 3 ? 'SHATTERED' : 'CRACK';
    state.bannerTime = 0.8;
    floater(state, point.x, point.y, 'CRACK', '#FFD0D8');
    burst(state, point.x, point.y, '#FF4D6D', 10);
    events.push({ type: 'miss' });
    if (state.cracks >= 3) finish(state, size, events);
    return;
  }

  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.catches += 1;
  if (state.combo >= 8) {
    if (state.fever <= 0) events.push({ type: 'fever' });
    state.fever = Math.max(state.fever, 7);
  }

  let points = 10 + state.combo * 5;
  if (spark.kind === 'rush') points *= 2;
  if (spark.kind === 'rainbow') points += 60;
  if (spark.kind === 'prism') points += 25;
  if (state.fever > 0) points *= 2;
  state.score += points;

  const painted = spark.kind === 'rainbow' ? '#FFE566' : hue(spark.color).hex;
  state.glow = spark.kind === 'rainbow' || spark.kind === 'prism' ? state.glow : spark.color;
  state.pulse = 1;
  state.pulseColor = spark.color;
  state.flash = spark.kind === 'rainbow' ? 0.62 : 0.32;
  state.flashColor = painted;
  burst(state, point.x, point.y, painted, spark.kind === 'rainbow' ? 18 : 12);
  floater(state, point.x, point.y - 8, `+${points}`, '#FFFFFF');
  events.push({ type: 'catch' });

  if (spark.kind === 'prism') {
    state.prism = 4.4;
    state.banner = 'PRISM';
    state.bannerTime = 1.05;
    events.push({ type: 'prism' });
  } else {
    growChain(state, spark, size, events);
  }

  const nextColors = colorCountFor(state.catches);
  if (nextColors !== state.colorCount) {
    state.colorCount = nextColors;
    state.banner = `${nextColors} HUES`;
    state.bannerTime = 1.5;
    events.push({ type: 'hue' });
  }
}

function growChain(state: GameState, spark: Spark, size: number, events: GameEvent[]): void {
  if (spark.kind === 'rainbow') {
    if (state.chainColor === null || state.chainTime <= 0) return;
    state.chainCount += 1;
    state.chainTime = 1.4;
  } else if (state.chainColor === spark.color && state.chainTime > 0) {
    state.chainCount += 1;
    state.chainTime = 1.4;
  } else {
    state.chainColor = spark.color;
    state.chainCount = 1;
    state.chainTime = 1.4;
  }

  if (state.chainCount < 3 || state.chainColor === null) return;
  const color = state.chainColor;
  let cleared = 0;
  for (let i = state.sparks.length - 1; i >= 0; i -= 1) {
    const other = state.sparks[i];
    if (!other || other.color !== color) continue;
    const at = polar(size, other.angle, other.radius);
    burst(state, at.x, at.y, hue(color).hex, 8);
    state.sparks.splice(i, 1);
    cleared += 1;
  }
  const bonus = (30 + cleared * 45) * (state.fever > 0 ? 2 : 1);
  state.score += bonus;
  state.banner = 'BLOOM';
  state.bannerTime = 1.05;
  state.flash = 0.7;
  state.flashColor = hue(color).hex;
  const center = size / 2;
  burst(state, center, center, hue(color).hex, 22);
  floater(state, center, center - ringInner(size) - 8, `+${bonus}`, '#FFFFFF');
  state.chainCount = 0;
  state.chainTime = 0;
  state.chainColor = null;
  events.push({ type: 'bloom' });
}

function finish(state: GameState, size: number, events: GameEvent[]): void {
  state.phase = 'over';
  state.isNewBest = state.score > state.best;
  if (state.score > state.best) state.best = state.score;
  if (state.maxCombo > state.bestCombo) state.bestCombo = state.maxCombo;
  const center = size / 2;
  burst(state, center, center, '#FFFFFF', 26);
  burst(state, center, center, '#FF4D6D', 18);
  burst(state, center, center, '#00F5D4', 14);
  events.push({ type: 'over' });
}

function present(state: GameState, dt: number): void {
  state.elapsed += dt;
  state.shake = Math.max(0, state.shake - dt * 2.5);
  state.flash = Math.max(0, state.flash - dt * 1.5);
  state.pulse = Math.max(0, state.pulse - dt * 2.4);
  state.bannerTime = Math.max(0, state.bannerTime - dt);

  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    if (!particle) continue;
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 40 * dt;
    if (particle.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const item = state.floaters[i];
    if (!item) continue;
    item.life -= dt;
    item.y -= 42 * dt;
    if (item.life <= 0) state.floaters.splice(i, 1);
  }
}

function pushSpark(state: GameState, size: number, forced?: SparkKind): void {
  const rainbowChance = Math.min(0.14, 0.055 + state.catches * 0.0012);
  const prismChance = 0.05;
  const rushChance = Math.min(0.36, 0.06 + state.catches * 0.008);
  const roll = Math.random();
  let kind: SparkKind = 'spark';
  if (forced) kind = forced;
  else if (roll < rainbowChance) kind = 'rainbow';
  else if (roll < rainbowChance + prismChance) kind = 'prism';
  else if (roll < rainbowChance + prismChance + rushChance) kind = 'rush';

  const color = Math.floor(Math.random() * state.colorCount);
  let angle = Math.random() * TAU;
  if (kind === 'spark' || kind === 'rush') {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (!colorMatches(angle, state.targetRotation, color, state.colorCount)) break;
      angle = wrapAngle(angle + TAU / state.colorCount / 2 + 0.18);
    }
  }

  const opening = state.catches === 0 && state.sparks.length === 0 ? 0.72 : 1;
  const rush = kind === 'rush' ? 1.5 : kind === 'prism' ? 0.82 : 1;
  state.sparks.push({
    id: state.nextId++,
    angle,
    radius: spawnRadius(size),
    color,
    speed: travelSpeed(state.catches, size) * rush * opening,
    kind,
  });
}

function travelSpeed(catches: number, size: number): number {
  const distance = spawnRadius(size) - catchRadius(size);
  const seconds = Math.max(0.74, 2.2 - catches * 0.028);
  return distance / seconds;
}

function spawnGap(catches: number): number {
  return Math.max(0.36, 1.28 - catches * 0.02);
}

function polar(size: number, angle: number, radius: number): { x: number; y: number } {
  const center = size / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function burst(state: GameState, x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU;
    const speed = 50 + Math.random() * 180;
    state.particles.push({
      id: state.nextId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.32 + Math.random() * 0.38,
      color,
      size: 3 + Math.random() * 5,
    });
  }
  if (state.particles.length > MAX_PARTICLES) {
    state.particles.splice(0, state.particles.length - MAX_PARTICLES);
  }
}

function floater(state: GameState, x: number, y: number, text: string, color: string): void {
  state.floaters.push({
    id: state.nextId++,
    x,
    y,
    text,
    life: 0.72,
    color,
  });
  if (state.floaters.length > 8) state.floaters.shift();
}

export function runSelfCheck(): void {
  assertGeometry();
  const profile: Profile = { best: 10, bestCombo: 2, haptics: false };
  const caught = createState(profile);
  caught.phase = 'playing';
  caught.colorCount = 4;
  caught.rotation = 0;
  caught.targetRotation = 0;
  caught.spawnIn = 99;
  caught.sparks = [
    {
      id: 1,
      angle: 0,
      radius: catchRadius(360) + 4,
      color: 0,
      speed: 800,
      kind: 'spark',
    },
  ];
  step(caught, 0.05, 360);
  if (caught.cracks !== 0 || caught.score <= 0 || caught.catches !== 1) {
    throw new Error(`catch check failed score=${caught.score} cracks=${caught.cracks}`);
  }

  const missed = createState(profile);
  missed.phase = 'playing';
  missed.colorCount = 4;
  missed.rotation = 0;
  missed.targetRotation = 0;
  missed.spawnIn = 99;
  missed.sparks = [
    {
      id: 1,
      angle: Math.PI,
      radius: catchRadius(360) + 4,
      color: 0,
      speed: 800,
      kind: 'spark',
    },
  ];
  step(missed, 0.05, 360);
  if (missed.cracks !== 1 || missed.score !== 0) {
    throw new Error(`miss check failed score=${missed.score} cracks=${missed.cracks}`);
  }

  const near = angleDiff(0.2, 0);
  if (near <= 0) throw new Error('angle diff');
}
