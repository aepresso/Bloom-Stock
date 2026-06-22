import type { ExpoConfig } from 'expo/config';

// BloomStock — single-user florist order management app (v1). Runs as a PWA
// (web, installable to the Home Screen on iPad/iPhone via Safari) plus native
// iOS/Android via plain Expo Go — no custom native modules or dev client.
// Uses app.config.ts (not app.json) so we can wire in the EXPO_PUBLIC Anthropic key.
const config: ExpoConfig = {
  name: 'BloomStock',
  slug: 'bloom-stock',
  version: '1.0.0',
  orientation: 'default', // iPhone + iPad, responsive (SPEC §3)
  icon: './assets/images/icon.png',
  scheme: 'bloomstock',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true, // iPad sidebar layout (SPEC §3)
    bundleIdentifier: 'com.aepresso.bloomstock',
    infoPlist: {
      // Justifications surfaced to the user at permission time.
      NSCameraUsageDescription:
        'BloomStock uses the camera to scan purchase receipts and capture order reference photos.',
      NSPhotoLibraryUsageDescription:
        'BloomStock lets you attach receipt images and order reference photos from your library.',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/icon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAFAF8',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Bundled at build time. Note: EXPO_PUBLIC_* is inlined into the JS bundle
    // and extractable from the IPA — acceptable only for this single-user,
    // personal-distribution app (SPEC §5.4 "API key"). Never ship this widely.
    anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  },
};

export default config;
