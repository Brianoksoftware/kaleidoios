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

export function waveName(catches: number) {
  if (catches >= 110) return 'Mythic';
  if (catches >= 70) return 'Supernova';
  if (catches >= 46) return 'Nova';
  if (catches >= 24) return 'Prism';
  if (catches >= 10) return 'Gleam';
  return 'Spark';
}
