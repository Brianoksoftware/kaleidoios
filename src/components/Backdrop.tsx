import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { leafPath, TAU } from '../game/geometry';
import { HUES } from '../game/palette';

type Props = {
  /** Active hue index. `null` slowly cycles through every hue (menu / attract mode). */
  hue: number | null;
  fever: boolean;
  /** Dims the decorative mandala so it never competes with gameplay. */
  calm?: boolean;
};

function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function useLoop(duration: number, pingPong = false, delay = 0, enabled = true) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    const forward = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: pingPong ? Easing.inOut(Easing.sin) : Easing.linear,
      useNativeDriver: true,
    });
    const loop = pingPong
      ? Animated.loop(
          Animated.sequence([
            forward,
            Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        )
      : Animated.loop(forward);
    loop.start();
    return () => loop.stop();
  }, [value, duration, pingPong, delay, enabled]);
  return value;
}

/** Full-screen ambient scene: hue-tinted aurora, drifting orbs, rotating mandala and twinkling dust. */
export const Backdrop = memo(function Backdrop({ hue, fever, calm = false }: Props) {
  const { width, height } = useWindowDimensions();
  const [cycle, setCycle] = useState(3);

  useEffect(() => {
    if (hue !== null) return;
    const id = setInterval(() => setCycle((value) => (value + 1) % HUES.length), 3600);
    return () => clearInterval(id);
  }, [hue]);

  const active = hue ?? cycle;
  const fades = useRef(HUES.map((_, index) => new Animated.Value(index === 3 ? 1 : 0))).current;
  const feverFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel(
      fades.map((value, index) =>
        Animated.timing(value, {
          toValue: index === active ? 1 : 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    );
    anim.start();
    return () => anim.stop();
  }, [active, fades]);

  useEffect(() => {
    const anim = Animated.timing(feverFade, {
      toValue: fever ? 1 : 0,
      duration: fever ? 350 : 900,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fever, feverFade]);

  const spin = useLoop(140000, false, 0, !calm);
  const driftA = useLoop(11000, true, 0, !calm);
  const driftB = useLoop(14000, true, 600, !calm);
  const twinkleA = useLoop(2600, true, 0, !calm);
  const twinkleB = useLoop(3400, true, 900, !calm);
  const twinkleC = useLoop(4200, true, 1700, !calm);
  const feverPulse = useLoop(520, true, 0, fever);

  const mandalaSize = Math.hypot(width, height) * 1.05;
  const stars = useMemo(() => {
    const random = seeded(Math.round(width * 7 + height));
    return [0, 1, 2].map(() =>
      Array.from({ length: 16 }, () => ({
        x: random() * width,
        y: random() * height,
        r: 0.6 + random() * 1.5,
      })),
    );
  }, [width, height]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbA = {
    transform: [
      { translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.12, width * 0.1] }) },
      { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.06] }) },
    ],
  };
  const orbB = {
    transform: [
      { translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [width * 0.1, -width * 0.12] }) },
      { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.04, height * 0.05] }) },
    ],
  };
  const twinkles = [twinkleA, twinkleB, twinkleC].map((value) =>
    value.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.9] }),
  );
  const feverOpacity = Animated.multiply(
    feverFade,
    feverPulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
  );
  const orb = Math.max(width, height) * 0.62;

  return (
    <View style={styles.fill}>
      <LinearGradient colors={['#1A0A33', '#0B0618', '#05141B']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />

      {calm ? (
        <View style={[styles.fill, { backgroundColor: HUES[active].hex, opacity: 0.16 }]} />
      ) : null}

      {!calm && HUES.map((item, index) => {
        return (
          <Animated.View key={item.name} style={[styles.fill, { opacity: fades[index] }]}>
            <Svg width={width} height={height}>
              <Defs>
                <RadialGradient id={`bg-top-${index}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={item.hex} stopOpacity={0.42} />
                  <Stop offset="0.55" stopColor={item.hex} stopOpacity={0.12} />
                  <Stop offset="1" stopColor={item.hex} stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id={`bg-low-${index}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={item.hex} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={item.hex} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={width / 2} cy={height * 0.12} r={width * 0.95} fill={`url(#bg-top-${index})`} />
              <Circle cx={width / 2} cy={height * 1.02} r={width * 0.8} fill={`url(#bg-low-${index})`} />
            </Svg>
          </Animated.View>
        );
      })}

      {!calm && (
        <>
          <Animated.View style={[styles.orb, { width: orb, height: orb, left: -orb * 0.35, top: height * 0.38 }, orbA]}>
            <Svg width={orb} height={orb}>
              <Defs>
                <RadialGradient id="bg-orb-a" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#9B5DE5" stopOpacity={0.32} />
                  <Stop offset="1" stopColor="#9B5DE5" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={orb / 2} cy={orb / 2} r={orb / 2} fill="url(#bg-orb-a)" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.orb, { width: orb, height: orb, right: -orb * 0.4, top: height * 0.05 }, orbB]}>
            <Svg width={orb} height={orb}>
              <Defs>
                <RadialGradient id="bg-orb-b" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#00BBF9" stopOpacity={0.22} />
                  <Stop offset="1" stopColor="#00BBF9" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={orb / 2} cy={orb / 2} r={orb / 2} fill="url(#bg-orb-b)" />
            </Svg>
          </Animated.View>

          <Animated.View
            style={[
              styles.orb,
              {
                width: mandalaSize,
                height: mandalaSize,
                left: (width - mandalaSize) / 2,
                top: (height - mandalaSize) / 2,
                transform: [{ rotate }],
              },
            ]}
          >
            <Mandala size={mandalaSize} />
          </Animated.View>

          {stars.map((layer, index) => (
            <Animated.View key={`stars-${index}`} style={[styles.fill, { opacity: twinkles[index] }]}>
              <Svg width={width} height={height}>
                {layer.map((star, starIndex) => (
                  <Circle key={starIndex} cx={star.x} cy={star.y} r={star.r} fill="#FFFFFF" />
                ))}
              </Svg>
            </Animated.View>
          ))}
        </>
      )}

      {!calm && (
        <Animated.View style={[styles.fill, { opacity: feverOpacity }]}>
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="bg-fever" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FF4D6D" stopOpacity={0.5} />
                <Stop offset="0.6" stopColor="#F15BB5" stopOpacity={0.14} />
                <Stop offset="1" stopColor="#F15BB5" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={height} fill="rgba(255,40,90,0.06)" />
            <Circle cx={width / 2} cy={height * 0.5} r={Math.max(width, height) * 0.62} fill="url(#bg-fever)" />
          </Svg>
        </Animated.View>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.38)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.22, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
});

