import { createState, spin, startRun, step } from '../src/game/engine';
import { petalAt, TAU } from '../src/game/geometry';

const save = { best: 0, bestCombo: 0, haptics: false, sound: false };

const hit = createState(save);
hit.phase = 'playing';
hit.colorCount = 4;
hit.spawnIn = 99;
hit.rotation = 0;
hit.targetRotation = 0;
const color = petalAt(0, 0, 4);
hit.sparks = [
  { id: 1, angle: 0, radius: 360 * 0.325 + 6, color, speed: 5000, kind: 'normal' },
];
step(hit, 0.05, 360);
if (hit.cracks !== 0 || hit.score <= 0) {
  throw new Error(`expected a catch, score=${hit.score} cracks=${hit.cracks}`);
}

const miss = createState(save);
miss.phase = 'playing';
miss.colorCount = 4;
miss.spawnIn = 99;
miss.rotation = 0;
miss.targetRotation = 0;
miss.sparks = [
  { id: 1, angle: Math.PI, radius: 360 * 0.325 + 6, color: petalAt(0, 0, 4), speed: 5000, kind: 'normal' },
];
step(miss, 0.05, 360);
if (miss.cracks !== 1) {
  throw new Error(`expected a crack, cracks=${miss.cracks} score=${miss.score}`);
}
if (miss.fractures.length !== 1) {
  throw new Error(`expected a glass fracture, fractures=${miss.fractures.length}`);
}

let bestCatches = 0;
let worstCatches = 999;
for (let run = 0; run < 6; run += 1) {
  const live = createState(save);
  startRun(live);
  for (let frame = 0; frame < 2400 && live.phase === 'playing'; frame += 1) {
    const spark = live.sparks.reduce<(typeof live.sparks)[number] | null>((best, item) => {
      if (!best || item.radius < best.radius) return item;
      return best;
    }, null);
    if (spark && spark.kind !== 'rainbow' && spark.kind !== 'prism') {
      const sector = TAU / live.colorCount;
      let diff = spark.angle - spark.color * sector - live.targetRotation;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      if (Math.abs(diff) > sector * 0.5) spin(live, diff > 0 ? 1 : -1);
    }
    step(live, 0.016, 360);
    if (!Number.isFinite(live.score) || live.sparks.length > 7) {
      throw new Error(`diverged score=${live.score} sparks=${live.sparks.length}`);
    }
  }
  bestCatches = Math.max(bestCatches, live.catches);
  worstCatches = Math.min(worstCatches, live.catches);
  console.log(`run ${run} score=${live.score} phase=${live.phase} catches=${live.catches}`);
}

if (bestCatches < 8 || worstCatches < 2) {
  throw new Error(`runs were too short best=${bestCatches} worst=${worstCatches}`);
}
