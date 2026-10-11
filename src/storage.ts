import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SaveData } from './game/types';

const KEY = 'kaleido-save-v1';

export const DEFAULT_SAVE: SaveData = {
  best: 0,
  bestCombo: 0,
  haptics: true,
  sound: true,
  adsRemoved: false,
};

export async function loadSave(): Promise<SaveData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SAVE;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      best: typeof parsed.best === 'number' ? parsed.best : 0,
      bestCombo: typeof parsed.bestCombo === 'number' ? parsed.bestCombo : 0,
      haptics: parsed.haptics !== false,
      sound: parsed.sound !== false,
      adsRemoved: Boolean(parsed.adsRemoved),
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

export async function writeSave(save: SaveData) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // High scores stay in memory if storage is unavailable.
  }
}
