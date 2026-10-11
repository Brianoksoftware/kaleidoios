import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HUES } from '../game/palette';
import { AD_UNITS, BannerAd, BannerAdSize } from '../services/ads';
import { Emblem } from './Emblem';
import { ChainGlyph, CrackGlyph, CrownIcon, HapticsIcon, PlayIcon, SoundIcon, SparkGlyph, StarGlyph } from './icons';
import { display, fitFont, font, formatScore, Glass, GlowButton, Rise, Tap, Type } from './ui';

type Props = {
  best: number;
  haptics: boolean;
  sound: boolean;
  adsRemoved?: boolean;
  onPlay: () => void;
  onToggleHaptics: () => void;
  onToggleSound: () => void;
};

const TITLE = 'PRISM BLOOM';

export function MenuScreen({ best, haptics, sound, adsRemoved = false, onPlay, onToggleHaptics, onToggleSound }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const copyWidth = Math.max(140, width - 44);
  const titleSize = Math.round(Math.min(44, Math.max(26, copyWidth / (TITLE.length * 0.72))));
  const emblem = Math.round(Math.max(120, Math.min(width * 0.64, 280, height - insets.top - insets.bottom - 500)));
  const tag = 'Spin the wheel. Chain the bloom.';
  const tagSize = fitFont(tag, copyWidth, 15, 11);
  const bestText = formatScore(best);
  const bestSize = fitFont(bestText, Math.max(48, copyWidth - 140), 24, 13);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const playScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] });

  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.top}>
        <Title size={titleSize} />
        <Rise delay={420} from={8}>
          <Type style={[styles.tag, { fontSize: tagSize }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {tag}
          </Type>
        </Rise>
      </View>

      <View style={styles.middle}>
        <Rise delay={200} zoom={0.6} from={0} duration={800}>
          <Emblem size={emblem} />
        </Rise>
        <Rise delay={650} from={10} style={styles.bestRow}>
          <Glass radius={22} accent="#FFBE0B" contentStyle={styles.bestCard}>
            <CrownIcon size={18} />
            <Type style={styles.bestLabel}>BEST</Type>
            <Type
              style={[styles.bestValue, { fontSize: bestSize, lineHeight: bestSize + 4 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {bestText}
            </Type>
          </Glass>
        </Rise>
        <Rise delay={760} style={styles.rulesWrap}>
          <Glass radius={24} contentStyle={styles.rules}>
            <Type style={styles.rulesTitle}>HOW TO PLAY</Type>
            <Rule icon={<SparkGlyph color={HUES[0].hex} />} text="Rotate the wheel so incoming sparks hit matching colors." />
            <Rule icon={<ChainGlyph color={HUES[3].hex} />} text="Catch 3 of the same hue in a row to Bloom and clear sparks." />
            <Rule icon={<StarGlyph color={HUES[1].hex} />} text="Gold is wild. White slows time. Diamonds give 2× score." />
            <Rule icon={<CrackGlyph color="#FFFFFF" />} text="Mismatches crack the glass. 3 cracks end the run." />
          </Glass>
        </Rise>
      </View>

      <Rise delay={880} style={styles.bottom}>
        <View>
          <Animated.View style={[styles.playHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}>
            <LinearGradient
              colors={['rgba(255,77,109,0)', 'rgba(241,91,181,0.55)', 'rgba(155,93,229,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: playScale }] }}>
            <GlowButton
              label="PLAY"
              accessibilityLabel="Play Prism Bloom"
              onPress={onPlay}
              height={66}
              fontSize={22}
              icon={<PlayIcon size={22} />}
            />
          </Animated.View>
        </View>
        <View style={styles.toggles}>
          <ToggleChip
            label="SOUND"
            on={sound}
            accessibilityLabel={sound ? 'Sound on' : 'Sound off'}
            onPress={onToggleSound}
            icon={<SoundIcon on={sound} size={18} color={sound ? '#00F5D4' : 'rgba(255,255,255,0.55)'} />}
          />
          <ToggleChip
            label="HAPTICS"
            on={haptics}
            accessibilityLabel={haptics ? 'Haptics on' : 'Haptics off'}
            onPress={onToggleHaptics}
            icon={<HapticsIcon on={haptics} size={18} color={haptics ? '#00F5D4' : 'rgba(255,255,255,0.55)'} />}
          />
        </View>

        {!adsRemoved && AD_UNITS.BANNER && (
          <View style={styles.adBannerWrap}>
            <BannerAd
              unitId={AD_UNITS.BANNER}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
          </View>
        )}
      </Rise>
    </ScrollView>
  );
}

function Title({ size }: { size: number }) {
  const letters = TITLE.split('');
  const drops = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anim = Animated.stagger(
      70,
      drops.map((value) => Animated.spring(value, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true })),
    );
    anim.start();
    return () => anim.stop();
  }, [drops]);

  return (
    <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel="Prism Bloom">
      {letters.map((letter, index) => {
        const value = drops[index];
        return (
          <Animated.Text
            key={`${letter}-${index}`}
            style={[
              styles.letter,
              {
                fontSize: size,
                lineHeight: Math.round(size * 1.18),
                opacity: value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                transform: [
                  { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.7, 0] }) },
                  { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) },
                ],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        );
      })}
    </View>
  );
}

function Rule({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleIcon}>{icon}</View>
      <Type style={styles.ruleText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
        {text}
      </Type>
    </View>
  );
}

function ToggleChip({
  label,
  on,
  icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  on: boolean;
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const knob = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    const anim = Animated.spring(knob, { toValue: on ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [on, knob]);

  return (
    <Tap
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.toggleTap}
    >
      <Glass radius={18} accent={on ? '#00F5D4' : undefined} contentStyle={styles.toggle}>
        {icon}
        <Type
          style={[styles.toggleText, on && styles.toggleTextOn]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {label}
        </Type>
        <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
          <Animated.View
            style={[
              styles.knob,
              on ? styles.knobOn : styles.knobOff,
              { transform: [{ translateX: knob.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }] },
            ]}
          />
        </View>
      </Glass>
    </Tap>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 6,
  },
  top: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
  letter: {
    color: '#FFFFFF',
    fontFamily: display,
    fontWeight: '900',
    marginHorizontal: 1.5,
    textShadowColor: 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    includeFontPadding: false,
  },
  tag: {
    color: 'rgba(255,255,255,0.74)',
    fontFamily: font,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 6,
  },
  middle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  bestRow: {
    marginTop: -10,
    maxWidth: '100%',
  },
  bestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  bestLabel: {
    color: '#FFBE0B',
    fontFamily: font,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 11,
  },
  bestValue: {
    color: '#FFFFFF',
    fontFamily: display,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  rulesWrap: {
    width: '100%',
    maxWidth: 460,
    marginTop: 14,
  },
  rules: {
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rulesTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: font,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 2.4,
    marginBottom: 1,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ruleIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    paddingTop: 12,
  },
  adBannerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 50,
  },
  playHalo: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: -8,
    bottom: -8,
    borderRadius: 34,
    overflow: 'hidden',
  },
  toggles: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleTap: {
    flex: 1,
  },
  toggle: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  toggleText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  toggleTextOn: {
    color: '#FFFFFF',
  },
  track: {
    width: 34,
    height: 20,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  trackOn: {
    backgroundColor: 'rgba(0,245,212,0.3)',
    borderColor: 'rgba(0,245,212,0.8)',
  },
  trackOff: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  knob: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  knobOn: {
    backgroundColor: '#00F5D4',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  knobOff: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
