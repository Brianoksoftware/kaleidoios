import { petalAt, radii, TAU, wrapAngle } from './geometry';
import { HUES } from './palette';
import type { GameEvent, GameState, SaveData, Spark, SparkKind } from './types';

function colorCountFor(catches: number) {
  if (catches < 10) return 3;
  if (catches < 24) return 4;
  if (catches < 46) return 5;
  return 6;
}

function spawnInterval(catches: number) {
  if (catches < 4) return 2.35;
  return Math.max(0.42, 1.28 - catches * 0.016);
}

function sparkSpeed(size: number, catches: number, kind: SparkKind) {
  const base = size * (0.068 + Math.min(0.2, catches * 0.0036));
  if (kind === 'rush') return base * 1.58;
  if (kind === 'prism') return base * 0.82;
  return base;
}

function rollKind(catches: number, opening: boolean): SparkKind {
  if (opening) return 'normal';
  const roll = Math.random();
  if (catches > 8 && roll < 0.055) return 'prism';
  if (catches > 5 && roll < 0.13) return 'rainbow';
  if (catches > 10 && roll < 0.3) return 'rush';
  return 'normal';
}

function pickAngle(state: GameState, color: number, kind: SparkKind) {
  if (kind === 'rainbow' || kind === 'prism') return Math.random() * TAU;
  const sector = TAU / state.colorCount;
  let angle = Math.random() * TAU;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (petalAt(angle, state.targetRotation, state.colorCount) !== color) return angle;
    angle = wrapAngle(angle + sector * (0.45 + Math.random() * 0.2));
  }
  return angle;
}

export function createState(save: SaveData): GameState {
  return {
    phase: 'menu',
    score: 0,
    best: save.best,
    bestAtStart: save.best,
    bestCombo: save.bestCombo,
    combo: 0,
    maxCombo: 0,
    cracks: 0,
    fractures: [],
    rotation: -Math.PI / 2,
    targetRotation: -Math.PI / 2,
    sparks: [],
    particles: [],
    floaters: [],
    spawnIn: 0.35,
    colorCount: 3,
    fever: 0,
    slow: 0,
    chainColor: null,
    chainCount: 0,
    chainTime: 0,
    shake: 0,
    flash: 0,
    flashColor: HUES[0].hex,
    banner: '',
    bannerTime: 0,
    hue: 3,
    catches: 0,
    nextId: 1,
    haptics: save.haptics,
    sound: save.sound,
    elapsed: 0,
    shatterAt: 0,
    newBest: false,
  };
}

export function startRun(state: GameState) {
  const best = state.best;
  const bestCombo = state.bestCombo;
  const haptics = state.haptics;
  const sound = state.sound;
  const next = createState({ best, bestCombo, haptics, sound });
  Object.assign(state, next);
  state.phase = 'playing';
  state.bestAtStart = best;
  state.banner = 'MATCH THE HUE';
  state.bannerTime = 1.25;
  state.spawnIn = 0.45;
}

export function spin(state: GameState, direction: -1 | 1) {
  if (state.phase !== 'playing') return;
  const sector = TAU / state.colorCount;
  const pending = state.targetRotation - state.rotation;
  if (Math.abs(pending + direction * sector) > sector * 2.1) return;
  state.targetRotation += direction * sector;
}

function pushFloater(state: GameState, x: number, y: number, text: string, color: string) {
  state.floaters.push({
    id: state.nextId,
    x,
    y,
    text,
    life: 0.85,
    color,
  });
  state.nextId += 1;
  if (state.floaters.length > 10) state.floaters.splice(0, state.floaters.length - 10);
}

function burst(state: GameState, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU;
    const speed = 50 + Math.random() * 180;
    const life = 0.35 + Math.random() * 0.4;
    state.particles.push({
      id: state.nextId,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      max: life,
      color,
      size: 3 + Math.random() * 5,
    });
    state.nextId += 1;
  }
  if (state.particles.length > 48) {
    state.particles.splice(0, state.particles.length - 48);
  }
}

export function decayFx(state: GameState, dt: number) {
  state.elapsed += dt;
  state.flash = Math.max(0, state.flash - dt * 1.35);
  state.shake = Math.max(0, state.shake - dt * 2);
  state.bannerTime = Math.max(0, state.bannerTime - dt);
  let count = 0;
  const particles = state.particles;
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    particle.life -= dt;
    if (particle.life <= 0) continue;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 30 * dt;
    particles[count] = particle;
    count += 1;
  }
  particles.length = count;
  count = 0;
  const floaters = state.floaters;
  for (let index = 0; index < floaters.length; index += 1) {
    const floater = floaters[index];
    floater.life -= dt;
    if (floater.life <= 0) continue;
    floater.y -= 36 * dt;
    floaters[count] = floater;
    count += 1;
  }
  floaters.length = count;
}

