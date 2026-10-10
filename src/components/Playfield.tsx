import { forwardRef, memo, useImperativeHandle, useRef, type RefObject } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { flyingShards, fracturePaths, fractureProgress, shatterPaths, shockRadius, type FlyingShard } from '../game/fracture';
import { petalAt, radii, sectorPath, TAU } from '../game/geometry';
import { HUES, PRISM, RAINBOW } from '../game/palette';
import type { GameState, Phase, SparkKind } from '../game/types';

const SPARK_SLOTS = 7;
const PARTICLE_SLOTS = 24;
const FLOATER_SLOTS = 6;

type NativeNode = { setNativeProps: (props: object) => void };

function commit(node: NativeNode | null | undefined, props: Record<string, unknown>) {
  if (!node) return;
  // Web SVG applies prop updates from `style`. Native views take the props directly.
  if (Platform.OS === 'web') node.setNativeProps({ style: props });
  else node.setNativeProps(props);
}

function commitView(node: View | null, style: Record<string, unknown>) {
  if (!node) return;
  const host = node as View & { setNativeProps?: (props: object) => void };
  if (typeof host.setNativeProps === 'function') {
    host.setNativeProps({ style });
    return;
  }
  const element = node as unknown as HTMLElement;
  const next: Record<string, string> = {};
  if (typeof style.opacity === 'number') next.opacity = String(style.opacity);
  if (typeof style.left === 'number') next.left = `${style.left}px`;
  if (typeof style.top === 'number') next.top = `${style.top}px`;
  if (typeof style.width === 'number') next.width = `${style.width}px`;
  if (typeof style.height === 'number') next.height = `${style.height}px`;
  if (typeof style.backgroundColor === 'string') next.backgroundColor = style.backgroundColor;
  if (Array.isArray(style.transform)) {
    const shift = style.transform.find(
      (item) => item && typeof item === 'object' && 'translateX' in item,
    ) as { translateX?: number } | undefined;
    if (shift) next.transform = `translateX(${shift.translateX ?? 0}px)`;
  }
  Object.assign(element.style, next);
}

export type StageHandle = {
  draw: (state: GameState) => void;
};

type Props = {
  stateRef: RefObject<GameState>;
  size: number;
  colorCount: number;
  cracks: number;
  phase: Phase;
  hue: number;
  fever: boolean;
  revision: number;
  combo: number;
  chainCount: number;
  banner: string;
  bannerOn: boolean;
};

function sparkPaint(kind: SparkKind, color: number) {
  if (kind === 'rainbow') return RAINBOW;
  if (kind === 'prism') return PRISM;
  return HUES[color].hex;
}

