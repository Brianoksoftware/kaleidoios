import { forwardRef, memo, useImperativeHandle, useRef, type RefObject } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { flyingShards, fracturePaths, fractureProgress, shatterPaths, shockRadius, type FlyingShard } from '../game/fracture';
import { petalAt, radii, sectorPath, TAU } from '../game/geometry';
import { HUES, mix, PRISM, RAINBOW } from '../game/palette';
import { fitFont } from './ui';
import type { GameState, Phase, SparkKind } from '../game/types';

const SPARK_SLOTS = 7;
const PARTICLE_SLOTS = 12;
const FLOATER_SLOTS = 6;
const SPARK_SIZE = 22;
const DIAMOND_SIZE = 16;
const MARKER_SIZE = 10;
const PARTICLE_SIZE = 8;

type NativeNode = { setNativeProps: (props: object) => void };

function commit(node: NativeNode | null | undefined, props: Record<string, unknown>) {
  if (!node) return;
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
  if (!element?.style) return;
  const next: Record<string, string> = {};
  if (typeof style.opacity === 'number') next.opacity = String(style.opacity);
  if (typeof style.backgroundColor === 'string') next.backgroundColor = style.backgroundColor;
  if (Array.isArray(style.transform)) {
    const parts: string[] = [];
    for (const item of style.transform) {
      if (item && typeof item === 'object') {
        const t = item as Record<string, unknown>;
        if (typeof t.translateX === 'number') parts.push(`translateX(${t.translateX}px)`);
        if (typeof t.translateY === 'number') parts.push(`translateY(${t.translateY}px)`);
        if (typeof t.rotate === 'string') parts.push(`rotate(${t.rotate})`);
        if (typeof t.scale === 'number') parts.push(`scale(${t.scale})`);
      }
    }
    if (parts.length > 0) next.transform = parts.join(' ');
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
    { stateRef, size, colorCount, cracks, phase, hue, fever, combo, chainCount },
    ref,
  ) {
    const boardRef = useRef<View>(null);
    const ringViewRef = useRef<View>(null);
    const petalRefs = useRef<(NativeNode | null)[]>([]);
    const sparkRefs = useRef<(View | null)[]>([]);
    const diamondRefs = useRef<(View | null)[]>([]);
    const markerRef = useRef<View>(null);
    const particleRefs = useRef<(View | null)[]>([]);
    const shockRingRefs = useRef<(NativeNode | null)[]>([]);
    const shockFillRefs = useRef<(NativeNode | null)[]>([]);
    const shockEchoRefs = useRef<(NativeNode | null)[]>([]);
    const floaterRefs = useRef<(View | null)[]>([]);
    const shardRefs = useRef<(NativeNode | null)[]>([]);
    const flashRef = useRef<View>(null);
    const flashOpacity = useRef(0);
    const aimRef = useRef(-2);
    const colorCountRef = useRef(colorCount);
    const shakeRef = useRef(0);
    const markerOn = useRef(false);
    const lastDegrees = useRef(-999);

    // Activity trackers to avoid redundant bridge calls
    const sparkActive = useRef<boolean[]>(new Array(SPARK_SLOTS).fill(false));
    const diamondActive = useRef<boolean[]>(new Array(SPARK_SLOTS).fill(false));
    const particleActive = useRef<boolean[]>(new Array(PARTICLE_SLOTS).fill(false));
    const sparkPose = useRef(Array.from({ length: SPARK_SLOTS }, () => ({ x: -9999, y: -9999, color: '' })));
    const particlePose = useRef(Array.from({ length: PARTICLE_SLOTS }, () => ({ x: -9999, y: -9999, color: '' })));
    const shockActive = useRef<boolean[]>([false, false, false]);
    const floaterActive = useRef<boolean[]>(new Array(FLOATER_SLOTS).fill(false));

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
        const catchAtRadius = field * 0.325;

        // 1. Hardware GPU view transform for the rotating petals
        const degrees = (live.rotation * 180) / Math.PI;
        if (Math.abs(degrees - lastDegrees.current) > 0.02) {
          lastDegrees.current = degrees;
          commitView(ringViewRef.current, {
            transform: [{ rotate: `${degrees}deg` }],
          });
        }

        // 2. Aim highlight on the target petal
        let nearest: (typeof live.sparks)[number] | null = null;
        if (live.phase !== 'over') {
          for (let index = 0; index < live.sparks.length; index += 1) {
            const spark = live.sparks[index];
            if (!nearest || spark.radius < nearest.radius) nearest = spark;
          }
        }
        const aim = nearest ? petalAt(nearest.angle, live.targetRotation, live.colorCount) : -1;
        if (aim !== aimRef.current) {
          if (aimRef.current >= 0 && petalRefs.current[aimRef.current]) {
            commit(petalRefs.current[aimRef.current], { stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1.5 });
          }
          if (aim >= 0 && petalRefs.current[aim]) {
            commit(petalRefs.current[aim], { stroke: '#FFFFFF', strokeWidth: 4.5 });
          }
          aimRef.current = aim;
        }

        // Sparks are plain views. Updating SVG geometry every frame repaints the whole picture on Android.
        const visibleSparks = live.phase !== 'over' ? live.sparks.length : 0;
        for (let index = 0; index < SPARK_SLOTS; index += 1) {
          const spark = index < visibleSparks ? live.sparks[index] : undefined;
          const circle = sparkRefs.current[index];
          const diamond = diamondRefs.current[index];
          const pose = sparkPose.current[index];
          if (!spark) {
            if (sparkActive.current[index]) {
              sparkActive.current[index] = false;
              pose.x = -9999;
              commitView(circle, { opacity: 0 });
            }
            if (diamondActive.current[index]) {
              diamondActive.current[index] = false;
              pose.x = -9999;
              commitView(diamond, { opacity: 0 });
            }
            continue;
          }

          const x = center + Math.cos(spark.angle) * spark.radius;
          const y = center + Math.sin(spark.angle) * spark.radius;
          const ink = sparkPaint(spark.kind, spark.color);
          const moved = Math.abs(x - pose.x) > 0.12 || Math.abs(y - pose.y) > 0.12;
          const recolor = pose.color !== ink;
          if (spark.kind === 'rush') {
            if (sparkActive.current[index]) {
              sparkActive.current[index] = false;
              commitView(circle, { opacity: 0 });
            }
            if (!diamondActive.current[index] || moved || recolor) {
              diamondActive.current[index] = true;
              pose.x = x;
              pose.y = y;
              pose.color = ink;
              commitView(diamond, {
                opacity: 1,
                backgroundColor: ink,
                transform: [
                  { translateX: x - DIAMOND_SIZE / 2 },
                  { translateY: y - DIAMOND_SIZE / 2 },
                  { rotate: '45deg' },
                ],
              });
            }
          } else {
            if (diamondActive.current[index]) {
              diamondActive.current[index] = false;
              commitView(diamond, { opacity: 0 });
            }
            const scale = spark.kind === 'prism' ? 1.2 : 1;
            if (!sparkActive.current[index] || moved || recolor) {
              sparkActive.current[index] = true;
              pose.x = x;
              pose.y = y;
              pose.color = ink;
              commitView(circle, {
                opacity: 1,
                backgroundColor: ink,
                transform: [
                  { translateX: x - SPARK_SIZE / 2 },
                  { translateY: y - SPARK_SIZE / 2 },
                  { scale },
                ],
              });
            }
          }
        }

        if (nearest) {
          markerOn.current = true;
          const mx = center + Math.cos(nearest.angle) * catchAtRadius;
          const my = center + Math.sin(nearest.angle) * catchAtRadius;
          commitView(markerRef.current, {
            opacity: 1,
            backgroundColor: sparkPaint(nearest.kind, nearest.color),
            transform: [
              { translateX: mx - MARKER_SIZE / 2 },
              { translateY: my - MARKER_SIZE / 2 },
            ],
          });
        } else if (markerOn.current) {
          markerOn.current = false;
          commitView(markerRef.current, { opacity: 0 });
        }

        const shownParticles = Math.min(live.particles.length, PARTICLE_SLOTS);
        const firstParticle = live.particles.length - shownParticles;
        for (let index = 0; index < PARTICLE_SLOTS; index += 1) {
          const particle = index < shownParticles ? live.particles[firstParticle + index] : undefined;
          const node = particleRefs.current[index];
          const pose = particlePose.current[index];
          if (!particle) {
            if (particleActive.current[index]) {
              particleActive.current[index] = false;
              pose.x = -9999;
              commitView(node, { opacity: 0 });
            }
            continue;
          }
          const moved = Math.abs(particle.x - pose.x) > 0.6 || Math.abs(particle.y - pose.y) > 0.6;
          const recolor = pose.color !== particle.color;
          if (!particleActive.current[index] || moved || recolor) {
            particleActive.current[index] = true;
            pose.x = particle.x;
            pose.y = particle.y;
            pose.color = particle.color;
            const life = Math.max(0, particle.life / particle.max);
            commitView(node, {
              opacity: life,
              backgroundColor: particle.color,
              transform: [
                { translateX: particle.x - PARTICLE_SIZE / 2 },
                { translateY: particle.y - PARTICLE_SIZE / 2 },
                { scale: Math.max(0.35, life) },
              ],
            });
          }
        }

        for (let index = 0; index < 3; index += 1) {
          const fracture = live.fractures[index];
          const ring = shockRingRefs.current[index];
          const fill = shockFillRefs.current[index];
          const echo = shockEchoRefs.current[index];
          if (!fracture) {
            if (shockActive.current[index]) {
              shockActive.current[index] = false;
              commit(ring, { opacity: 0 });
              commit(fill, { opacity: 0 });
              commit(echo, { opacity: 0 });
            }
            continue;
          }
          const progress = fractureProgress(fracture, live.elapsed);
          const fresh = 1 - progress;
          if (fresh <= 0.06) {
            if (shockActive.current[index]) {
              shockActive.current[index] = false;
              commit(ring, { opacity: 0 });
              commit(fill, { opacity: 0 });
              commit(echo, { opacity: 0 });
            }
            continue;
          }
          shockActive.current[index] = true;
          const sx = center + Math.cos(fracture.angle) * catchAtRadius;
          const sy = center + Math.sin(fracture.angle) * catchAtRadius;
          const lead = shockRadius(progress, catchAtRadius);
          commit(fill, {
            opacity: 1,
            cx: sx,
            cy: sy,
            r: lead * 0.78,
            fill: `rgba(214,242,255,${(fresh * 0.16).toFixed(3)})`,
            stroke: 'transparent',
          });
          commit(echo, {
            opacity: 1,
            cx: sx,
            cy: sy,
            r: lead * 0.62,
            fill: 'transparent',
            stroke: `rgba(186,230,255,${(fresh * 0.55).toFixed(3)})`,
            strokeWidth: 1.6,
          });
          commit(ring, {
            opacity: 1,
            cx: sx,
            cy: sy,
            r: lead,
            fill: 'transparent',
            stroke: `rgba(255,255,255,${(0.25 + fresh * 0.75).toFixed(3)})`,
            strokeWidth: 2.4,
          });
        }

        // 7. Shatter shards (only on game over)
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

        // 8. Floater text: uses hardware transform instead of layout props (left/top)
        const liveFloaters = live.floaters;
        for (let index = 0; index < FLOATER_SLOTS; index += 1) {
          const shown = shownFloaters.current[index];
          const floater = shown ? liveFloaters.find((item) => item.id === shown.id) : undefined;
          const node = floaterRefs.current[index];
          if (!floater || floater.life <= 0) {
            if (floaterActive.current[index]) {
              floaterActive.current[index] = false;
              commitView(node, { opacity: 0 });
            }
            continue;
          }
          floaterActive.current[index] = true;
          commitView(node, {
            transform: [{ translateX: floater.x - 56 }, { translateY: floater.y - 12 }],
            opacity: Math.max(0, floater.life),
          });
        }

        // 9. Board shake: transform only (no layout width/height)
        const shake = live.shake > 0 ? Math.sin(live.elapsed * 48) * live.shake * 10 : 0;
        if (shake !== 0 || shakeRef.current !== 0) {
          shakeRef.current = shake;
          commitView(boardRef.current, {
            transform: [{ translateX: shake }],
          });
        }

        // 10. Flash overlay
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
    const hole = ringInner * 1.62;
    const comboLabel = `${combo}×`;
    const subLabel = fever ? 'FEVER' : chainCount > 0 ? `${chainCount}/3` : '';
    const subTracking = subLabel === 'FEVER' ? 1.1 : 0.3;
    const comboRoom = subLabel ? hole * 0.56 : hole * 0.78;
    const subRoom = hole * 0.3;
    const comboSize = fitFont(comboLabel, hole * 0.9, Math.min(32, comboRoom), 11);
    const subSize = fitFont(subLabel, hole * 0.9, Math.min(13, subRoom), 8, subTracking);

    const coreColor = fever ? '#FF4D6D' : HUES[hue].hex;

    return (
      <View ref={boardRef} collapsable={false} style={{ width: size, height: size }}>
        {/* Static wheel. Cached as a texture so a spin does not repaint the gradients. */}
        <View collapsable={false} renderToHardwareTextureAndroid pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="pf-disc" cx="50%" cy="50%" r="50%">
              <Stop offset="0.45" stopColor="#24103F" />
              <Stop offset="1" stopColor="#0D0618" />
            </RadialGradient>
            <RadialGradient id="pf-hole" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#2A1347" />
              <Stop offset="1" stopColor="#120720" />
            </RadialGradient>
            <RadialGradient id="pf-core" cx="40%" cy="36%" r="70%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.38" stopColor={mix(coreColor, '#FFFFFF', 0.35)} />
              <Stop offset="0.8" stopColor={coreColor} />
              <Stop offset="1" stopColor={mix(coreColor, '#000000', 0.3)} />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy} r={size * 0.47} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="2 10" fill="none" />
          <Circle cx={cx} cy={cy} r={ringOuter + 16} fill="url(#pf-disc)" stroke="rgba(255,255,255,0.09)" strokeWidth={10} />
          <Circle cx={cx} cy={cy} r={ringOuter + 21} stroke="rgba(255,255,255,0.14)" strokeWidth={1} fill="none" />
          <Circle cx={cx} cy={cy} r={catchAt} stroke="rgba(255,255,255,0.2)" strokeWidth={1.2} strokeDasharray="3 7" fill="none" />
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
          <Circle cx={cx} cy={cy} r={ringInner - 3} fill="url(#pf-hole)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <Circle cx={cx} cy={cy} r={ringInner * 0.58 + 5} stroke={coreColor} strokeOpacity={0.35} strokeWidth={2} fill="none" />
          <Circle cx={cx} cy={cy} r={ringInner * 0.58} fill="url(#pf-core)" />
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
        </Svg>
        </View>

        {!shattered && (
          <View
            ref={ringViewRef}
            collapsable={false}
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [{ rotate: `${(state?.rotation ?? -Math.PI / 2) * (180 / Math.PI)}deg` }],
              },
            ]}
          >
            <View collapsable={false} renderToHardwareTextureAndroid pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={size} height={size}>
              {Array.from({ length: colorCount }, (_, index) => {
                const petalAngle = index * sector;
                return (
                  <Path
                    key={HUES[index].name}
                    ref={(node) => {
                      petalRefs.current[index] = node as NativeNode | null;
                    }}
                    d={sectorPath(cx, cy, ringInner, ringOuter, petalAngle - sector / 2 + gap / 2, petalAngle + sector / 2 - gap / 2)}
                    fill={HUES[index].hex}
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </Svg>
            </View>
          </View>
        )}

        {/* Layer 2b: Shard pieces during game over shatter */}
        {shattered && (
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            {pieces.map((piece, index) => (
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
          </Svg>
        )}

        {Array.from({ length: SPARK_SLOTS }, (_, index) => (
          <View
            key={`spark-${index}`}
            ref={(node) => {
              sparkRefs.current[index] = node;
            }}
            collapsable={false}
            style={styles.spark}
          />
        ))}
        {Array.from({ length: SPARK_SLOTS }, (_, index) => (
          <View
            key={`diamond-${index}`}
            ref={(node) => {
              diamondRefs.current[index] = node;
            }}
            collapsable={false}
            style={styles.diamond}
          />
        ))}
        <View ref={markerRef} collapsable={false} style={styles.marker} />
        {Array.from({ length: PARTICLE_SLOTS }, (_, index) => (
          <View
            key={`particle-${index}`}
            ref={(node) => {
              particleRefs.current[index] = node;
            }}
            collapsable={false}
            style={styles.particle}
          />
        ))}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 3 }, (_, index) => (
            <Circle
              key={`shock-fill-${index}`}
              ref={(node) => {
                shockFillRefs.current[index] = node as NativeNode | null;
              }}
              cx={cx}
              cy={cy}
              r={1}
              opacity={0}
              fill="transparent"
            />
          ))}
          {Array.from({ length: 3 }, (_, index) => (
            <Circle
              key={`shock-echo-${index}`}
              ref={(node) => {
                shockEchoRefs.current[index] = node as NativeNode | null;
              }}
              cx={cx}
              cy={cy}
              r={1}
              opacity={0}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.6}
            />
          ))}
          {Array.from({ length: 3 }, (_, index) => (
            <Circle
              key={`shock-ring-${index}`}
              ref={(node) => {
                shockRingRefs.current[index] = node as NativeNode | null;
              }}
              cx={cx}
              cy={cy}
              r={1}
              opacity={0}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2.4}
            />
          ))}
        </Svg>

        {/* Layer 4: Center Combo Text */}
        {(combo > 0 || fever || chainCount > 0) && (
          <View style={[styles.core, { width: hole, height: hole, left: (size - hole) / 2, top: (size - hole) / 2 }]}>
            {combo > 0 ? (
              <Text
                style={[styles.combo, { fontSize: comboSize, lineHeight: comboSize + 1 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {comboLabel}
              </Text>
            ) : null}
            {subLabel ? (
              <Text
                style={[styles.coreSub, { fontSize: subSize, lineHeight: subSize + 2, letterSpacing: subTracking }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {subLabel}
              </Text>
            ) : null}
          </View>
        )}

        {/* Layer 5: Floater Text (Points) */}
        {Array.from({ length: FLOATER_SLOTS }, (_, index) => {
          const floater = floaters[index];
          return (
            <View
              key={floater?.id ?? `empty-${index}`}
              ref={(node) => {
                floaterRefs.current[index] = node;
              }}
              style={[
                styles.floater,
                floater
                  ? {
                      opacity: Math.max(0, floater.life),
                      transform: [{ translateX: floater.x - 56 }, { translateY: floater.y - 12 }],
                    }
                  : styles.floaterHidden,
              ]}
            >
              <Text
                style={[
                  styles.floaterText,
                  {
                    color: floater?.color ?? '#FFFFFF',
                    fontSize: fitFont(floater?.text ?? '', 108, 16, 9),
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {floater?.text ?? ''}
              </Text>
            </View>
          );
        })}

        {/* Layer 6: Flash Overlay */}
        <View
          ref={flashRef}
          style={[styles.flash, { opacity: flashOpacity.current, backgroundColor: state?.flashColor ?? 'transparent' }]}
        />
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  combo: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  coreSub: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
  spark: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SPARK_SIZE,
    height: SPARK_SIZE,
    borderRadius: SPARK_SIZE / 2,
    opacity: 0,
    backgroundColor: '#FFFFFF',
    pointerEvents: 'none',
  },
  diamond: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DIAMOND_SIZE,
    height: DIAMOND_SIZE,
    borderRadius: 3,
    opacity: 0,
    backgroundColor: '#FFFFFF',
    pointerEvents: 'none',
  },
  marker: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    opacity: 0,
    backgroundColor: '#FFFFFF',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    borderRadius: PARTICLE_SIZE / 2,
    opacity: 0,
    backgroundColor: '#FFFFFF',
    pointerEvents: 'none',
  },
  floater: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 112,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  floaterHidden: {
    opacity: 0,
    left: 0,
    top: 0,
    transform: [{ translateX: -999 }, { translateY: -999 }],
  },
  floaterText: {
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
  },
  flash: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
});
