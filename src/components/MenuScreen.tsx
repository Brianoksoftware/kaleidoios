import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { sectorPath, TAU } from '../game/geometry';
import { HUES } from '../game/palette';
import { fitFont, font, Tap, Type } from './ui';

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
  const pulse = useRef(new Animated.Value(1)).current;
  const { width, height } = useWindowDimensions();
  const titleSize = Math.min(40, Math.max(28, Math.round((width - 64) / 9)));
  const ring = height < 720 ? 124 : 156;
  const copyWidth = Math.max(140, width - 44);
  const tag = 'Spin the hue. Chain the bloom.';
  const tagSize = fitFont(tag, copyWidth, 15, 11);
  const bestText = String(best);
  const bestSize = fitFont(bestText, Math.max(48, copyWidth - 88), 28, 14);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.035, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.top}>
        <Type
          style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 4 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          KALEIDO
        </Type>
        <Type style={[styles.tag, { fontSize: tagSize }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {tag}
        </Type>
        <View style={styles.bestCard}>
          <Type style={styles.bestLabel}>BEST</Type>
          <Type
            style={[styles.bestValue, { fontSize: bestSize, lineHeight: bestSize + 4 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {best}
          </Type>
        </View>
      </View>

      <View style={styles.middle}>
        <View style={styles.glow}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <HeroRing size={ring} />
          </Animated.View>
        </View>
        <View style={styles.rules}>
          <Rule color={HUES[0].hex} text="Spin until the spark hits its own color." />
          <Rule color={HUES[3].hex} text="Three of the same hue in a row clears the ring." />
          <Rule color={HUES[1].hex} text="Gold is wild. White slows time. Diamonds are double." />
          <Rule color="#FFFFFF" text="Three cracks shatter glass." />
        </View>
      </View>

      <View style={styles.bottom}>
        <Animated.View style={[styles.playWrap, { transform: [{ scale: pulse }] }]}>
          <Tap accessibilityRole="button" accessibilityLabel="Play Kaleido" onPress={onPlay} style={styles.play}>
            <Type style={styles.playText}>PLAY</Type>
          </Tap>
        </Animated.View>
        <View style={styles.toggles}>
          <Tap
            accessibilityRole="button"
            accessibilityLabel={sound ? 'Sound on' : 'Sound off'}
            onPress={onToggleSound}
            style={[styles.toggle, sound ? styles.toggleOn : styles.toggleOff]}
          >
            <Type style={[styles.toggleText, sound && styles.toggleTextOn]}>SOUND {sound ? 'ON' : 'OFF'}</Type>
          </Tap>
          <Tap
            accessibilityRole="button"
            accessibilityLabel={haptics ? 'Haptics on' : 'Haptics off'}
            onPress={onToggleHaptics}
            style={[styles.toggle, haptics ? styles.toggleOn : styles.toggleOff]}
          >
            <Type style={[styles.toggleText, haptics && styles.toggleTextOn]}>HAPTICS {haptics ? 'ON' : 'OFF'}</Type>
          </Tap>
        </View>
      </View>
    </ScrollView>
  );
}

function Rule({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
      <Type style={styles.ruleText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
        {text}
      </Type>
    </View>
  );
}

function HeroRing({ size }: { size: number }) {
  const c = size / 2;
  const sector = TAU / 6;
  const outer = size * 0.44;
  const inner = size * 0.2;
  return (
    <Svg width={size} height={size}>
      {HUES.map((hue, index) => {
        const center = -Math.PI / 2 + index * sector;
        return (
          <Path
            key={hue.name}
            d={sectorPath(c, c, inner, outer, center - sector / 2 + 0.06, center + sector / 2 - 0.06)}
            fill={hue.hex}
          />
        );
      })}
    </Svg>
  );
}

const card = {
  backgroundColor: 'rgba(16, 8, 28, 0.72)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.14)',
  borderRadius: 24,
} as const;

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 6,
  },
  top: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  tag: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: font,
    fontSize: 15,
    marginTop: 4,
  },
  bestCard: {
    ...card,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  bestLabel: {
    color: '#FFBE0B',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 1.8,
    fontSize: 11,
  },
  bestValue: {
    color: '#FFFFFF',
    fontFamily: font,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  middle: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  glow: {
    shadowColor: '#9B5DE5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 22,
    elevation: 10,
  },
  rules: {
    ...card,
    width: '100%',
    maxWidth: 460,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  ruleText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: font,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bottom: {
    gap: 12,
    paddingTop: 8,
  },
  playWrap: {
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  play: {
    backgroundColor: '#FF4D6D',
    borderRadius: 22,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  playText: {
    color: '#FFFFFF',
    fontFamily: font,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
  },
  toggles: {
    flexDirection: 'row',
    gap: 10,
  },
  toggle: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleOn: {
    backgroundColor: 'rgba(0,245,212,0.16)',
    borderColor: 'rgba(0,245,212,0.7)',
  },
  toggleOff: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  toggleTextOn: {
    color: '#00F5D4',
  },
});