export const PlayStage = memo(
  forwardRef<StageHandle, Props>(function PlayStage(
    { stateRef, size, colorCount, cracks, phase, hue, fever, combo, chainCount, banner, bannerOn },
    ref,
  ) {
    const boardRef = useRef<View>(null);
    const ringRef = useRef<NativeNode>(null);
    const petalRefs = useRef<(NativeNode | null)[]>([]);
    const sparkRefs = useRef<(NativeNode | null)[]>([]);
    const diamondRefs = useRef<(NativeNode | null)[]>([]);
    const markerRef = useRef<NativeNode>(null);
    const particleRefs = useRef<(NativeNode | null)[]>([]);
    const shockRefs = useRef<(NativeNode | null)[]>([]);
    const floaterRefs = useRef<(View | null)[]>([]);
    const shardRefs = useRef<(NativeNode | null)[]>([]);
    const flashRef = useRef<View>(null);
    const flashOpacity = useRef(0);
    const aimRef = useRef(-2);
    const colorCountRef = useRef(colorCount);
    const shakeRef = useRef(0);
    const sparkLimit = useRef(0);
    const particleLimit = useRef(0);
    const markerOn = useRef(false);
    const shownFloaters = useRef(stateRef.current?.floaters.slice(-FLOATER_SLOTS) ?? []);
    shownFloaters.current = stateRef.current?.floaters.slice(-FLOATER_SLOTS) ?? [];
    const sizeRef = useRef(size);
    sizeRef.current = size;
    if (colorCountRef.current !== colorCount) {
      colorCountRef.current = colorCount;
      aimRef.current = -2;
    }

    const state = stateRef.current;
    const cx = size / 2;
    const cy = size / 2;
    const { ringOuter, ringInner, catchAt } = radii(size);
    const sector = TAU / Math.max(1, colorCount);
    const gap = sector * 0.1;
    const shattered = phase === 'over';
    const frost = Math.min(0.42, cracks * 0.14);
    const shardPieces = useRef<{ key: string; pieces: FlyingShard[] } | null>(null);
    if (shattered && state) {
      const key = `${state.fractures[0]?.seed ?? 7}:${colorCount}:${size}`;
      if (shardPieces.current?.key !== key) {
        shardPieces.current = {
          key,
          pieces: flyingShards(
            state.fractures[0]?.seed ?? 7,
            cx,
            cy,
            ringInner,
            ringOuter,
            colorCount,
            state.rotation,
            HUES.map((item) => item.hex),
            1,
          ),
        };
      }
    }

    useImperativeHandle(ref, () => ({
      draw(live) {
        const field = sizeRef.current;
        const center = field / 2;
        const catchAt = field * 0.325;
        const degrees = (live.rotation * 180) / Math.PI;
        commit(ringRef.current, {
          rotation: degrees,
          originX: center,
          originY: center,
        });

        let nearest: (typeof live.sparks)[number] | null = null;
        if (live.phase !== 'over') {
          for (let index = 0; index < live.sparks.length; index += 1) {
            const spark = live.sparks[index];
            if (!nearest || spark.radius < nearest.radius) nearest = spark;
          }
        }
        const aim = nearest ? petalAt(nearest.angle, live.targetRotation, live.colorCount) : -1;
        if (aim !== aimRef.current) {
          const previous = petalRefs.current[aimRef.current];
          commit(previous, { stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1.5 });
          commit(petalRefs.current[aim], { stroke: '#FFFFFF', strokeWidth: 5 });
          aimRef.current = aim;
        }

        const visibleSparks = nearest ? live.sparks.length : 0;
        const sparkScan = Math.max(sparkLimit.current, visibleSparks);
        if (sparkScan > 0) {
          for (let index = 0; index < sparkScan; index += 1) {
            const spark = index < visibleSparks ? live.sparks[index] : undefined;
            const circle = sparkRefs.current[index];
            const diamond = diamondRefs.current[index];
            if (!spark) {
              commit(circle, { opacity: 0 });
              commit(diamond, { opacity: 0 });
              continue;
            }
            const x = center + Math.cos(spark.angle) * spark.radius;
            const y = center + Math.sin(spark.angle) * spark.radius;
            const ink = sparkPaint(spark.kind, spark.color);
            if (spark.kind === 'rush') {
              commit(circle, { opacity: 0 });
              commit(diamond, {
                opacity: 1,
                fill: ink,
                d: `M ${x} ${y - 13} L ${x + 11} ${y} L ${x} ${y + 13} L ${x - 11} ${y} Z`,
              });
            } else {
              commit(diamond, { opacity: 0 });
              commit(circle, {
                opacity: 1,
                cx: x,
                cy: y,
                r: spark.kind === 'prism' ? 13 : 11,
                fill: ink,
              });
            }
          }
        }
        sparkLimit.current = visibleSparks;

        if (nearest) {
          markerOn.current = true;
          commit(markerRef.current, {
            opacity: 1,
            cx: center + Math.cos(nearest.angle) * catchAt,
            cy: center + Math.sin(nearest.angle) * catchAt,
            fill: sparkPaint(nearest.kind, nearest.color),
          });
        } else if (markerOn.current) {
          markerOn.current = false;
          commit(markerRef.current, { opacity: 0 });
        }

        const shown = Math.min(live.particles.length, PARTICLE_SLOTS);
        const particleScan = Math.max(particleLimit.current, shown);
        if (particleScan > 0) {
          const first = live.particles.length - shown;
          for (let index = 0; index < particleScan; index += 1) {
            const particle = index < shown ? live.particles[first + index] : undefined;
            const node = particleRefs.current[index];
            if (!particle) {
              commit(node, { opacity: 0 });
              continue;
            }
            commit(node, {
              opacity: Math.max(0, particle.life / particle.max),
              cx: particle.x,
              cy: particle.y,
              r: Math.max(0.5, particle.size * (particle.life / particle.max)),
              fill: particle.color,
            });
          }
        }
        particleLimit.current = shown;

        for (let index = 0; index < 3; index += 1) {
          const fracture = live.fractures[index];
          const node = shockRefs.current[index];
          if (!fracture) {
            commit(node, { opacity: 0 });
            continue;
          }
          const progress = fractureProgress(fracture, live.elapsed);
          const fresh = 1 - progress;
          commit(node, {
            opacity: fresh > 0.08 ? 1 : 0,
            r: shockRadius(progress, catchAt),
            cx: center + Math.cos(fracture.angle) * catchAt,
            cy: center + Math.sin(fracture.angle) * catchAt,
            stroke: `rgba(244,248,255,${fresh * 0.7})`,
            fill: `rgba(190,230,255,${fresh * 0.12})`,
          });
        }

        const pieces = shardPieces.current?.pieces;
        if (live.phase === 'over' && pieces && live.shatterAt > 0) {
          const t = Math.min(1, (live.elapsed - live.shatterAt) / 0.9);
          const ease = 1 - (1 - t) * (1 - t);
          for (let index = 0; index < pieces.length; index += 1) {
            const piece = pieces[index];
            commit(shardRefs.current[index], {
              opacity: Math.max(0, 1 - t * 0.82),
              translateX: piece.tx * ease,
              translateY: piece.ty * ease,
              rotation: piece.spin * ease,
              originX: center,
              originY: center,
            });
          }
        }

        const liveFloaters = live.floaters;
        for (let index = 0; index < FLOATER_SLOTS; index += 1) {
          const shown = shownFloaters.current[index];
          const floater = shown ? liveFloaters.find((item) => item.id === shown.id) : undefined;
          const node = floaterRefs.current[index];
          if (!floater) {
            commitView(node, { opacity: 0 });
            continue;
          }
          const opacity = Math.max(0, floater.life);
          commitView(node, {
            position: 'absolute',
            left: floater.x - 40,
            top: floater.y - 12,
            width: 80,
            opacity,
          });
        }

        const shake = live.shake > 0 ? Math.sin(live.elapsed * 48) * live.shake * 10 : 0;
        if (shake !== 0 || shakeRef.current !== 0) {
          shakeRef.current = shake;
          commitView(boardRef.current, {
            width: field,
            height: field,
            transform: [{ translateX: shake }],
          });
        }
        if (live.flash > 0.02 || flashOpacity.current > 0.01) {
          flashOpacity.current = live.flash * 0.28;
          commitView(flashRef.current, {
            opacity: flashOpacity.current,
            backgroundColor: live.flash > 0.02 ? live.flashColor : 'transparent',
          });
        }
      },
    }));

    const floaters = state?.floaters.slice(-FLOATER_SLOTS) ?? [];
    const pieces = shardPieces.current?.pieces ?? [];

    return (
      <View ref={boardRef} collapsable={false} style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={ringOuter + 16} fill="#12061F" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
          {!shattered && (
            <G ref={ringRef as never} originX={cx} originY={cy} rotation={(state?.rotation ?? -Math.PI / 2) * (180 / Math.PI)}>
              {Array.from({ length: colorCount }, (_, index) => {
                const center = index * sector;
                return (
                  <Path
                    key={HUES[index].name}
                    ref={(node) => {
                      petalRefs.current[index] = node as NativeNode | null;
                    }}
                    d={sectorPath(cx, cy, ringInner, ringOuter, center - sector / 2 + gap / 2, center + sector / 2 - gap / 2)}
                    fill={HUES[index].hex}
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </G>
          )}
          {shattered &&
            pieces.map((piece, index) => (
              <G
                key={`shard-${index}`}
                ref={(node) => {
                  shardRefs.current[index] = node as NativeNode | null;
                }}
                opacity={1}
              >
                <Path d={piece.d} fill={piece.fill} stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} />
              </G>
            ))}
          {frost > 0 && !shattered && (
            <Circle
              cx={cx}
              cy={cy}
              r={(ringOuter + ringInner) / 2}
              stroke={`rgba(220,240,255,${0.18 + frost})`}
              strokeWidth={ringOuter - ringInner}
              fill="none"
            />
          )}
          <Circle cx={cx} cy={cy} r={ringInner - 3} fill="#1A0B2E" />
          <Circle cx={cx} cy={cy} r={ringInner * 0.58} fill={fever ? '#FF4D6D' : HUES[hue].hex} />
          {state?.fractures.map((fracture, index) =>
            fracturePaths(fracture, cx, cy, catchAt, ringOuter, ringInner, 1).map((d, pathIndex) => (
              <Path
                key={`crack-${index}-${pathIndex}`}
                d={d}
                stroke={pathIndex % 2 === 0 ? 'rgba(160,220,255,0.55)' : '#F8FCFF'}
                strokeWidth={pathIndex < 2 ? 2.4 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )),
          )}
          {shattered &&
            shatterPaths(state?.fractures[0]?.seed ?? 7, cx, cy, ringOuter + 28, 1).map((d, index) => (
              <Path
                key={`shatter-${index}`}
                d={d}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={index < 14 ? 1.6 : 1.1}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          {Array.from({ length: 3 }, (_, index) => (
            <Circle
              key={`shock-${index}`}
              ref={(node) => {
                shockRefs.current[index] = node as NativeNode | null;
              }}
              cx={cx}
              cy={cy}
              r={1}
              opacity={0}
              fill="transparent"
              stroke="transparent"
            />
          ))}
          {Array.from({ length: SPARK_SLOTS }, (_, index) => (
            <Circle
              key={`spark-${index}`}
              ref={(node) => {
                sparkRefs.current[index] = node as NativeNode | null;
              }}
              cx={cx}
              cy={cy}
              r={11}
              opacity={0}
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}
          {Array.from({ length: SPARK_SLOTS }, (_, index) => (
            <Path
              key={`diamond-${index}`}
              ref={(node) => {
                diamondRefs.current[index] = node as NativeNode | null;
              }}
              d={`M ${cx} ${cy} L ${cx} ${cy} L ${cx} ${cy} Z`}
              opacity={0}
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}
          <Circle
            ref={markerRef as never}
            cx={cx}
            cy={cy}
            r={5}
            opacity={0}
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          {Array.from({ length: PARTICLE_SLOTS }, (_, index) => (
            <Circle
              key={`particle-${index}`}
              ref={(node) => {
                particleRefs.current[index] = node as NativeNode | null;
              }}
              cx={cx}
              cy={cy}
              r={1}
              opacity={0}
              fill="#FFFFFF"
            />
          ))}
        </Svg>
        <View style={styles.core} pointerEvents="none">
          <Text style={styles.combo}>{combo > 0 ? `${combo}×` : 'GO'}</Text>
          <Text style={styles.coreSub}>{fever ? 'FEVER' : chainCount > 0 ? `${chainCount}/3` : 'HUE'}</Text>
        </View>
        {bannerOn && (
          <View style={styles.bannerWrap} pointerEvents="none">
            <Text style={styles.banner}>{banner}</Text>
          </View>
        )}
        {Array.from({ length: FLOATER_SLOTS }, (_, index) => {
          const floater = floaters[index];
          return (
            <View
              key={floater?.id ?? `empty-${index}`}
              ref={(node) => {
                floaterRefs.current[index] = node;
              }}
              pointerEvents="none"
              style={[
                styles.floater,
                floater
                  ? { left: floater.x - 40, top: floater.y - 12, opacity: Math.max(0, floater.life) }
                  : styles.floaterHidden,
              ]}
            >
              <Text style={[styles.floaterText, { color: floater?.color ?? '#FFFFFF' }]}>{floater?.text ?? ''}</Text>
            </View>
          );
        })}
        <View
          ref={flashRef}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: flashOpacity.current, backgroundColor: state?.flashColor ?? 'transparent' }]}
        />
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  combo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  coreSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  bannerWrap: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  banner: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(8,4,20,0.55)',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  floater: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
  },
  floaterHidden: {
    opacity: 0,
    left: 0,
    top: 0,
  },
  floaterText: {
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center',
  },
});
