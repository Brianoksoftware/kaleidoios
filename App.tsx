import { useEffect, useMemo, useRef } from 'react';
import { BackHandler, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuScreen } from './src/components/MenuScreen';
import { PlayStage, type StageHandle } from './src/components/Playfield';
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
  const size = Math.min(width - 24, Math.max(220, height - insets.top - insets.bottom - 210));
  setSize(size);

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
      colors={hud.fever ? ['#4A1238', '#240818', '#3A1848'] : ['#2A0A4A', '#12081C', '#062433']}
      style={styles.root}
    >
      <View style={[styles.pad, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        {!booted ? (
          <View style={styles.center}>
            <Text style={styles.loading}>Warming the glass…</Text>
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
              <View>
                <Text style={styles.hudLabel}>SCORE</Text>
                <Text style={styles.hudScore}>{hud.score}</Text>
              </View>
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
              <View style={styles.hudRight}>
                <Text style={styles.hudLabel}>BEST {hud.best}</Text>
                <Text style={styles.wave}>{waveName(hud.catches)}</Text>
              </View>
            </View>

            <View {...pan.panHandlers}>
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

            <View style={styles.controls}>
              <Pressable accessibilityRole="button" accessibilityLabel="Rotate left" onPress={() => turn(-1)} style={[styles.spin, { backgroundColor: '#00F5D4' }]}>
                <Text style={styles.spinIcon}>↺</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={pause} style={styles.pause}>
                <Text style={styles.pauseText}>II</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Rotate right" onPress={() => turn(1)} style={[styles.spin, { backgroundColor: '#FF4D6D' }]}>
                <Text style={styles.spinIcon}>↻</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {hud.phase === 'paused' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>PAUSED</Text>
          <Pressable accessibilityRole="button" onPress={resume} style={styles.primary}>
            <Text style={styles.primaryText}>RESUME</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={menu} style={styles.ghost}>
            <Text style={styles.ghostText}>MENU</Text>
          </Pressable>
        </View>
      )}

      {hud.phase === 'over' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayKicker}>THE GLASS</Text>
          <Text style={styles.overlayTitle}>SHATTERED</Text>
          <Text style={styles.finalScore}>{hud.score}</Text>
          {hud.newBest && <Text style={styles.newBest}>NEW BEST</Text>}
          <Text style={styles.meta}>
            {waveName(hud.catches)} · best combo {Math.max(hud.maxCombo, hud.bestCombo)}
          </Text>
          <Pressable accessibilityRole="button" onPress={play} style={styles.primary}>
            <Text style={styles.primaryText}>AGAIN</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={menu} style={styles.ghost}>
            <Text style={styles.ghostText}>MENU</Text>
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#140824' },
  pad: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1 },
  playWrap: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  hud: {
    width: '100%',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  hudScore: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  hudRight: { alignItems: 'flex-end' },
  wave: { color: '#00F5D4', fontWeight: '900', letterSpacing: 1 },
  pips: { flexDirection: 'row', gap: 8 },
  pip: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pipSafe: { backgroundColor: 'rgba(0,245,212,0.28)', borderColor: '#00F5D4' },
  pipCracked: { backgroundColor: '#FF4D6D', borderColor: '#FFB4C2' },
  pipSlash: { width: 14, height: 2, backgroundColor: 'rgba(255,255,255,0.9)', transform: [{ rotate: '38deg' }] },
  controls: {
    width: '100%',
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spin: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinIcon: { color: '#140824', fontSize: 40, fontWeight: '900', marginTop: -2 },
  pause: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pauseText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 4, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  overlayKicker: { color: '#00F5D4', fontWeight: '800', letterSpacing: 3 },
  overlayTitle: { color: '#FFFFFF', fontSize: 42, fontWeight: '900', letterSpacing: 1 },
  finalScore: { color: '#FFBE0B', fontSize: 64, fontWeight: '900', marginTop: 4 },
  newBest: { color: '#FF4D6D', fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  meta: { color: 'rgba(255,255,255,0.8)', marginBottom: 18 },
  primary: {
    backgroundColor: '#FF4D6D',
    borderRadius: 999,
    paddingHorizontal: 36,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 18 },
  ghost: { padding: 14 },
  ghostText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1.4 },
});