function setBanner(state: GameState, text: string, time = 1.15) {
  state.banner = text;
  state.bannerTime = time;
}

function spawnSpark(state: GameState, size: number, opening: boolean) {
  const kind = rollKind(state.catches, opening);
  const color = Math.floor(Math.random() * state.colorCount);
  const spark: Spark = {
    id: state.nextId,
    angle: pickAngle(state, color, kind),
    radius: radii(size).spawn,
    color,
    speed: sparkSpeed(size, state.catches, kind) * (opening ? 0.7 : 1),
    kind,
  };
  state.nextId += 1;
  state.sparks.push(spark);
}

function bloom(state: GameState, x: number, y: number): GameEvent {
  const color = state.chainColor;
  if (color === null) return { type: 'bloom' };
  const doomed = state.sparks.filter((spark) => spark.kind !== 'prism' && spark.color === color);
  state.sparks = state.sparks.filter((spark) => spark.kind === 'prism' || spark.color !== color);
  const bonus = doomed.length * 40 * (state.fever > 0 ? 2 : 1);
  state.score += bonus;
  if (state.score > state.best) state.best = state.score;
  const hex = HUES[color].hex;
  burst(state, x, y, hex, 18 + doomed.length * 3);
  pushFloater(state, x, y - 18, bonus > 0 ? `BLOOM +${bonus}` : 'BLOOM', hex);
  setBanner(state, 'BLOOM', 1.25);
  state.flash = 0.72;
  state.flashColor = hex;
  state.chainCount = 0;
  state.chainTime = 0;
  return { type: 'bloom' };
}

function onCatch(state: GameState, spark: Spark, x: number, y: number): GameEvent[] {
  const events: GameEvent[] = [{ type: 'catch', kind: spark.kind }];
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.catches += 1;
  const feverMul = state.fever > 0 ? 2 : 1;
  let points = 10 * state.combo * feverMul;
  if (spark.kind === 'rush') points *= 2;
  if (spark.kind === 'rainbow') points += 50 * feverMul;
  if (spark.kind === 'prism') points += 35 * feverMul;
  state.score += points;
  if (state.score > state.best) state.best = state.score;

  const paint =
    spark.kind === 'rainbow' ? '#FFE566' : spark.kind === 'prism' ? '#F4F1FF' : HUES[spark.color].hex;
  state.hue = spark.kind === 'normal' || spark.kind === 'rush' ? spark.color : state.hue;
  state.flash = 0.38;
  state.flashColor = paint;
  burst(state, x, y, paint, spark.kind === 'rainbow' ? 16 : 9);
  pushFloater(state, x, y, `+${points}`, paint);

  if (spark.kind === 'prism') {
    state.slow = 3.8;
    setBanner(state, 'PRISM');
    events.push({ type: 'prism' });
  } else if (spark.kind === 'rainbow') {
    if (state.chainColor !== null && state.chainCount > 0) state.chainCount += 1;
    state.chainTime = 1.35;
  } else if (state.chainColor === spark.color && state.chainCount > 0) {
    state.chainCount += 1;
    state.chainTime = 1.35;
  } else {
    state.chainColor = spark.color;
    state.chainCount = 1;
    state.chainTime = 1.35;
  }

  if (state.combo === 5) setBanner(state, 'SWEET');
  if (state.combo === 10) setBanner(state, 'ON FIRE');
  if (state.combo === 15) setBanner(state, 'RAMPAGE');
  if (state.combo === 20) setBanner(state, 'MYTHIC');

  const feverStart = state.combo >= 8 && (state.combo === 8 || (state.combo - 8) % 4 === 0);
  if (feverStart) {
    const fresh = state.fever <= 0;
    state.fever = 8;
    if (fresh) {
      setBanner(state, 'FEVER', 1.3);
      events.push({ type: 'fever' });
    }
  }

  if (state.chainCount >= 3 && state.chainColor !== null && spark.kind !== 'prism') {
    events.push(bloom(state, x, y));
  }

  const nextColors = colorCountFor(state.catches);
  if (nextColors !== state.colorCount) {
    state.colorCount = nextColors;
    setBanner(state, `${nextColors} HUES`, 1.5);
    events.push({ type: 'hue' });
  }

  return events;
}