const Mandala = memo(function Mandala({ size }: { size: number }) {
  const c = size / 2;
  const petals = 12;
  return (
    <Svg width={size} height={size}>
      <G stroke="#FFFFFF" strokeWidth={1} fill="none" opacity={0.075}>
        {[0.07, 0.15, 0.25, 0.36, 0.48].map((r) => (
          <Circle key={r} cx={c} cy={c} r={size * r} />
        ))}
        {Array.from({ length: petals }, (_, index) => {
          const angle = (index / petals) * TAU;
          return <Path key={`a-${index}`} d={leafPath(c, c, angle, size * 0.02, size * 0.23, size * 0.04)} />;
        })}
        {Array.from({ length: petals }, (_, index) => {
          const angle = ((index + 0.5) / petals) * TAU;
          return <Path key={`b-${index}`} d={leafPath(c, c, angle, size * 0.12, size * 0.34, size * 0.07)} />;
        })}
        {Array.from({ length: petals * 2 }, (_, index) => {
          const angle = (index / (petals * 2)) * TAU;
          return (
            <Line
              key={`l-${index}`}
              x1={c + Math.cos(angle) * size * 0.36}
              y1={c + Math.sin(angle) * size * 0.36}
              x2={c + Math.cos(angle) * size * 0.48}
              y2={c + Math.sin(angle) * size * 0.48}
            />
          );
        })}
      </G>
    </Svg>
  );
});

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  orb: {
    position: 'absolute',
    pointerEvents: 'none',
  },
});
