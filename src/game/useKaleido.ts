import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';

import { playSfx, prepareAudio, setMusic } from '../audio/sfx';
import type { StageHandle } from '../components/Playfield';
import { DEFAULT_SAVE, loadSave, writeSave } from '../storage';
import { createState, decayFx, reviveRun, spin, startRun, step } from './engine';
import type { GameEvent, GameState, Phase, SaveData } from './types';

function buzz(run: () => Promise<unknown>) {
  run().catch(() => undefined);
}

function snapshot(state: GameState): SaveData {
  return {
    best: state.best,
    bestCombo: state.bestCombo,
    haptics: state.haptics,
    sound: state.sound,
  };
}

function syncMusic(state: GameState) {
  setMusic(state.sound && (state.phase === 'menu' || state.phase === 'playing'));
}

export type Hud = {
  phase: Phase;
  score: number;
  best: number;
  cracks: number;
  catches: number;
  combo: number;
  chainCount: number;
  fever: boolean;
  hue: number;
  banner: string;
  bannerOn: boolean;
  colorCount: number;
  newBest: boolean;
  maxCombo: number;
  bestCombo: number;
  haptics: boolean;
  sound: boolean;
  revived: boolean;
  revision: number;
};

function toHud(state: GameState, revision: number): Hud {
  return {
    phase: state.phase,
    score: state.score,
    best: state.best,
    cracks: state.cracks,
    catches: state.catches,
    combo: state.combo,
    chainCount: state.chainCount,
    fever: state.fever > 0,
    hue: state.hue,
    banner: state.banner,
    bannerOn: state.bannerTime > 0,
    colorCount: state.colorCount,
    newBest: state.newBest,
    maxCombo: state.maxCombo,
    bestCombo: state.bestCombo,
    haptics: state.haptics,
    sound: state.sound,
    revived: state.revived,
    revision,
  };
}

function playEvents(state: GameState, events: GameEvent[]) {
  if (!state.sound) return;
  for (const event of events) {
    if (event.type === 'catch') {
      if (event.kind === 'rush') playSfx('rush');
      else if (event.kind === 'rainbow') playSfx('rainbow');
      else if (event.kind === 'prism') playSfx('prism');
      else playSfx('catch', 1 + Math.min(state.combo, 8) * 0.045);
    } else if (event.type === 'miss' && state.cracks < 3) playSfx('glass');
    else if (event.type === 'bloom') playSfx('bloom');
    else if (event.type === 'fever') playSfx('fever');
    else if (event.type === 'hue') playSfx('hue');
    else if (event.type === 'over') playSfx('big');
  }
}

function react(state: GameState, events: GameEvent[]) {
  if (events.length === 0) return;
  playEvents(state, events);
  const kinds = new Set(events.map((event) => event.type));
  if (kinds.has('over')) syncMusic(state);
  if (state.haptics) {
    if (kinds.has('over')) buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    else if (kinds.has('miss')) buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    else if (kinds.has('bloom') || kinds.has('fever')) {
      buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    } else if (kinds.has('hue') || kinds.has('prism')) {
      buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    } else if (kinds.has('catch')) buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }
  if (kinds.has('over')) void writeSave(snapshot(state));
}

