import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { waveProgress } from '../game/palette';
import { GemPip, PauseIcon, RotateIcon } from './icons';
import { display, fitFont, font, formatScore, Glass, Pop, Tap, Type } from './ui';

/* ------------------------------------------------------------------ HUD */

type HudBarProps = {
  score: number;
  best: number;
  cracks: number;
  catches: number;
  accent: string;
  width: number;
};

export function HudBar({ score, best, cracks, catches, accent, width }: HudBarProps) {
  const hudInner = Math.max(160, width - 64);
  const scoreWidth = Math.max(72, hudInner * 0.4);
  const sideWidth = Math.max(64, hudInner * 0.3);
  const scoreText = formatScore(score);
  const bestText = formatScore(best);
  const scoreSize = fitFont(scoreText, scoreWidth, 38, 16);
  const bestSize = fitFont(bestText, sideWidth, 19, 11);
  const wave = waveProgress(catches);
  const waveSize = fitFont(wave.name.toUpperCase(), sideWidth - 16, 11, 8, 1);
  const progressLabel = wave.next ? `${wave.into}/${wave.span} → ${wave.next.toUpperCase()}` : 'MAX TIER';
  const progressSize = fitFont(progressLabel, hudInner * 0.42, 10, 7.5, 0.8);

  const fill = useRef(new Animated.Value(wave.progress)).current;
  useEffect(() => {
    const anim = Animated.timing(fill, {
      toValue: Math.max(0.001, wave.progress),
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [wave.progress, fill]);

  return (
    <Glass style={styles.hudOuter} contentStyle={styles.hud} radius={24} accent={accent}>
      <View style={styles.hudRow}>
        <View style={[styles.scoreBlock, { maxWidth: scoreWidth }]}>
          <Type style={styles.hudLabel} numberOfLines={1}>
            SCORE
          </Type>
          <Pop trigger={score} amount={1.12} style={styles.scorePop}>
            <Type
              style={[
                styles.hudScore,
                { fontSize: scoreSize, lineHeight: scoreSize + 4, textShadowColor: `${accent.slice(0, 7)}AA` },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >
              {scoreText}
            </Type>
          </Pop>
        </View>

        <View style={styles.glassBlock}>
          <Type style={styles.hudLabel}>GLASS</Type>
          <View style={styles.pips}>
            {Array.from({ length: 3 }, (_, index) => {
              const cracked = index < cracks;
              return (
                <Pop key={index} trigger={cracked} amount={1.45} style={!cracked ? styles.pipGlow : undefined}>
                  <GemPip cracked={cracked} size={18} />
                </Pop>
              );
            })}
          </View>
        </View>

        <View style={[styles.hudRight, { maxWidth: sideWidth }]}>
          <Type style={styles.hudLabel} numberOfLines={1}>
            BEST
          </Type>
          <Type
            style={[styles.best, { fontSize: bestSize, lineHeight: bestSize + 3 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {bestText}
          </Type>
          <Pop trigger={wave.name} amount={1.25}>
            <View style={[styles.tierChip, { borderColor: `${wave.color}88`, backgroundColor: `${wave.color}1F` }]}>
              <View style={[styles.tierDot, { backgroundColor: wave.color }]} />
              <Type
                style={[styles.wave, { color: wave.color, fontSize: waveSize }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {wave.name.toUpperCase()}
              </Type>
            </View>
          </Pop>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.trackFill,
              {
                width: '100%',
                transform: [{ scaleX: fill }, { translateX: 0 }],
              },
            ]}
          >
            <LinearGradient
              colors={[wave.color, '#FFFFFF']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Type
          style={[styles.progressText, { fontSize: progressSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {progressLabel}
        </Type>
      </View>
    </Glass>
  );
}

/* --------------------------------------------------------------- Banner */

export function Banner({ text, on, accent, width }: { text: string; on: boolean; accent: string; width: number }) {
  const show = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = on
      ? Animated.spring(show, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true })
      : Animated.timing(show, { toValue: 0, duration: 220, useNativeDriver: true });
    if (on) show.setValue(0);
    anim.start();
    return () => anim.stop();
  }, [on, text, show]);

  const size = fitFont(text, Math.max(110, width - 130), 20, 10, 3);
  return (
    <View style={styles.bannerFloat}>
      <Animated.View
        style={{
          opacity: show.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [
            { scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            { translateY: show.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
          ],
        }}
      >
        <LinearGradient
          colors={[`${accent.slice(0, 7)}`, 'rgba(255,255,255,0.4)', `${accent.slice(0, 7)}`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bannerBorder}
        >
          <View style={styles.bannerFace}>
            <Type
              style={[styles.banner, { fontSize: size, textShadowColor: accent }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {text}
            </Type>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

/* ----------------------------------------------------------- Stage aura */

/** Soft breathing glow behind the board, tinted by the active hue. */
export const StageAura = memo(function StageAura({ size, color, fever }: { size: number; color: string; fever: boolean }) {
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = fever ? 420 : 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fever, breathe]);

  const box = size * 1.25;
  return (
    <Animated.View
      style={[
        styles.aura,
        {
          width: box,
          height: box,
          borderRadius: box / 2,
          backgroundColor: color,
          opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: fever ? [0.1, 0.16] : [0.08, 0.14] }),
          transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }],
        },
      ]}
    />
  );
});

/* ----------------------------------------------------------------- Dock */

type DockProps = {
  onLeft: () => void;
  onRight: () => void;
  onPause: () => void;
};

export function Dock({ onLeft, onRight, onPause }: DockProps) {
  return (
    <Glass style={styles.dockOuter} contentStyle={styles.dock} radius={32}>
      <SpinButton dir={-1} label="Rotate left" colors={['#7DFFEA', '#00F5D4', '#00A896']} onPress={onLeft} />
      <Tap accessibilityRole="button" accessibilityLabel="Pause" onPress={onPause} depth={0.86}>
        <View style={styles.pause}>
          <PauseIcon size={20} color="rgba(255,255,255,0.92)" />
        </View>
      </Tap>
      <SpinButton dir={1} label="Rotate right" colors={['#FF9AAE', '#FF4D6D', '#D6245A']} onPress={onRight} />
    </Glass>
  );
}

function SpinButton({
  dir,
  label,
  colors,
  onPress,
}: {
  dir: -1 | 1;
  label: string;
  colors: readonly [string, string, string];
  onPress: () => void;
}) {
  const ripple = useRef(new Animated.Value(1)).current;
  const fire = () => {
    onPress();
    ripple.setValue(0);
    Animated.timing(ripple, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  return (
    <View style={styles.spinSlot}>
      <Animated.View
        style={[
          styles.ripple,
          {
            borderColor: colors[1],
            opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
            transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
          },
        ]}
      />
      <Tap
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={fire}
        depth={0.88}
        style={[styles.spinWrap, { shadowColor: colors[1] }]}
      >
        <LinearGradient colors={colors} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={styles.spin}>
          <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} style={styles.spinGloss} />
          <RotateIcon dir={dir} size={36} color="#140824" stroke={3} />
        </LinearGradient>
      </Tap>
    </View>
  );
}

const SPIN = 82;

const styles = StyleSheet.create({
  hudOuter: {
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  hud: {
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 10,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreBlock: { minWidth: 0, flexShrink: 1 },
  scorePop: { alignSelf: 'flex-start', width: '100%' },
  glassBlock: { alignItems: 'center', gap: 6 },
  hudLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: font,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  hudScore: {
    color: '#FFFFFF',
    fontFamily: display,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    width: '100%',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  hudRight: { alignItems: 'flex-end', minWidth: 0, flexShrink: 1 },
  best: {
    color: '#FFFFFF',
    fontFamily: display,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: '100%',
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  tierDot: { width: 6, height: 6, borderRadius: 1.5, transform: [{ rotate: '45deg' }] },
  wave: {
    fontFamily: font,
    fontWeight: '900',
    letterSpacing: 1,
    flexShrink: 1,
  },
  pips: { flexDirection: 'row', gap: 6 },
  pipGlow: {
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 9,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 0.8,
    maxWidth: '45%',
  },
  bannerFloat: {
    position: 'absolute',
    top: 4,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 3,
    pointerEvents: 'none',
  },
  bannerBorder: {
    borderRadius: 999,
    padding: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerFace: {
    borderRadius: 999,
    backgroundColor: 'rgba(12,6,22,0.9)',
    paddingHorizontal: 22,
    paddingVertical: 8,
  },
  banner: {
    color: '#FFFFFF',
    fontFamily: display,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  aura: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  dockOuter: {
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  dock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spinSlot: {
    width: SPIN,
    height: SPIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: SPIN,
    height: SPIN,
    borderRadius: 28,
    borderWidth: 2,
  },
  spinWrap: {
    borderRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  spin: {
    width: SPIN,
    height: SPIN,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
  },
  spinGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SPIN * 0.48,
  },
  pause: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
