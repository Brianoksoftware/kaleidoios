import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const font = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  default: 'system-ui',
});

/** Heavier display face for titles and big numbers. */
export const display = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-black',
  default: 'system-ui',
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TapProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** How far the button sinks while held. */
  depth?: number;
};

/** Pressable with a springy squash on press. */
export function Tap({ style, children, depth = 0.92, onPressIn, onPressOut, ...props }: TapProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      speed: value === 1 ? 18 : 60,
      bounciness: value === 1 ? 12 : 0,
      useNativeDriver: true,
    }).start();

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event: GestureResponderEvent) => {
        to(depth);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        to(1);
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

type RiseProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  /** Starting vertical offset. */
  from?: number;
  /** Starting scale. */
  zoom?: number;
  duration?: number;
};

/** Fades + slides children in once on mount. */
export function Rise({ children, style, delay = 0, from = 18, zoom = 1, duration = 420 }: RiseProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  const opacity = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [zoom, 1] });

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}

/** Springs a quick scale bump every time `trigger` changes. */
export function Pop({
  trigger,
  children,
  style,
  amount = 1.16,
}: {
  trigger: unknown;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  amount?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.setValue(amount);
    const anim = Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [trigger, scale, amount]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

export function Type({ style, ...props }: TextProps) {
  return <Text {...props} style={[{ fontFamily: font }, style]} />;
}

/** Counts from 0 up to `value` with an ease-out curve. */
export function CountUp({
  value,
  duration = 1100,
  delay = 0,
  ...props
}: TextProps & { value: number; duration?: number; delay?: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (start === 0) start = now + delay;
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay]);

  return <Type {...props}>{formatScore(shown)}</Type>;
}

/** 12345 → "12,345" */
export function formatScore(value: number) {
  return String(Math.max(0, Math.floor(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Largest font size whose text stays inside maxWidth. Short labels keep preferred. */
export function fitFont(text: string, maxWidth: number, preferred: number, min = 9, tracking = 0) {
  const count = Math.max(text.length, 1);
  const extra = Math.max(0, count - 1) * tracking;
  const room = Math.max(0, maxWidth - extra);
  const fitted = room / (count * 0.66);
  const size = Math.min(preferred, fitted);
  return Math.max(min, Math.round(size * 10) / 10);
}

type GlassProps = {
  children?: ReactNode;
  /** Applied to the outer (border) layer: margins, sizing, flex. */
  style?: StyleProp<ViewStyle>;
  /** Applied to the inner surface: padding, layout. */
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  /** Tints the lower-right edge of the hairline border. */
  accent?: string;
  tint?: string;
};

/** Frosted panel with a light-catching gradient hairline border and top sheen. */
export function Glass({ children, style, contentStyle, radius = 24, accent, tint = 'rgba(16, 9, 30, 0.74)' }: GlassProps) {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.05)', accent ? `${accent.slice(0, 7)}99` : 'rgba(255,255,255,0.16)']}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius, padding: 1 }, style]}
    >
      <View style={[{ borderRadius: radius - 1, backgroundColor: tint, overflow: 'hidden' }, contentStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']}
          locations={[0, 0.55]}
          style={styles.sheen}
        />
        {children}
      </View>
    </LinearGradient>
  );
}

type GlowButtonProps = {
  label: string;
  onPress: () => void;
  colors?: readonly [string, string, ...string[]];
  icon?: ReactNode;
  accessibilityLabel?: string;
  height?: number;
  fontSize?: number;
  /** Adds a slow light sweep across the face. */
  shimmer?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Primary call-to-action: gradient face, glossy top, glow and an optional light sweep. */
export function GlowButton({
  label,
  onPress,
  colors = ['#FF5E7E', '#F15BB5', '#9B5DE5'],
  icon,
  accessibilityLabel,
  height = 62,
  fontSize = 19,
  shimmer = true,
  style,
}: GlowButtonProps) {
  const [width, setWidth] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shimmer || width === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1900),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, width, sweep]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, width + 40] });

  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.glowWrap, { shadowColor: colors[0], borderRadius: height / 2.6 }, style]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={[styles.glowFace, { height, borderRadius: height / 2.6 }]}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.06)']}
          style={[styles.gloss, { height: height * 0.5, borderTopLeftRadius: height / 2.6, borderTopRightRadius: height / 2.6 }]}
        />
        {shimmer && width > 0 ? (
          <Animated.View style={[styles.sweep, { height: height * 2, transform: [{ translateX }, { rotate: '18deg' }] }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
        <View style={styles.glowRow}>
          {icon}
          <Type style={[styles.glowText, { fontSize }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {label}
          </Type>
        </View>
      </LinearGradient>
    </Tap>
  );
}

/** Quiet secondary action on frosted glass. */
export function GhostButton({
  label,
  onPress,
  icon,
  accessibilityLabel,
  height = 54,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  accessibilityLabel?: string;
  height?: number;
}) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress}>
      <Glass radius={height / 2.6} contentStyle={[styles.ghostFace, { minHeight: height }]}>
        <View style={styles.glowRow}>
          {icon}
          <Type style={styles.ghostText} numberOfLines={1}>
            {label}
          </Type>
        </View>
      </Glass>
    </Tap>
  );
}

const styles = StyleSheet.create({
  sheen: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  glowWrap: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  glowFace: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  sweep: {
    position: 'absolute',
    left: 0,
    top: -20,
    width: 70,
    pointerEvents: 'none',
  },
  glowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  glowText: {
    color: '#FFFFFF',
    fontFamily: display,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: 'rgba(60,0,40,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  ghostFace: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 15,
  },
});
