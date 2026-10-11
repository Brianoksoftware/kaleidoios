import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { leafPath, sectorPath, TAU } from '../game/geometry';
import { HUES, mix } from '../game/palette';

function useSpin(duration: number, reverse = false) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
}

/** Layered, counter-rotating kaleidoscope crest. */
export const Emblem = memo(function Emblem({ size, id = 'em' }: { size: number; id?: string }) {
  const outer = useSpin(48000, true);
  const ring = useSpin(16000);
  const star = useSpin(24000, true);
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const haloScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const coreScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });

  const c = size / 2;
  const sector = TAU / HUES.length;
  const ringOuter = size * 0.4;
  const ringInner = size * 0.22;
  const dotR = size * 0.47;
  const layer = { width: size, height: size, position: 'absolute' as const };

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[layer, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.35" stopColor="#F15BB5" stopOpacity={0.55} />
              <Stop offset="0.7" stopColor="#9B5DE5" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#9B5DE5" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill={`url(#${id}-halo)`} />
        </Svg>
      </Animated.View>

      <Animated.View style={[layer, { transform: [{ rotate: outer }] }]}>
        <Svg width={size} height={size}>
          {Array.from({ length: 36 }, (_, index) => {
            const angle = (index / 36) * TAU;
            const big = index % 3 === 0;
            return (
              <Circle
                key={index}
                cx={c + Math.cos(angle) * dotR}
                cy={c + Math.sin(angle) * dotR}
                r={big ? size * 0.012 : size * 0.006}
                fill={big ? HUES[(index / 3) % HUES.length].hex : 'rgba(255,255,255,0.55)'}
              />
            );
          })}
          <Circle cx={c} cy={c} r={size * 0.435} stroke="rgba(255,255,255,0.12)" strokeWidth={1} fill="none" />
        </Svg>
      </Animated.View>

      <Animated.View style={[layer, { transform: [{ rotate: ring }] }]}>
        <Svg width={size} height={size}>
          <Defs>
            {HUES.map((hue, index) => (
              <RadialGradient
                key={hue.name}
                id={`${id}-petal-${index}`}
                cx={c}
                cy={c}
                r={ringOuter}
                fx={c}
                fy={c}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset={ringInner / ringOuter} stopColor={mix(hue.hex, '#FFFFFF', 0.45)} />
                <Stop offset={0.78} stopColor={hue.hex} />
                <Stop offset={1} stopColor={mix(hue.hex, '#000000', 0.3)} />
              </RadialGradient>
            ))}
          </Defs>
          {HUES.map((hue, index) => {
            const center = -Math.PI / 2 + index * sector;
            return (
              <Path
                key={hue.name}
                d={sectorPath(c, c, ringInner, ringOuter, center - sector / 2 + 0.05, center + sector / 2 - 0.05)}
                fill={`url(#${id}-petal-${index})`}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1}
              />
            );
          })}
        </Svg>
      </Animated.View>

      <View style={[layer, styles.none]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.38} />
              <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity={0.02} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={c}
            cy={c}
            r={(ringOuter + ringInner) / 2}
            stroke={`url(#${id}-gloss)`}
            strokeWidth={ringOuter - ringInner}
            fill="none"
          />
        </Svg>
      </View>

      <Animated.View style={[layer, { transform: [{ rotate: star }] }]}>
        <Svg width={size} height={size}>
          <G opacity={0.9}>
            {Array.from({ length: 6 }, (_, index) => {
              const angle = (index / 6) * TAU;
              return (
                <Path
                  key={index}
                  d={leafPath(c, c, angle, size * 0.02, size * 0.19, size * 0.045)}
                  fill="rgba(255,255,255,0.14)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={1}
                />
              );
            })}
          </G>
        </Svg>
      </Animated.View>

      <Animated.View style={[layer, { transform: [{ scale: coreScale }] }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`${id}-core`} cx="40%" cy="38%" r="65%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.45" stopColor="#7DFFEA" />
              <Stop offset="1" stopColor="#00A896" />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={size * 0.075} fill="rgba(0,245,212,0.25)" />
          <Circle cx={c} cy={c} r={size * 0.052} fill={`url(#${id}-core)`} />
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  none: { pointerEvents: 'none' },
});
