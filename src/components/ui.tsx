import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextProps, type ViewStyle } from 'react-native';

export const font = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  default: 'system-ui',
});

type TapProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Tap({ style, children, ...props }: TapProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function Rise({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const shift = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(shift, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, shift]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: shift }] }]}>
      {children}
    </Animated.View>
  );
}

export function Type({ style, ...props }: TextProps) {
  return <Text {...props} style={[{ fontFamily: font }, style]} />;
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

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});