export function useKaleido(stageRef: RefObject<StageHandle | null>) {
  const stateRef = useRef<GameState>(createState(DEFAULT_SAVE));
  const sizeRef = useRef(320);
  const [hud, setHud] = useState<Hud>(() => toHud(stateRef.current, 0));
  const [booted, setBooted] = useState(false);
  const hudRef = useRef(hud);
  const revision = useRef(0);
  const looping = useRef(false);
  const frame = useRef(0);

  const publish = useCallback(
    (live: GameState) => {
      stageRef.current?.draw(live);
      const prev = hudRef.current;
      const rev = revision.current;
      const bannerOn = live.bannerTime > 0;
      const fever = live.fever > 0;
      if (
        prev.revision === rev &&
        prev.phase === live.phase &&
        prev.score === live.score &&
        prev.best === live.best &&
        prev.cracks === live.cracks &&
        prev.catches === live.catches &&
        prev.combo === live.combo &&
        prev.chainCount === live.chainCount &&
        prev.fever === fever &&
        prev.hue === live.hue &&
        prev.banner === live.banner &&
        prev.bannerOn === bannerOn &&
        prev.colorCount === live.colorCount &&
        prev.newBest === live.newBest &&
        prev.maxCombo === live.maxCombo &&
        prev.bestCombo === live.bestCombo &&
        prev.haptics === live.haptics &&
        prev.sound === live.sound &&
        prev.revived === live.revived
      ) {
        return;
      }
      const next = toHud(live, rev);
      hudRef.current = next;
      setHud(next);
    },
    [stageRef],
  );

  const pump = useCallback(() => {
    if (looping.current) return;
    looping.current = true;
    let last = 0;
    const draw = (now: number) => {
      const dt = last === 0 ? 0.016 : Math.min(0.034, (now - last) / 1000);
      last = now;
      const state = stateRef.current;
      try {
        const playing = state.phase === 'playing';
        const events = playing ? step(state, dt, sizeRef.current) : [];
        if (!playing) decayFx(state, dt);
        if (events.length > 0) {
          react(state, events);
          revision.current += 1;
        }
        publish(state);
      } catch (error) {
        console.warn('Kaleido frame', error);
      }
      const shattering = state.phase === 'over' && state.elapsed - state.shatterAt < 1.5;
      const cracking = state.fractures.some((fracture) => state.elapsed - fracture.born < 0.4);
      const alive =
        state.phase === 'playing' ||
        shattering ||
        cracking ||
        state.bannerTime > 0 ||
        state.particles.length > 0 ||
        state.floaters.length > 0 ||
        state.flash > 0.02 ||
        state.shake > 0.02;
      if (alive) frame.current = requestAnimationFrame(draw);
      else looping.current = false;
    };
    frame.current = requestAnimationFrame(draw);
  }, [publish]);

  useEffect(() => {
    let live = true;
    loadSave().then((save) => {
      if (!live) return;
      stateRef.current = createState(save);
      const next = toHud(stateRef.current, revision.current);
      hudRef.current = next;
      setHud(next);
      setBooted(true);
      void prepareAudio().then(() => {
        if (live) syncMusic(stateRef.current);
      });
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        setMusic(false);
        if (stateRef.current.phase === 'playing') {
          stateRef.current.phase = 'paused';
          publish(stateRef.current);
        }
      } else {
        syncMusic(stateRef.current);
      }
    });
    return () => sub.remove();
  }, [publish]);

  const play = useCallback(() => {
    startRun(stateRef.current);
    syncMusic(stateRef.current);
    publish(stateRef.current);
    pump();
  }, [publish, pump]);

  const turn = useCallback(
    (direction: -1 | 1) => {
      const state = stateRef.current;
      const before = state.targetRotation;
      spin(state, direction);
      if (state.targetRotation !== before) {
        if (state.haptics) buzz(() => Haptics.selectionAsync());
        if (state.sound) playSfx('tick');
      }
      publish(state);
      pump();
    },
    [publish, pump],
  );

  const pause = useCallback(() => {
    if (stateRef.current.phase !== 'playing') return;
    stateRef.current.phase = 'paused';
    syncMusic(stateRef.current);
    publish(stateRef.current);
  }, [publish]);

  const resume = useCallback(() => {
    if (stateRef.current.phase !== 'paused') return;
    stateRef.current.phase = 'playing';
    syncMusic(stateRef.current);
    publish(stateRef.current);
    pump();
  }, [publish, pump]);

  const revive = useCallback(() => {
    if (stateRef.current.phase !== 'over') return;
    reviveRun(stateRef.current);
    syncMusic(stateRef.current);
    publish(stateRef.current);
    pump();
  }, [publish, pump]);

  const menu = useCallback(() => {
    const state = stateRef.current;
    state.bestCombo = Math.max(state.bestCombo, state.maxCombo);
    void writeSave(snapshot(state));
    state.phase = 'menu';
    state.sparks = [];
    state.particles = [];
    state.floaters = [];
    syncMusic(state);
    publish(state);
  }, [publish]);

  const toggleHaptics = useCallback(() => {
    const state = stateRef.current;
    state.haptics = !state.haptics;
    void writeSave(snapshot(state));
    publish(state);
  }, [publish]);

  const toggleSound = useCallback(() => {
    const state = stateRef.current;
    state.sound = !state.sound;
    void writeSave(snapshot(state));
    syncMusic(state);
    publish(state);
  }, [publish]);

  const setSize = useCallback((size: number) => {
    sizeRef.current = size;
  }, []);

  return {
    hud,
    stateRef,
    booted,
    play,
    revive,
    turn,
    pause,
    resume,
    menu,
    toggleHaptics,
    toggleSound,
    setSize,
  };
}
