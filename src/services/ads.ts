import { Platform } from 'react-native';
import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

/**
 * Official AdMob Test Ad Unit IDs.
 * Test IDs work safely out of the box during development builds.
 */
export const AD_UNITS = {
  BANNER: Platform.select({
    android: TestIds.BANNER,
    ios: TestIds.BANNER,
    default: TestIds.BANNER,
  }),
  INTERSTITIAL: Platform.select({
    android: TestIds.INTERSTITIAL,
    ios: TestIds.INTERSTITIAL,
    default: TestIds.INTERSTITIAL,
  }),
  REWARDED: Platform.select({
    android: TestIds.REWARDED,
    ios: TestIds.REWARDED,
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

// Ad Instances
let interstitialInstance: InterstitialAd | null = null;
let interstitialLoaded = false;
let rewardedInstance: RewardedAd | null = null;
let rewardedLoaded = false;

export function setAdsRemoved(removed: boolean) {
  isAdsRemoved = removed;
}

export function getAdsRemoved(): boolean {
  return isAdsRemoved;
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
      });

      rewardedInstance.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        // Handled in showRewarded callback
      });

      rewardedInstance.addAdEventListener(AdEventType.CLOSED, () => {
        rewardedLoaded = false;
        preloadRewarded();
      });

      rewardedInstance.addAdEventListener(AdEventType.ERROR, () => {
        rewardedLoaded = false;
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

/** Shows Interstitial with safe fallback */
export async function showInterstitialIfReady(): Promise<boolean> {
  if (!shouldShowInterstitial() || !interstitialInstance) return false;
  try {
    await interstitialInstance.show();
    lastInterstitialShownAt = Date.now();
    return true;
  } catch (error) {
    console.warn('Could not show interstitial:', error);
    return false;
  }
}

/** Rewarded is ready to show */
export function isRewardedReady(): boolean {
  return rewardedLoaded && !isAdsRemoved;
}

/** Shows Rewarded Ad with onEarned callback */
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

  try {
    const unsubscribeEarned = rewardedInstance.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        onEarned();
        lastInterstitialShownAt = Date.now(); // Reset interstitial timer so they aren't hit back-to-back
        unsubscribeEarned();
      },
    );

    await rewardedInstance.show();
    return true;
  } catch (error) {
    console.warn('Could not show rewarded ad:', error);
    return false;
  }
}

export { BannerAd, BannerAdSize };
