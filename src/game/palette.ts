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

export function hue(index: number): Hue {
  const safe = ((index % HUES.length) + HUES.length) % HUES.length;
  return HUES[safe] ?? HUES[0];
}

export function rankName(catches: number): string {
  if (catches >= 110) return 'Mythic';
  if (catches >= 70) return 'Supernova';
  if (catches >= 40) return 'Nova';
  if (catches >= 20) return 'Prism';
  if (catches >= 8) return 'Gleam';
  return 'Spark';
}

export function colorCountFor(catches: number): number {
  if (catches >= 42) return 6;
  if (catches >= 24) return 5;
  if (catches >= 10) return 4;
  return 3;
}
