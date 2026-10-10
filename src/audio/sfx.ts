import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SfxName =
  | 'tick'
  | 'catch'
  | 'rush'
  | 'rainbow'
  | 'prism'
  | 'miss'
  | 'glass'
  | 'big'
  | 'bloom'
  | 'fever'
  | 'hue'
  | 'shatter';

const sources = {
  tick: require('../../assets/sfx/tick.wav'),
  catch: require('../../assets/sfx/catch.wav'),
  rush: require('../../assets/sfx/rush.wav'),
  rainbow: require('../../assets/sfx/rainbow.wav'),
  prism: require('../../assets/sfx/prism.wav'),
  miss: require('../../assets/sfx/miss.wav'),
  glass: require('../../assets/sfx/tiny_glass_break.mp3'),
  big: require('../../assets/sfx/big_glass_break.mp3'),
  bloom: require('../../assets/sfx/bloom.wav'),
  fever: require('../../assets/sfx/fever.wav'),
  hue: require('../../assets/sfx/hue.wav'),
  shatter: require('../../assets/sfx/shatter.wav'),
  music: require('../../assets/sfx/music.wav'),
} as const;

const poolSize: Record<SfxName, number> = {
  tick: 4,
  catch: 4,
  rush: 2,
  rainbow: 2,
  prism: 2,
  miss: 2,
  glass: 2,
  big: 1,
  bloom: 2,
  fever: 1,
  hue: 1,
  shatter: 1,
};

const pools = {} as Record<SfxName, AudioPlayer[]>;
const cursor: Partial<Record<SfxName, number>> = {};
let music: AudioPlayer | null = null;
let ready = false;
let wantMusic = false;
let preparing: Promise<void> | null = null;

const playerOptions = { updateInterval: 1000, keepAudioSessionActive: true };

async function localSource(moduleId: number) {
  const asset = Asset.fromModule(moduleId);
  try {
    if (!asset.localUri) await asset.downloadAsync();
  } catch (error) {
    console.warn('Kaleido audio: asset download failed', error);
  }
  const uri = asset.localUri ?? asset.uri;
  return uri ? { uri } : moduleId;
}

function start(player: AudioPlayer) {
  try {
    player.play();
  } catch (error) {
    console.warn('Kaleido audio: play failed', error);
  }
}

export async function prepareAudio() {
  if (ready) return;
  if (preparing) return preparing;
  preparing = (async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
      });
    } catch (error) {
      console.warn('Kaleido audio: mode failed', error);
    }

    for (const name of Object.keys(poolSize) as SfxName[]) {
      pools[name] = [];
      const source = await localSource(sources[name]);
      for (let index = 0; index < poolSize[name]; index += 1) {
        try {
          const player = createAudioPlayer(source, playerOptions);
          player.volume = name === 'tick' ? 0.55 : 1;
          pools[name].push(player);
        } catch (error) {
          console.warn(`Kaleido audio: could not load ${name}`, error);
        }
      }
    }

    try {
      music = createAudioPlayer(await localSource(sources.music), playerOptions);
      music.loop = true;
      music.volume = 0.72;
    } catch (error) {
      console.warn('Kaleido audio: could not load music', error);
      music = null;
    }

    ready = true;
    if (wantMusic && music) start(music);
  })();
  return preparing;
}

export function playSfx(name: SfxName, rate = 1) {
  if (!ready) return;
  const pool = pools[name];
  if (!pool?.length) return;
  const index = cursor[name] ?? 0;
  cursor[name] = (index + 1) % pool.length;
  const player = pool[index];
  try {
    if (rate !== 1) {
      player.shouldCorrectPitch = false;
      player.playbackRate = rate;
    }
    void player.seekTo(0).finally(() => start(player));
    setTimeout(() => start(player), 150);
  } catch (error) {
    console.warn(`Kaleido audio: ${name} failed`, error);
  }
}

export function setMusic(on: boolean) {
  wantMusic = on;
  if (!music) return;
  try {
    if (on) start(music);
    else music.pause();
  } catch (error) {
    console.warn('Kaleido audio: music failed', error);
  }
}
