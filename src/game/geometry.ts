export const TAU = Math.PI * 2;

export function wrapAngle(angle: number) {
  const wrapped = angle % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

export function petalAt(angle: number, rotation: number, colorCount: number) {
  const sector = TAU / colorCount;
  const shifted = wrapAngle(angle - rotation + sector / 2);
  return Math.floor(shifted / sector) % colorCount;
}

export function sectorPath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
) {
  const large = end - start > Math.PI ? 1 : 0;
  const point = (radius: number, angle: number) => {
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  return [
    `M ${point(outer, start)}`,
    `A ${outer.toFixed(2)} ${outer.toFixed(2)} 0 ${large} 1 ${point(outer, end)}`,
    `L ${point(inner, end)}`,
    `A ${inner.toFixed(2)} ${inner.toFixed(2)} 0 ${large} 0 ${point(inner, start)}`,
    'Z',
  ].join(' ');
}

export function radii(size: number) {
  return {
    spawn: size * 0.47,
    catchAt: size * 0.325,
    ringOuter: size * 0.3,
    ringInner: size * 0.15,
  };
}
