import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kaleido.profile.v1';

export type Profile = {
  best: number;
  bestCombo: number;
  haptics: boolean;
};

export const defaultProfile: Profile = {
  best: 0,
  bestCombo: 0,
  haptics: true,
};

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultProfile;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultProfile;
    const record = parsed as Partial<Profile>;
    return {
      best: typeof record.best === 'number' ? record.best : 0,
      bestCombo: typeof record.bestCombo === 'number' ? record.bestCombo : 0,
      haptics: typeof record.haptics === 'boolean' ? record.haptics : true,
    };
  } catch {
    return defaultProfile;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // A failed local save should not interrupt the run.
  }
}
