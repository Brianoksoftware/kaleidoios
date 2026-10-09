export const TAU = Math.PI * 2;

export function wrapAngle(angle: number): number {
  const wrapped = angle % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

export function angleDiff(a: number, b: number): number {
  const d = wrapAngle(a - b);
  return d > Math.PI ? TAU - d : d;
}

export function colorMatches(
  angle: number,
  rotation: number,
  color: number,
  colorCount: number,
): boolean {
  const sector = TAU / colorCount;
  const center = rotation + color * sector;
  return angleDiff(angle, center) <= sector * 0.58;
}

export function sectorPath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const point = (radius: number, angle: number) => {
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return `${x} ${y}`;
  };
  return [
    `M ${point(r1, a0)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${point(r1, a1)}`,
    `L ${point(r0, a1)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${point(r0, a0)}`,
    'Z',
  ].join(' ');
}

export function assertGeometry(): void {
  const quarter = TAU / 4;
  if (colorMatches(0, 0, 0, 4) !== true) {
    throw new Error('east spark should match petal 0');
  }
  if (colorMatches(quarter, 0, 0, 4) !== false) {
    throw new Error('south spark should miss petal 0');
  }
  if (colorMatches(0, quarter, 3, 4) !== true) {
    throw new Error('rotated ring should bring petal 3 to the east');
  }
}
