import { Platform } from 'react-native';
import MobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { setMusic } from '../audio/sfx';

/**
 * Production AdMob Ad Unit IDs (use `/` format: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY).
 * Replace these strings with your live Ad Unit IDs from the Google AdMob console.
 * While set to empty strings (or in __DEV__ mode), official Google TestIds are used automatically.
 */
const PROD_IOS_UNITS = {
  BANNER: 'ca-app-pub-3223089616416804/4448440419',
  INTERSTITIAL: 'ca-app-pub-3223089616416804/8857750870',
  REWARDED: 'ca-app-pub-3223089616416804/4104117648',
};

const PROD_ANDROID_UNITS = {
  BANNER: '', // e.g. 'ca-app-pub-XXXXXXXXXXXXXXXX/4444444444'
  INTERSTITIAL: '', // e.g. 'ca-app-pub-XXXXXXXXXXXXXXXX/5555555555'
  REWARDED: '', // e.g. 'ca-app-pub-XXXXXXXXXXXXXXXX/6666666666'
};

export const AD_UNITS = {
  BANNER: __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: PROD_IOS_UNITS.BANNER || TestIds.BANNER,
        android: PROD_ANDROID_UNITS.BANNER || TestIds.BANNER,
        default: TestIds.BANNER,
      }),
  INTERSTITIAL: __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: PROD_IOS_UNITS.INTERSTITIAL || TestIds.INTERSTITIAL,
        android: PROD_ANDROID_UNITS.INTERSTITIAL || TestIds.INTERSTITIAL,
        default: TestIds.INTERSTITIAL,
      }),
  REWARDED: __DEV__
    ? TestIds.REWARDED
    : Platform.select({
        ios: PROD_IOS_UNITS.REWARDED || TestIds.REWARDED,
        android: PROD_ANDROID_UNITS.REWARDED || TestIds.REWARDED,
        default: TestIds.REWARDED,
      }),
};

// Frequency Cap Rules
const MIN_INTERVAL_MS = 75 * 1000; // 75 seconds between interstitials
const GAMES_BEFORE_FIRST_AD = 2; // Immunity: first 2 runs are ad-free
const RUNS_BETWEEN_ADS = 3; // Show interstitial every 3 completed runs

let runsCount = 0;
let lastInterstitialShownAt = 0;
let isAdsRemoved = false;
let sdkInitialized = false;
let sdkInitializing: Promise<void> | null = null;

// Ad Instances
let interstitialInstance: InterstitialAd | null = null;
let interstitialLoaded = false;
let rewardedInstance: RewardedAd | null = null;
let rewardedLoaded = false;
const rewardedListeners = new Set<(ready: boolean) => void>();

function notifyRewardedListeners() {
  const ready = isRewardedReady();
  rewardedListeners.forEach((listener) => listener(ready));
}

export function subscribeRewardedReady(listener: (ready: boolean) => void): () => void {
  rewardedListeners.add(listener);
  listener(isRewardedReady());
  return () => {
    rewardedListeners.delete(listener);
  };
}

export function setAdsRemoved(removed: boolean) {
  isAdsRemoved = removed;
  notifyRewardedListeners();
}

export function getAdsRemoved(): boolean {
  return isAdsRemoved;
}

/** Sync in-app sound toggle with AdMob video ad audio on iOS & Android */
export function syncAdMute(muted: boolean) {
  if (Platform.OS === 'web') return;
  try {
    MobileAds().setAppMuted(muted);
  } catch {
    // Ignore before native SDK is ready
  }
}

/**
 * Initializes Google Mobile Ads with family-safe content rating (G)
 * to comply with Apple App Store 4+ age rating (Guideline 2.3.6).
 */
export async function initializeAds(muted = false): Promise<void> {
  if (Platform.OS === 'web' || sdkInitialized) return;
  if (sdkInitializing) return sdkInitializing;

  sdkInitializing = (async () => {
    try {
      await MobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await MobileAds().initialize();
      MobileAds().setAppMuted(muted);
      sdkInitialized = true;
    } catch (error) {
      console.warn('AdMob initialization warning:', error);
    }
  })();

  return sdkInitializing;
}

