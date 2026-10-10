import { useEffect, useMemo, useRef } from 'react';
import { BackHandler, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuScreen } from './src/components/MenuScreen';
import { PlayStage, type StageHandle } from './src/components/Playfield';
import { fitFont, font, Rise, Tap, Type } from './src/components/ui';
import { useKaleido } from './src/game/useKaleido';
import { waveName } from './src/game/palette';

export default function App() {
  return (
    <SafeAreaProvider style={styles.root}>
      <Game />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

function Game() {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stageRef = useRef<StageHandle>(null);
  const { hud, stateRef, booted, play, turn, pause, resume, menu, toggleHaptics, toggleSound, setSize } = useKaleido(stageRef);
  const size = Math.min(width - 36, Math.max(200, height - insets.top - insets.bottom - 276));
  setSize(size);
  const hudInner = Math.max(160, width - 64);
  const scoreWidth = Math.max(72, hudInner * 0.4);
  const sideWidth = Math.max(64, hudInner * 0.3);
  const sheetWidth = Math.max(160, width - 44);
  const scoreText = String(hud.score);
  const bestText = String(hud.best);
  const scoreSize = fitFont(scoreText, scoreWidth, 40, 16);
  const bestSize = fitFont(bestText, sideWidth, 20, 11);
  const waveText = waveName(hud.catches);
  const waveSize = fitFont(waveText, sideWidth, 12, 9, 0.8);
  const finalSize = fitFont(scoreText, sheetWidth, 72, 28);
  const metaText = `${waveName(hud.catches)} · best combo ${Math.max(hud.maxCombo, hud.bestCombo)}`;
  const metaSize = fitFont(metaText, sheetWidth, 14, 10);
  const bannerSize = fitFont(hud.banner, Math.max(120, width - 96), 13, 9, 1.8);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hud.phase === 'playing') {
        pause();
        return true;
      }
      if (hud.phase === 'paused' || hud.phase === 'over') {
        menu();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [menu, pause, hud.phase]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 22 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 28) turn(1);
          else if (gesture.dx < -28) turn(-1);
        },
      }),
    [turn],
  );

  return (
    <LinearGradient
      colors={hud.fever ? ['#4A1238', '#1A0816', '#24102E'] : ['#241044', '#0C0616', '#062028']}
      style={styles.root}
    >
      <View style={[styles.pad, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 10) }]}>
        {!booted ? (
          <View style={styles.center}>
            <Type style={styles.loading}>Warming the glass…</Type>
          </View>
        ) : hud.phase === 'menu' ? (
          <MenuScreen
            best={hud.best}
            haptics={hud.haptics}
            sound={hud.sound}
            onPlay={play}
            onToggleHaptics={toggleHaptics}
            onToggleSound={toggleSound}
          />
        ) : (
          <View style={styles.playWrap}>
            <View style={styles.hud}>
              <View style={[styles.scoreBlock, { maxWidth: scoreWidth }]}>
                <Type style={styles.hudLabel} numberOfLines={1}>SCORE</Type>
                <Type
                  style={[styles.hudScore, { fontSize: scoreSize, lineHeight: scoreSize + 4 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}
                >
                  {hud.score}
                </Type>
              </View>
              <View style={styles.glassBlock}>
                <Type style={styles.hudLabel}>GLASS</Type>
                <View style={styles.pips}>
                  {Array.from({ length: 3 }, (_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.pip,
                        index < hud.cracks ? styles.pipCracked : styles.pipSafe,
                      ]}
                    >
                      {index < hud.cracks ? <View style={styles.pipSlash} /> : null}
                    </View>
                  ))}
                </View>
              </View>
              <View style={[styles.hudRight, { maxWidth: sideWidth }]}>
                <Type style={styles.hudLabel} numberOfLines={1}>BEST</Type>
                <Type
                  style={[styles.best, { fontSize: bestSize, lineHeight: bestSize + 2 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {hud.best}
                </Type>
                <Type
                  style={[styles.wave, { fontSize: waveSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {waveText}
                </Type>
              </View>
            </View>

            <View style={styles.stage} {...pan.panHandlers}>
              {hud.bannerOn && (
                <View style={styles.bannerFloat}>
                  <Type
                    style={[styles.banner, { fontSize: bannerSize }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {hud.banner}
                  </Type>
                </View>
              )}
              <PlayStage
                ref={stageRef}
                stateRef={stateRef}
                size={size}
                colorCount={hud.colorCount}
                cracks={hud.cracks}
                phase={hud.phase}
                hue={hud.hue}
                fever={hud.fever}
                revision={hud.revision}
                combo={hud.combo}
                chainCount={hud.chainCount}
                banner={hud.banner}
                bannerOn={hud.bannerOn}
              />
            </View>

            <View style={styles.dock}>
              <Tap accessibilityRole="button" accessibilityLabel="Rotate left" onPress={() => turn(-1)} style={[styles.spin, styles.spinLeft]}>
                <Type style={styles.spinIcon}>↺</Type>
              </Tap>
              <Tap accessibilityRole="button" accessibilityLabel="Pause" onPress={pause} style={styles.pause}>
                <Type style={styles.pauseText}>II</Type>
              </Tap>
              <Tap accessibilityRole="button" accessibilityLabel="Rotate right" onPress={() => turn(1)} style={[styles.spin, styles.spinRight]}>
                <Type style={styles.spinIcon}>↻</Type>
              </Tap>
            </View>
          </View>
        )}
      </View>

      {hud.phase === 'paused' && (
        <View style={styles.overlay}>
          <Rise style={styles.overlayColumn}>
            <View style={styles.overlayTop}>
              <View style={[styles.sheet, { paddingTop: insets.top + 22 }]}>
                <Type style={styles.overlayKicker} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  HOLDING
                </Type>
                <Type
                  style={[styles.overlayTitle, { fontSize: fitFont('PAUSED', sheetWidth, 36, 22, 0.6) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  PAUSED
                </Type>
              </View>
            </View>
            <View style={[styles.overlayActions, { paddingBottom: insets.bottom + 16 }]}>
              <Tap accessibilityRole="button" onPress={resume} style={styles.primary}>
                <Type style={styles.primaryText}>RESUME</Type>
              </Tap>
              <Tap accessibilityRole="button" onPress={menu} style={styles.ghost}>
                <Type style={styles.ghostText}>MENU</Type>
              </Tap>
            </View>
          </Rise>
        </View>
      )}

      {hud.phase === 'over' && (
        <View style={styles.overlay}>
          <Rise style={styles.overlayColumn}>
            <View style={styles.overlayTop}>
              <View style={[styles.sheet, { paddingTop: insets.top + 22 }]}>
                <Type style={styles.overlayKicker}>GLASS</Type>
                <Type
                  style={[styles.overlayTitle, { fontSize: fitFont('SHATTERED', sheetWidth, 36, 22, 0.6) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  SHATTERED
                </Type>
                <Type
                  style={[styles.finalScore, { fontSize: finalSize, lineHeight: finalSize + 6 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}
                >
                  {hud.score}
                </Type>
                {hud.newBest && (
                  <Type style={styles.newBest} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    NEW BEST
                  </Type>
                )}
                <Type
                  style={[styles.meta, { fontSize: metaSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {metaText}
                </Type>
              </View>
            </View>
            <View style={[styles.overlayActions, { paddingBottom: insets.bottom + 16 }]}>
              <Tap accessibilityRole="button" onPress={play} style={styles.primary}>
                <Type style={styles.primaryText}>AGAIN</Type>
              </Tap>
              <Tap accessibilityRole="button" onPress={menu} style={styles.ghost}>
                <Type style={styles.ghostText}>MENU</Type>
              </Tap>
            </View>
          </Rise>
        </View>
      )}
    </LinearGradient>
  );
}

const glass = {
  backgroundColor: 'rgba(12, 6, 20, 0.78)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.14)',
  borderRadius: 24,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0614' },
  pad: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#FFFFFF', fontFamily: font, fontWeight: '800', letterSpacing: 1.4 },
  playWrap: { flex: 1, justifyContent: 'space-between' },
  hud: {
    ...glass,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  scoreBlock: { minWidth: 0, flexShrink: 1 },
  glassBlock: { alignItems: 'center', gap: 6 },
  hudLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: font,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  hudScore: {
    color: '#FFFFFF',
    fontFamily: font,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    width: '100%',
  },
  hudRight: { alignItems: 'flex-end', minWidth: 0, flexShrink: 1 },
  best: {
    color: '#FFFFFF',
    fontFamily: font,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: '100%',
  },
  wave: {
    color: '#00F5D4',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
    textAlign: 'right',
    width: '100%',
  },
  pips: { flexDirection: 'row', gap: 7 },
  pip: {
    width: 22,
    height: 10,
    borderRadius: 6,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipSafe: {
    backgroundColor: 'rgba(0,245,212,0.28)',
    borderColor: '#00F5D4',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  pipCracked: { backgroundColor: '#FF4D6D', borderColor: '#FFD0D8' },
  pipSlash: { width: 16, height: 2, backgroundColor: 'rgba(255,255,255,0.92)', transform: [{ rotate: '38deg' }] },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bannerFloat: {
    position: 'absolute',
    top: 2,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 2,
    pointerEvents: 'none',
  },
  banner: {
    color: '#FFFFFF',
    fontFamily: font,
    backgroundColor: 'rgba(12,6,20,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  dock: {
    ...glass,
    marginHorizontal: 16,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  spin: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    elevation: 8,
  },
  spinLeft: {
    backgroundColor: '#00F5D4',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  spinRight: {
    backgroundColor: '#FF4D6D',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  spinIcon: { color: '#140824', fontFamily: font, fontSize: 38, fontWeight: '900', marginTop: -2 },
  pause: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pauseText: { color: '#FFFFFF', fontFamily: font, fontWeight: '900', letterSpacing: 2, fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 3, 14, 0.82)',
  },
  overlayColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  overlayTop: {
    alignItems: 'stretch',
  },
  sheet: {
    ...glass,
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: '#120818',
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  overlayActions: {
    paddingHorizontal: 16,
    gap: 8,
  },
  overlayKicker: { color: '#00F5D4', fontFamily: font, fontWeight: '800', letterSpacing: 3, fontSize: 12 },
  overlayTitle: {
    color: '#FFFFFF',
    fontFamily: font,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  finalScore: {
    color: '#FFBE0B',
    fontFamily: font,
    fontWeight: '900',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: '100%',
  },
  newBest: {
    color: '#FF4D6D',
    fontFamily: font,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  meta: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: font,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: '#FF4D6D',
    borderRadius: 22,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryText: { color: '#FFFFFF', fontFamily: font, fontWeight: '900', letterSpacing: 2.4, fontSize: 18 },
  ghost: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(16, 8, 28, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  ghostText: { color: 'rgba(255,255,255,0.86)', fontFamily: font, fontWeight: '800', letterSpacing: 1.6 },
});
