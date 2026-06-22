// App-facing OCR bridge over the native Vision module (modules/vision-ocr). Keeps
// call sites (the Stocking screen) decoupled from the native import and gives them a
// single typed entry point. OCR runs on-device and is captured regardless of whether
// the later Claude interpretation step succeeds (data-model.md StockingReceipt note).

import { isVisionOcrAvailable, recognizeText } from '@/modules/vision-ocr';

export { isVisionOcrAvailable };

/**
 * Run on-device OCR over the image at `uri`. Returns the raw recognized text
 * (possibly empty). Throws if the native module is unavailable or Vision fails —
 * callers treat that like any other receipt-pipeline failure and fall back to
 * manual entry, still showing whatever text was captured.
 */
export async function extractReceiptText(uri: string): Promise<string> {
  return recognizeText(uri);
}