/** Preload Interstitial */
export function preloadInterstitial() {
  if (isAdsRemoved || Platform.OS === 'web') return;
  try {
    if (!interstitialInstance) {
      interstitialInstance = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitialInstance.addAdEventListener(AdEventType.LOADED, () => {
        interstitialLoaded = true;
      });

      interstitialInstance.addAdEventListener(AdEventType.CLOSED, () => {
        interstitialLoaded = false;
        preloadInterstitial(); // preload next
      });

      interstitialInstance.addAdEventListener(AdEventType.ERROR, () => {
        interstitialLoaded = false;
      });
    }

    if (!interstitialLoaded) {
      interstitialInstance.load();
    }
  } catch (error) {
    console.warn('AdMob Interstitial preload warning:', error);
  }
}

/** Preload Rewarded */
export function preloadRewarded() {
  if (Platform.OS === 'web') return;
  try {
    if (!rewardedInstance) {
      rewardedInstance = RewardedAd.createForAdRequest(AD_UNITS.REWARDED, {
        requestNonPersonalizedAdsOnly: true,
      });

      rewardedInstance.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewardedLoaded = true;
        notifyRewardedListeners();
      });

      rewardedInstance.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        // Handled in showRewarded callback
      });

      rewardedInstance.addAdEventListener(AdEventType.CLOSED, () => {
        rewardedLoaded = false;
        notifyRewardedListeners();
        preloadRewarded();
      });

      rewardedInstance.addAdEventListener(AdEventType.ERROR, () => {
        rewardedLoaded = false;
        notifyRewardedListeners();
      });
    }

    if (!rewardedLoaded) {
      rewardedInstance.load();
    }
  } catch (error) {
    console.warn('AdMob Rewarded preload warning:', error);
  }
}

/** Checks whether an interstitial is allowed by frequency cap rules */
export function shouldShowInterstitial(): boolean {
  if (isAdsRemoved) return false;
  runsCount += 1;
  const now = Date.now();
  if (runsCount <= GAMES_BEFORE_FIRST_AD) return false;
  if (runsCount % RUNS_BETWEEN_ADS !== 0) return false;
  if (now - lastInterstitialShownAt < MIN_INTERVAL_MS) return false;
  return interstitialLoaded;
}

/** Shows Interstitial and waits until the user closes (X) the ad before resolving */
export async function showInterstitialIfReady(): Promise<boolean> {
  if (!shouldShowInterstitial() || !interstitialInstance) return false;
  const instance = interstitialInstance;
  try {
    setMusic(false);
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (shown: boolean) => {
        if (settled) return;
        settled = true;
        unsubClose();
        unsubError();
        if (shown) {
          lastInterstitialShownAt = Date.now();
        }
        resolve(shown);
      };

      const unsubClose = instance.addAdEventListener(AdEventType.CLOSED, () => {
        finish(true);
      });
      const unsubError = instance.addAdEventListener(AdEventType.ERROR, () => {
        finish(false);
      });

      instance.show().catch((error) => {
        console.warn('Could not show interstitial:', error);
        finish(false);
      });
    });
  } catch (error) {
    console.warn('Could not show interstitial:', error);
    return false;
  }
}

/** Rewarded is ready to show */
export function isRewardedReady(): boolean {
  return rewardedLoaded || isAdsRemoved;
}

/**
 * Shows Rewarded Ad, ensures game audio is stopped while the ad is open,
 * and only triggers `onEarned` (which resumes gameplay & audio) AFTER the user
 * closes (X) the ad and returns to the game screen.
 */
export async function showRewardedAd(onEarned: () => void): Promise<boolean> {
  // If ads are removed, player gets rewarded benefit instantly!
  if (isAdsRemoved) {
    onEarned();
    return true;
  }

  if (!rewardedInstance || !rewardedLoaded) {
    preloadRewarded();
    return false;
  }

  const instance = rewardedInstance;
  try {
    setMusic(false);
    return await new Promise<boolean>((resolve) => {
      let earned = false;
      let settled = false;

      const cleanup = () => {
        unsubEarned();
        unsubClose();
        unsubError();
      };

      const unsubEarned = instance.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          earned = true;
          lastInterstitialShownAt = Date.now(); // Reset interstitial timer so they aren't hit back-to-back
        },
      );

      const unsubClose = instance.addAdEventListener(AdEventType.CLOSED, () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (earned) {
          onEarned();
        }
        resolve(earned);
      });

      const unsubError = instance.addAdEventListener(AdEventType.ERROR, () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      });

      instance.show().catch((error) => {
        console.warn('Could not show rewarded ad:', error);
        if (!settled) {
          settled = true;
          cleanup();
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.warn('Could not show rewarded ad:', error);
    return false;
  }
}

export { BannerAd, BannerAdSize };
