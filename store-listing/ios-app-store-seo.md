# iOS App Store SEO (ASO), Metadata & Review Playbook

This file contains copy-paste-ready metadata optimized for **Apple App Store Search (ASO)**, exact answers for **App Store Connect Privacy & Age Rating questionnaires**, and **App Review notes** to ensure first-pass approval.

---

## 1. App Store Connect SEO / ASO Metadata

Apple's search engine indexes three fields with strict character limits: **Name (30 chars)**, **Subtitle (30 chars)**, and **Keywords (100 chars)**.
- **Golden Rule of iOS ASO**: Never repeat words across your Name, Subtitle, and Keywords field—Apple automatically combines words across all three fields. Do not put spaces after commas in the Keywords field, and do not include the word `"app"`, `"game"`, or `"puzzle"` in Keywords if they are already in your Name/Subtitle/Category.

### App Name (28 / 30 characters)
```text
Prism Ring: Color Wheel Game
```
*(Home Screen Display Name `CFBundleDisplayName`: `Prism Ring`)*

### Subtitle (29 / 30 characters)
```text
Spin to Match & Reflex Puzzle
```

### Keywords (97 / 100 characters — no spaces after commas)
```text
kaleidoscope,arcade,tap,chroma,circle,hue,neon,reaction,brain,casual,offline,spinny,relaxing,fast
```

### Categories
- **Primary Category**: `Games`
  - **Subcategory 1**: `Puzzle`
  - **Subcategory 2**: `Casual` (or `Action`)

### URLs for App Store Connect (GitHub Pages)
- **Privacy Policy URL**: `https://brianoksoftware.github.io/kaleido/`
- **Support URL**: `https://brianoksoftware.github.io/kaleido/`
- **Marketing URL**: `https://brianoksoftware.github.io/kaleido/`
- **AdMob `app-ads.txt` URL**: `https://brianoksoftware.github.io/kaleido/app-ads.txt` *(Note: For AdMob `app-ads.txt` root-domain verification on GitHub Pages, you can also put `app-ads.txt` in a repo named `Brianoksoftware.github.io` so it resolves at `https://brianoksoftware.github.io/app-ads.txt`)*

### Promotional Text (166 / 170 characters)
*(Can be updated at any time in App Store Connect without submitting a new app build)*
```text
Spin the neon prism ring, match incoming sparks by color, and chain 3-of-a-kind Blooms! Test your reflexes across 6 vibrant hues in this glowing arcade color puzzle.
```

### Description (ASO-Formatted for Apple App Store — 1,685 / 4,000 characters)
*(Note: Apple rejects descriptions that mention "Android" or "Google Play". This copy is tailored specifically for iPhone & iPad.)*
```text
Spin the wheel. Match the hue. Chain the bloom!

Prism Ring is a fast, hypnotic color-wheel reflex puzzle built for quick sessions and high-score mastery. Rotate a glowing glass kaleidoscope ring to catch incoming sparks on matching colored petals before they shatter the glass.

EASY TO LEARN, THRILLING TO MASTER
• Tap Left or Right (or swipe) to rotate the prism ring with crisp haptic feedback.
• Match incoming sparks to the petal of the same color.
• Chain 3 catches of the same hue in a row to trigger a BLOOM—clearing matching sparks on screen for massive bonus points!
• Build an 8× combo streak to ignite FEVER MODE and double every point you score.

POWER SPARKS & ESCALATING RHYTHM
• Gold Rainbow Sparks: Wildcards that match any petal color and extend your active Bloom chain.
• White Prism Sparks: Slow down time so you can recover and line up the perfect spin.
• Rush Diamonds: Fast-moving sparks that award 2× score on catch.
• Dynamic Progression: Start cleanly with 3 hues in Dawn Tier and unlock up to 6 vibrant colors as you climb through Pulse, Prism, Bloom, Nova, and Zenith tiers!

DESIGNED FOR iPHONE & iPAD
• Silky-smooth 60fps / 120Hz ProMotion animations and custom glass-shatter physics.
• Tactile iOS Haptics and original synth-glass sound effects (with independent Sound and Haptics toggles).
• Instant launch, zero sign-ups, and automatic pause when backgrounded.
• High scores and best combos saved locally on your device.

How long can you keep the glass intact? Download Prism Ring and chase your Zenith score today!
```

### What's New in This Version (Release Notes for v1.0.0)
```text
Welcome to Prism Ring: Color Wheel Game!
• Rotate the prism ring and match incoming sparks across 6 escalating color tiers.
• Chain 3 matching hues to trigger screen-clearing Blooms and 2× Fever combos.
• Full support for iPhone and iPad with crisp iOS haptics and smooth performance.
```

---

## 2. App Store Connect Screenshots & Preview Guide

