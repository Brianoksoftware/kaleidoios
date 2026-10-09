export type Phase = 'menu' | 'playing' | 'paused' | 'over';

export type SparkKind = 'spark' | 'rush' | 'rainbow' | 'prism';

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

export type GameEvent =
  | { type: 'catch' }
  | { type: 'miss' }
  | { type: 'bloom' }
  | { type: 'prism' }
  | { type: 'fever' }
  | { type: 'hue' }
  | { type: 'over' };

export type GameState = {
  phase: Phase;
  score: number;
  best: number;
  bestCombo: number;
  combo: number;
  maxCombo: number;
  cracks: number;
  rotation: number;
  targetRotation: number;
  sparks: Spark[];
  particles: Particle[];
  floaters: Floater[];
  spawnIn: number;
  colorCount: number;
  fever: number;
  prism: number;
  chainColor: number | null;
  chainCount: number;
  chainTime: number;
  shake: number;
  banner: string;
  bannerTime: number;
  flash: number;
  flashColor: string;
  pulse: number;
  pulseColor: number;
  catches: number;
  nextId: number;
  isNewBest: boolean;
  haptics: boolean;
  elapsed: number;
  glow: number;
};
