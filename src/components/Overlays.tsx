import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, G, Path, RadialGradient, Circle, Stop } from 'react-native-svg';

import { TAU } from '../game/geometry';
import { CrownIcon, HomeIcon, PauseIcon, PlayIcon, ReplayIcon, SparkleIcon } from './icons';
import { CountUp, display, fitFont, font, formatScore, Glass, GhostButton, GlowButton, Rise, Type } from './ui';

type Insets = { top: number; bottom: number };

function Scrim({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fade, delay]);

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <LinearGradient
        colors={['rgba(8,4,18,0.92)', 'rgba(8,4,18,0.72)', 'rgba(8,4,18,0.94)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Animated.View>
  );
}

function Stat({ label, value, color, width }: { label: string; value: string; color: string; width: number }) {
  const size = fitFont(value, width - 16, 18, 10);
  return (
    <View style={[styles.stat, { width }]}>
      <Type style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Type>
      <Type
        style={[styles.statValue, { color, fontSize: size, lineHeight: size + 4 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Type>
    </View>
  );
}

/* ---------------------------------------------------------------- Pause */

type PauseProps = {
  score: number;
  tier: string;
  width: number;
  insets: Insets;
  onResume: () => void;
  onMenu: () => void;
};

export function PauseOverlay({ score, tier, width, insets, onResume, onMenu }: PauseProps) {
  const sheetWidth = Math.max(160, width - 44);
  const tile = (sheetWidth - 32 - 10) / 2;
  return (
    <Scrim>
      <View style={styles.column}>
        <Rise from={-24} zoom={0.92} style={[styles.cardWrap, { paddingTop: insets.top + 20 }]}>
          <Glass radius={30} accent="#00F5D4" contentStyle={styles.card}>
            <View style={styles.pauseBadge}>
              <PauseIcon size={26} color="#00F5D4" />
            </View>
            <Type style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              HOLDING
            </Type>
            <Type
              style={[styles.title, { fontSize: fitFont('PAUSED', sheetWidth, 38, 22, 0.6) }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              PAUSED
            </Type>
            <View style={styles.stats}>
              <Stat label="SCORE" value={formatScore(score)} color="#FFFFFF" width={tile} />
              <Stat label="TIER" value={tier.toUpperCase()} color="#00F5D4" width={tile} />
            </View>
          </Glass>
        </Rise>
        <Rise delay={80} from={30} style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <GlowButton
            label="RESUME"
            onPress={onResume}
            colors={['#7DFFEA', '#00D9BE', '#00A896']}
            icon={<PlayIcon size={20} />}
          />
          <GhostButton label="MENU" onPress={onMenu} icon={<HomeIcon size={18} color="rgba(255,255,255,0.85)" />} />
        </Rise>
      </View>
    </Scrim>
  );
}

/* ------------------------------------------------------------ Game over */

type OverProps = {
  score: number;
  best: number;
  newBest: boolean;
  tier: string;
  bestCombo: number;
  width: number;
  insets: Insets;
  canRevive?: boolean;
  onRevive?: () => void;
  onAgain: () => void;
  onMenu: () => void;
};

/** Lets the glass visibly shatter before the results slide in. */
const REVEAL_DELAY = 650;

export function GameOverOverlay({
  score,
  best,
  newBest,
  tier,
  bestCombo,
  width,
  insets,
  canRevive = false,
  onRevive,
  onAgain,
  onMenu,
}: OverProps) {
  const sheetWidth = Math.max(160, width - 44);
  const scoreText = formatScore(score);
  const finalSize = fitFont(scoreText, sheetWidth - 40, 68, 28);
  const tile = (sheetWidth - 32 - 16) / 3;

  return (
    <Scrim delay={REVEAL_DELAY}>
      <View style={styles.column}>
        <Rise delay={REVEAL_DELAY} from={-30} zoom={0.9} style={[styles.cardWrap, { paddingTop: insets.top + 20 }]}>
          <Glass radius={30} accent={newBest ? '#FFBE0B' : '#FF4D6D'} contentStyle={styles.card}>
            <Type style={[styles.kicker, styles.kickerIce]}>GLASS</Type>
            <Type
              style={[styles.title, styles.titleIce, { fontSize: fitFont('SHATTERED', sheetWidth, 38, 22, 0.6) }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              SHATTERED
            </Type>

            <View style={styles.scoreStage}>
              {newBest ? <Sunburst size={Math.min(260, sheetWidth)} /> : null}
              <CountUp
                value={score}
                delay={REVEAL_DELAY + 150}
                style={[styles.finalScore, { fontSize: finalSize, lineHeight: finalSize + 8 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.4}
              />
            </View>

            {newBest && (
              <Rise delay={REVEAL_DELAY + 1100} zoom={0.4} from={0}>
                <LinearGradient
                  colors={['#FFE566', '#FFBE0B', '#FF8C42']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.newBest}
                >
                  <CrownIcon size={15} color="#3A1A00" />
                  <Type style={styles.newBestText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    NEW BEST
                  </Type>
                </LinearGradient>
              </Rise>
            )}

            <View style={styles.stats}>
              <Stat label="TIER" value={tier.toUpperCase()} color="#00F5D4" width={tile} />
              <Stat label="BEST COMBO" value={`${bestCombo}×`} color="#F15BB5" width={tile} />
              <Stat label="BEST" value={formatScore(best)} color="#FFBE0B" width={tile} />
            </View>
          </Glass>
        </Rise>
        <Rise delay={REVEAL_DELAY + 120} from={30} style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          {canRevive && onRevive && (
            <GlowButton
              label="REVIVE (AD)"
              onPress={onRevive}
              colors={['#00F5D4', '#00BBF9', '#9B5DE5']}
              icon={<SparkleIcon size={20} color="#FFFFFF" />}
            />
          )}
          <GlowButton label="AGAIN" onPress={onAgain} icon={<ReplayIcon size={20} />} />
          <GhostButton label="MENU" onPress={onMenu} icon={<HomeIcon size={18} color="rgba(255,255,255,0.85)" />} />
        </Rise>
      </View>
    </Scrim>
  );
}

function Sunburst({ size }: { size: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const c = size / 2;
  const rays = 14;
  return (
    <Animated.View
      style={[
        styles.sunburst,
        { width: size, height: size, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFBE0B" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#FFBE0B" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill="url(#sun-glow)" />
        <G opacity={0.28}>
          {Array.from({ length: rays }, (_, index) => {
            const a = (index / rays) * TAU;
            const w = (TAU / rays) * 0.28;
            const r = c * 0.98;
            return (
              <Path
                key={index}
                d={`M ${c} ${c} L ${c + Math.cos(a - w) * r} ${c + Math.sin(a - w) * r} L ${c + Math.cos(a + w) * r} ${c + Math.sin(a + w) * r} Z`}
                fill="#FFE566"
              />
            );
          })}
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  column: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardWrap: {
    paddingHorizontal: 16,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 18,
  },
  pauseBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,212,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,212,0.5)',
    marginBottom: 10,
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  kicker: { color: '#00F5D4', fontFamily: font, fontWeight: '900', letterSpacing: 4, fontSize: 12 },
  kickerIce: { color: '#BFE9FF' },
  title: {
    color: '#FFFFFF',
    fontFamily: display,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  titleIce: {
    color: '#F4F8FF',
    textShadowColor: 'rgba(160,220,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  scoreStage: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    marginTop: 4,
  },
  sunburst: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  finalScore: {
    color: '#FFBE0B',
    fontFamily: display,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(255,190,11,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  newBest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#FFBE0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 6,
  },
  newBestText: {
    color: '#3A1A00',
    fontFamily: display,
    fontWeight: '900',
    letterSpacing: 2.4,
    fontSize: 13,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: font,
    fontWeight: '800',
    fontSize: 9.5,
    letterSpacing: 1.4,
  },
  statValue: {
    fontFamily: display,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'center',
    width: '100%',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    paddingHorizontal: 16,
    gap: 10,
  },
});