Apple only requires **two** screenshot sizes in App Store Connect (Media Manager automatically scales them down to all smaller iPhones and iPads):

1. **6.9" or 6.5" iPhone Display** (Required):
   - `1320 × 2868 px` (iPhone 16 Pro Max 6.9") **or** `1284 × 2778 px` / `1242 × 2688 px` (6.5" iPhone)
2. **13" iPad Pro Display** (Required because `supportsTablet: true`):
   - `2064 × 2752 px` **or** `2048 × 2732 px`

### Recommended 5-Screenshot Storyboard (High Conversion)
1. **Slide 1 (Hero Action)**: Active gameplay with 4–6 petals, sparks incoming, `"SPIN TO MATCH THE HUE"` headline.
2. **Slide 2 (Core Hook - Bloom)**: `"BLOOM +120"` banner bursting with particles, `"CHAIN 3 TO TRIGGER A BLOOM"` headline.
3. **Slide 3 (Fever Mode)**: `FEVER` aura glowing crimson with `12×` combo in the center, `"IGNITE 2× FEVER COMBOS"` headline.
4. **Slide 4 (Risk/Tension)**: 2 cracks visible in the glass wheel with a White Prism slow-time spark arriving, `"PROTECT THE GLASS RING"` headline.
5. **Slide 5 (Menu / Progression)**: Main menu crest & Best Score card, `"CLIMB FROM DAWN TO ZENITH TIER"` headline.

---

## 3. App Privacy ("Nutrition Labels") Answers in App Store Connect

Because the app uses **Google AdMob in Non-Personalized Mode** (`requestNonPersonalizedAdsOnly: true`) and **does NOT use App Tracking Transparency (ATT)**:

1. **Do you or your third-party partners collect data from this app?**
   - Select **Yes** (because Google AdMob SDK collects device/IP/interaction telemetry for ad serving and fraud prevention).
2. **Data Types to Select**:
   - **Location** -> **Coarse Location** (IP-based region used by AdMob)
     - Purpose: *Third-Party Advertising*, *Analytics*
     - Linked to user's identity? **No**
     - Used for tracking? **No**
   - **Identifiers** -> **Device ID**
     - Purpose: *Third-Party Advertising*, *Analytics*
     - Linked to user's identity? **No**
     - Used for tracking? **No**
   - **Usage Data** -> **Product Interaction** & **Advertising Data** (ad views/taps)
     - Purpose: *Third-Party Advertising*, *Analytics*
     - Linked to user's identity? **No**
     - Used for tracking? **No**
   - **Diagnostics** -> **Crash Data** & **Performance Data**
     - Purpose: *App Functionality*, *Analytics*
     - Linked to user's identity? **No**
     - Used for tracking? **No**

*(Important: Because `Used for tracking?` is **No** across all categories and `NSPrivacyTracking` is `false`, Apple will NOT require an `NSUserTrackingUsageDescription` ATT popup, avoiding Guideline 5.1.2 rejections.)*

---

## 4. Age Rating Questionnaire (Target: `4+`)

In App Store Connect > App Information > Age Rating, select **None / No** for every content category:
- Cartoon or Fantasy Violence: **None**
- Realistic Violence: **None**
- Prolonged Graphic or Sadistic Realistic Violence: **None**
- Profanity or Crude Humor: **None**
- Mature/Suggestive Themes: **None**
- Horror/Fear Themes: **None**
- Medical/Treatment Information: **None**
- Alcohol, Tobacco, or Drug Use or References: **None**
- Simulated Gambling: **None**
- Sexual Content or Nudity: **None**
- Unrestricted Web Access: **No**
- Gambling and Contests: **No**
- **Result**: **4+** (Broadest possible App Store audience and family eligibility).

---

## 5. App Review Notes (Copy-Paste into App Store Connect)

Paste the following into **App Review Information > Notes** when submitting:

```text
Thank you for reviewing Prism Ring: Color Wheel Game!

• No sign-in or account is required. Tap PLAY on the main menu to start immediately.
• How to Play: Tap the left/right spin buttons (or tap the left/right half of the stage, or swipe horizontally) to rotate the colored wheel so incoming sparks land on matching colored petals.
• Privacy Policy & Support: Accessible directly inside the app via the "PRIVACY & SUPPORT" button at the bottom of the main menu, as well as at the Support/Privacy URL provided in metadata.
• Advertising & Revive Button:
  - Ads are served via Google AdMob using non-personalized ad requests only (no cross-app tracking or ATT prompt) and restricted to family-safe G-rated content.
  - The first 2 runs are completely ad-free, and interstitials are capped to at most once every 3 completed runs (minimum 75s interval).
  - On the Game Over screen, the optional "REVIVE (AD)" button is dynamically shown only when a rewarded ad has successfully loaded from AdMob (so there are never unresponsive buttons when offline or when AdMob returns no fill).
```
