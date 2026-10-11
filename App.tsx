import { useEffect, useMemo, useRef } from 'react';
import { BackHandler, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from './src/components/Backdrop';
import { Emblem } from './src/components/Emblem';
import { Banner, Dock, HudBar, StageAura } from './src/components/Hud';
import { MenuScreen } from './src/components/MenuScreen';
import { GameOverOverlay, PauseOverlay } from './src/components/Overlays';
import { PlayStage, type StageHandle } from './src/components/Playfield';
import { font, Type } from './src/components/ui';
import { HUES, waveName } from './src/game/palette';
import { useKaleido } from './src/game/useKaleido';
import {
  preloadInterstitial,
  preloadRewarded,
  showInterstitialIfReady,
  showRewardedAd,
} from './src/services/ads';

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
  const { hud, stateRef, booted, play, revive, turn, pause, resume, menu, toggleHaptics, toggleSound, setSize } =
    useKaleido(stageRef);

  // Preload test ads only after app is fully booted and user is idle
  useEffect(() => {
    if (!booted) return;
    const timer = setTimeout(() => {
      preloadInterstitial();
      preloadRewarded();
    }, 2500);
    return () => clearTimeout(timer);
  }, [booted]);

  // Safe handler: Shows interstitial if rules are satisfied, then plays
  const handleAgain = async () => {
    await showInterstitialIfReady();
    play();
  };

  // Safe handler: Shows interstitial if rules are satisfied, then returns to menu
  const handleMenu = async () => {
    await showInterstitialIfReady();
    menu();
  };

  // Rewarded Revive handler
  const handleRevive = async () => {
    await showRewardedAd(() => {
      revive();
    });
  };

  // Leave room for insets, HUD at top, and control dock at bottom
  const size = Math.min(width - 32, Math.max(200, height - insets.top - insets.bottom - 280));
  useEffect(() => {
    setSize(size);
  }, [size, setSize]);

  const activeColor = hud.fever ? '#FF4D6D' : HUES[hud.hue]?.hex ?? HUES[0].hex;
  const tier = waveName(hud.catches);

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
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (evt, gesture) => {
          if (gesture.dx > 20) {
            turn(1);
          } else if (gesture.dx < -20) {
            turn(-1);
          } else if (Math.abs(gesture.dx) < 12 && Math.abs(gesture.dy) < 12) {
            // Responsive stage tap: left half turns counter-clockwise, right half turns clockwise
            if (evt.nativeEvent.pageX < width / 2) {
              turn(-1);
            } else {
              turn(1);
            }
          }
        },
      }),
    [turn, width],
  );

  return (
    <View style={styles.root}>
      {/* Dynamic ambient backdrop */}
      <Backdrop
        hue={hud.phase === 'playing' || hud.phase === 'paused' ? hud.hue : null}
        fever={hud.fever}
        calm={hud.phase === 'playing'}
      />

      <View style={[styles.pad, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 10) }]}>
        {!booted ? (
          <View style={styles.center}>
            <Emblem size={140} id="loading" />
            <Type style={styles.loading}>Loading</Type>
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
            {/* HUD Bar */}
            <HudBar
              score={hud.score}
              best={hud.best}
              cracks={hud.cracks}
              catches={hud.catches}
              accent={activeColor}
              width={width}
            />

            {/* Stage */}
            <View style={styles.stage} {...pan.panHandlers}>
              <Banner text={hud.banner} on={hud.bannerOn} accent={activeColor} width={width} />
              <StageAura size={size} color={activeColor} fever={hud.fever} />
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

            {/* Controls Dock */}
            <Dock onLeft={() => turn(-1)} onRight={() => turn(1)} onPause={pause} />
          </View>
        )}
      </View>

      {/* Paused Overlay */}
      {hud.phase === 'paused' && (
        <PauseOverlay
          score={hud.score}
          tier={tier}
          width={width}
          insets={insets}
          onResume={resume}
          onMenu={menu}
        />
      )}

      {/* Game Over Overlay */}
      {hud.phase === 'over' && (
        <GameOverOverlay
          score={hud.score}
          best={hud.best}
          newBest={hud.newBest}
          tier={tier}
          bestCombo={Math.max(hud.maxCombo, hud.bestCombo)}
          width={width}
          insets={insets}
          canRevive={!hud.revived}
          onRevive={handleRevive}
          onAgain={handleAgain}
          onMenu={handleMenu}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0514' },
  pad: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  loading: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: font,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 14,
  },
  playWrap: { flex: 1, justifyContent: 'space-between' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
