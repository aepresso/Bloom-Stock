// Claude receipt-interpretation client (contracts/claude-receipt-parsing.md). Direct
// on-device fetch to the Anthropic Messages API with the bundled key (research §5).
// Every failure mode — network, non-2xx, malformed completion — is classified and
// surfaced so the Stocking screen can route all three to manual entry (SPEC §5.4).
//
// Constitution Principle I/V: the API response is an untrusted boundary, so the
// completion is validated item-by-item before being mapped into ParsedReceiptItem[].

import Constants from 'expo-constants';

import { FLOWERS, resolveFlowerIdByName } from '@/data/flowers';
import type { ParsedReceiptItem, PriceUnit } from '@/types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

// Verbatim from contracts/claude-receipt-parsing.md (itself from SPEC §5.4).
export const RECEIPT_PROMPT_TEMPLATE = `You are parsing a grocery/flower shop receipt.
Given the raw OCR text below, identify all flower items and their quantities (stem count or bunch count).
Extract the price for each item exactly as printed, along with whether it's priced per stem or per bunch — do not convert between units.
Return ONLY a JSON array with no markdown, no preamble:
[{ "rawText": "...", "matchedFlowerName": "...", "quantity": 0, "price": 0.00, "priceUnit": "stem" }]
If you cannot match a line to a known flower, set matchedFlowerName to null.
If price is not visible on the receipt, set price and priceUnit to null.

Known flowers: [inject flower list here]

OCR Text:
[inject raw text here]`;

function buildPrompt(ocrText: string): string {
  const flowerList = FLOWERS.map((f) => f.name).join(', ');
  return RECEIPT_PROMPT_TEMPLATE.replace('[inject flower list here]', flowerList).replace(
    '[inject raw text here]',
    ocrText
  );
}

function apiKey(): string {
  // Set in app.config.ts from EXPO_PUBLIC_ANTHROPIC_API_KEY.
  return (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined) ?? '';
}

export type ClaudeErrorKind = 'network' | 'api' | 'malformed' | 'no-key';

export type ParseReceiptResult =
  | { ok: true; items: ParsedReceiptItem[] }
  | { ok: false; error: ClaudeErrorKind };

/** Pull the concatenated text out of an Anthropic Messages response body. */
function extractCompletionText(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  const text = content
    .filter(
      (b): b is { type: string; text: string } =>
        typeof b === 'object' && b !== null && (b as { type?: string }).type === 'text'
    )
    .map((b) => b.text)
    .join('');
  return text || null;
}

function isPriceUnit(v: unknown): v is PriceUnit {
  return v === 'stem' || v === 'bunch';
}

/**
 * Validate + map the parsed JSON array into ParsedReceiptItem[]. A schema-invalid
 * item degrades to an unmatched line (matchedFlowerId undefined) rather than failing
 * the whole receipt (contract error table, last row). Throws only when the top-level
 * value isn't a JSON array — that's the "malformed completion" whole-response path.
 */
function mapValidatedItems(parsed: unknown): ParsedReceiptItem[] {
  if (!Array.isArray(parsed)) throw new Error('not-an-array');
  const items: ParsedReceiptItem[] = [];
  for (const raw of parsed) {
    if (typeof raw !== 'object' || raw === null) continue;
    const o = raw as Record<string, unknown>;

    const quantity =
      typeof o.quantity === 'number' && o.quantity > 0 ? Math.floor(o.quantity) : 1;

    // Resolve the matched name to a known flower id; unresolved → unmatched line.
    const name = typeof o.matchedFlowerName === 'string' ? o.matchedFlowerName : null;
    const matchedFlowerId = name ? resolveFlowerIdByName(name) : undefined;

    const price = typeof o.price === 'number' ? o.price : undefined;
    const priceUnit = isPriceUnit(o.priceUnit) ? o.priceUnit : undefined;

    items.push({
      rawText: typeof o.rawText === 'string' ? o.rawText : '',
      matchedFlowerId,
      quantity,
      price,
      priceUnit,
      confirmed: true,
    });
  }
  return items;
}

/**
 * Interpret OCR text into receipt line items. Never throws — returns a discriminated
 * result so the caller can branch to the confirmation sheet (ok) or manual entry
 * (any error kind).
 */
export async function parseReceipt(ocrText: string): Promise<ParseReceiptResult> {
  const key = apiKey();
  if (!key) return { ok: false, error: 'no-key' };

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: buildPrompt(ocrText) }],
      }),
    });
  } catch {
    return { ok: false, error: 'network' };
  }

  if (!response.ok) return { ok: false, error: 'api' };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: 'malformed' };
  }

  const completion = extractCompletionText(body);
  if (completion == null) return { ok: false, error: 'malformed' };

  try {
    const parsed = JSON.parse(completion);
    return { ok: true, items: mapValidatedItems(parsed) };
  } catch {
    return { ok: false, error: 'malformed' };
  }
}
