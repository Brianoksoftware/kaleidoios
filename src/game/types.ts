export type Phase = 'menu' | 'playing' | 'paused' | 'over';

export type SparkKind = 'normal' | 'rush' | 'rainbow' | 'prism';

export type Spark = {
  id: number;
  angle: number;
  radius: number;
  color: number;
  speed: number;
  kind: SparkKind;
};

export type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};

export type Floater = {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
};

export type Fracture = {
  angle: number;
  seed: number;
  born: number;
  generation: number;
};

export type GameState = {
  phase: Phase;
  score: number;
  best: number;
  bestAtStart: number;
  bestCombo: number;
  combo: number;
  maxCombo: number;
  cracks: number;
  fractures: Fracture[];
  rotation: number;
  targetRotation: number;
  sparks: Spark[];
  particles: Particle[];
  floaters: Floater[];
  spawnIn: number;
  colorCount: number;
  fever: number;
  slow: number;
  chainColor: number | null;
  chainCount: number;
  chainTime: number;
  shake: number;
  flash: number;
  flashColor: string;
  banner: string;
  bannerTime: number;
  hue: number;
  catches: number;
  nextId: number;
  haptics: boolean;
  sound: boolean;
  elapsed: number;
  shatterAt: number;
  newBest: boolean;
  /** True after the one rewarded continue in this run has been used. */
  revived: boolean;
};

export type SaveData = {
  best: number;
  bestCombo: number;
  haptics: boolean;
  sound: boolean;
  adsRemoved?: boolean;
};

export type GameEvent =
  | { type: 'catch'; kind: SparkKind }
  | { type: 'miss' }
  | { type: 'bloom' }
  | { type: 'fever' }
  | { type: 'hue' }
  | { type: 'prism' }
  | { type: 'over' };
