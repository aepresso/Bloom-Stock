// JS entry for the local Vision OCR native module. Resolved lazily so non-iOS
// targets (web, Jest) don't crash at import time — callers check availability or
// catch. The thin app-facing wrapper lives in lib/ocr.ts (T024).

import { requireNativeModule } from 'expo-modules-core';

type VisionOcrNativeModule = {
  recognizeText(uri: string): Promise<string>;
};

let nativeModule: VisionOcrNativeModule | null = null;
try {
  nativeModule = requireNativeModule<VisionOcrNativeModule>('VisionOcr');
} catch {
  // Native module not present (web / test / pre-build). lib/ocr.ts degrades.
  nativeModule = null;
}

export function isVisionOcrAvailable(): boolean {
  return nativeModule !== null;
}

export async function recognizeText(uri: string): Promise<string> {
  if (!nativeModule) {
    throw new Error('VisionOcr native module is unavailable on this platform');
  }
  return nativeModule.recognizeText(uri);
}
