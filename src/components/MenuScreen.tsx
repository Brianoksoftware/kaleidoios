import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { sectorPath, TAU } from '../game/geometry';
import { HUES } from '../game/palette';

type Props = {
  best: number;
  haptics: boolean;
  sound: boolean;
  onPlay: () => void;
  onToggleHaptics: () => void;
  onToggleSound: () => void;
};

export function MenuScreen({ best, haptics, sound, onPlay, onToggleHaptics, onToggleSound }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const titleSize = Math.min(40, Math.max(28, Math.round((width - 64) / 9)));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} bounces={false}>
      <Text style={styles.kicker}>ONE THUMB ARCADE</Text>
      <Text
        style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        KALEIDO
      </Text>
      <Text style={styles.tag}>Spin the hue. Chain the bloom.</Text>

      <Animated.View style={{ transform: [{ rotate }] }}>
        <HeroRing />
      </Animated.View>

      <View style={styles.bestPill}>
        <Text style={styles.bestLabel}>BEST</Text>
        <Text style={styles.bestValue}>{best}</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Play Kaleido" onPress={onPlay} style={styles.play}>
        <Text style={styles.playText}>PLAY</Text>
      </Pressable>

      <View style={styles.rules}>
        <Rule color={HUES[0].hex} text="Spin until the spark hits its own color." />
        <Rule color={HUES[3].hex} text="Three of the same hue in a row clears the ring." />
        <Rule color={HUES[1].hex} text="Gold is wild. White slows time. Diamonds are double." />
        <Rule color="#FFFFFF" text="Three cracks and the glass shatters." />
      </View>

      <View style={styles.toggles}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sound ? 'Sound on' : 'Sound off'}
          onPress={onToggleSound}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>SOUND {sound ? 'ON' : 'OFF'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={haptics ? 'Haptics on' : 'Haptics off'}
          onPress={onToggleHaptics}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>HAPTICS {haptics ? 'ON' : 'OFF'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Rule({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

function HeroRing() {
  const size = 168;
  const c = size / 2;
  const sector = TAU / 6;
  return (
    <Svg width={size} height={size}>
      {HUES.map((hue, index) => {
        const center = -Math.PI / 2 + index * sector;
        return (
          <Path
            key={hue.name}
            d={sectorPath(c, c, 34, 74, center - sector / 2 + 0.06, center + sector / 2 - 0.06)}
            fill={hue.hex}
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  kicker: {
    color: '#00F5D4',
    fontWeight: '800',
    letterSpacing: 3,
    fontSize: 12,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  tag: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 16,
    marginBottom: 8,
  },
  bestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  bestLabel: {
    color: '#FFBE0B',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  bestValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  play: {
    marginTop: 18,
    backgroundColor: '#FF4D6D',
    borderRadius: 999,
    paddingHorizontal: 54,
    paddingVertical: 16,
    minWidth: 220,
    alignItems: 'center',
  },
  playText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
  },
  rules: {
    marginTop: 22,
    gap: 8,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ruleText: {
    color: 'rgba(255,255,255,0.88)',
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  toggles: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 4,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
