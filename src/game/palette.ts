export const INK = '#140824';
export const NIGHT = '#070514';

export type Hue = {
  name: string;
  hex: string;
};

export const HUES: Hue[] = [
  { name: 'Coral', hex: '#FF4D6D' },
  { name: 'Amber', hex: '#FFBE0B' },
  { name: 'Lime', hex: '#70E000' },
  { name: 'Aqua', hex: '#00F5D4' },
  { name: 'Violet', hex: '#9B5DE5' },
  { name: 'Pink', hex: '#F15BB5' },
];

export const RAINBOW = '#FFE566';
export const PRISM = '#F4F1FF';

export function hue(index: number): Hue {
  const safe = ((index % HUES.length) + HUES.length) % HUES.length;
  return HUES[safe] ?? HUES[0];
}

export function rankName(catches: number) {
  return waveName(catches);
}

/** Wave tiers, lowest first. `at` is the catch count that unlocks the tier. */
export const WAVES = [
  { name: 'Spark', at: 0, color: '#00F5D4' },
  { name: 'Gleam', at: 10, color: '#70E000' },
  { name: 'Prism', at: 24, color: '#9B5DE5' },
  { name: 'Nova', at: 46, color: '#FFBE0B' },
  { name: 'Supernova', at: 70, color: '#F15BB5' },
  { name: 'Mythic', at: 110, color: '#FFE566' },
] as const;

function waveIndex(catches: number) {
  let index = 0;
  for (let i = 0; i < WAVES.length; i += 1) {
    if (catches >= WAVES[i].at) index = i;
  }
  return index;
}

export function waveName(catches: number) {
  return WAVES[waveIndex(catches)].name;
}

/** Current tier, the next one (if any) and 0..1 progress toward it. */
export function waveProgress(catches: number) {
  const index = waveIndex(catches);
  const current = WAVES[index];
  const next = WAVES[index + 1];
  if (!next) return { name: current.name, color: current.color, next: null, progress: 1, into: 0, span: 0 };
  const span = next.at - current.at;
  const into = catches - current.at;
  return { name: current.name, color: current.color, next: next.name, progress: into / span, into, span };
}

/** Blend two #RRGGBB colors. t = 0 keeps `from`, t = 1 returns `to`. */
export function mix(from: string, to: string, t: number) {
  const a = parseInt(from.slice(1, 7), 16);
  const b = parseInt(to.slice(1, 7), 16);
  const channel = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  const value = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** #RRGGBB plus alpha 0..1 → #RRGGBBAA */
export function alpha(hex: string, amount: number) {
  const a = Math.round(Math.max(0, Math.min(1, amount)) * 255);
  return `${hex.slice(0, 7)}${a.toString(16).padStart(2, '0')}`;
}