function shards(state: GameState, x: number, y: number, count: number, force: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU;
    const speed = (90 + Math.random() * 260) * force;
    const life = 0.45 + Math.random() * 0.5;
    state.particles.push({
      id: state.nextId,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40 * force,
      life,
      max: life,
      color: Math.random() < 0.6 ? '#F4F8FF' : '#BFE9FF',
      size: 1.5 + Math.random() * 3,
    });
    state.nextId += 1;
  }
  if (state.particles.length > 48) {
    state.particles.splice(0, state.particles.length - 48);
  }
}

function onMiss(state: GameState, angle: number, x: number, y: number): GameEvent[] {
  state.cracks += 1;
  state.combo = 0;
  state.chainColor = null;
  state.chainCount = 0;
  state.chainTime = 0;
  state.fever = 0;
  state.shake = 0.55;
  state.flash = 0.34;
  state.flashColor = '#FF4D6D';
  state.fractures.push({
    angle,
    seed: Math.floor(Math.random() * 1e9),
    born: state.elapsed,
    generation: state.cracks,
  });
  burst(state, x, y, '#FF4D6D', 8);
  shards(state, x, y, 10 + state.cracks * 8, 0.85 + state.cracks * 0.25);
  pushFloater(state, x, y, 'CRACK', '#FF8FA3');
  if (state.cracks >= 3) {
    state.phase = 'over';
    state.shatterAt = state.elapsed;
    state.newBest = state.score > state.bestAtStart;
    state.bestCombo = Math.max(state.bestCombo, state.maxCombo);
    state.shake = 1.15;
    state.flash = 0.78;
    state.flashColor = '#F4F8FF';
    shards(state, x, y, 24, 1.7);
    setBanner(state, 'SHATTERED', 2);
    return [{ type: 'miss' }, { type: 'over' }];
  }
  return [{ type: 'miss' }];
}

const NO_EVENTS: GameEvent[] = [];
const arrivedScratch: Spark[] = [];

export function step(state: GameState, dt: number, size: number): GameEvent[] {
  const delta = Math.min(Math.max(dt, 0), 0.05);
  decayFx(state, delta);
  if (state.phase !== 'playing' || size < 80) return NO_EVENTS;

  const turn = state.targetRotation - state.rotation;
  state.rotation += turn * Math.min(1, delta * 24);
  if (Math.abs(state.targetRotation - state.rotation) < 0.001) {
    state.rotation = state.targetRotation;
  }

  if (state.fever > 0) state.fever = Math.max(0, state.fever - delta);
  if (state.slow > 0) state.slow = Math.max(0, state.slow - delta);
  if (state.chainTime > 0) {
    state.chainTime = Math.max(0, state.chainTime - delta);
    if (state.chainTime === 0) {
      state.chainCount = 0;
      state.chainColor = null;
    }
  }

  const drag = state.slow > 0 ? 0.46 : 1;
  const catchAt = size * 0.325;
  arrivedScratch.length = 0;
  const sparks = state.sparks;
  let count = 0;
  for (let index = 0; index < sparks.length; index += 1) {
    const spark = sparks[index];
    spark.radius -= spark.speed * drag * delta;
    if (spark.radius <= catchAt) arrivedScratch.push(spark);
    else {
      sparks[count] = spark;
      count += 1;
    }
  }
  sparks.length = count;
  let events = NO_EVENTS;
  if (arrivedScratch.length > 0) {
    events = [];
    for (const spark of arrivedScratch) {
      if (state.phase !== 'playing') break;
      const x = size / 2 + Math.cos(spark.angle) * Math.max(spark.radius, catchAt);
      const y = size / 2 + Math.sin(spark.angle) * Math.max(spark.radius, catchAt);
      const matched =
        spark.kind === 'rainbow' ||
        spark.kind === 'prism' ||
        petalAt(spark.angle, state.targetRotation, state.colorCount) === spark.color;
      events.push(...(matched ? onCatch(state, spark, x, y) : onMiss(state, spark.angle, x, y)));
    }
  }

  if (state.phase === 'playing') {
    state.spawnIn -= delta;
    if (state.spawnIn <= 0 && state.sparks.length < (state.catches < 4 ? 1 : 7)) {
      spawnSpark(state, size, state.catches === 0 && state.sparks.length === 0);
      state.spawnIn = spawnInterval(state.catches) * (0.78 + Math.random() * 0.4);
    }
  }

  return events.length > 0 ? events : NO_EVENTS;
}
