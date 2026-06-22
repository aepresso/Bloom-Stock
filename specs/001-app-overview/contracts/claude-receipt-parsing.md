# Contract: Receipt Interpretation (Claude API)

The only external interface this app exposes/consumes (no backend, no public API of its own). Defined here so `lib/claude.ts` has one authoritative request/response shape to implement against and test.

## Request

`POST https://api.anthropic.com/v1/messages`

```ts
type ClaudeReceiptRequest = {
  model: 'claude-sonnet-4-6';
  max_tokens: number;        // sized to known-flower-list length + expected line count; no fixed ceiling needed at v1 scale
  messages: [{
    role: 'user';
    content: string;         // the prompt below, with [inject flower list here] and [inject raw text here] filled in
  }];
};
```

**Prompt template** (from `SPEC.md` §5.4, verbatim — stored as a constant in `lib/claude.ts`, not inlined ad hoc):

```
You are parsing a grocery/flower shop receipt.
Given the raw OCR text below, identify all flower items and their quantities (stem count or bunch count).
Extract the price for each item exactly as printed, along with whether it's priced per stem or per bunch — do not convert between units.
Return ONLY a JSON array with no markdown, no preamble:
[{ "rawText": "...", "matchedFlowerName": "...", "quantity": 0, "price": 0.00, "priceUnit": "stem" }]
If you cannot match a line to a known flower, set matchedFlowerName to null.
If price is not visible on the receipt, set price and priceUnit to null.

Known flowers: [inject flower list here]

OCR Text:
[inject raw text here]
```

## Expected response payload (parsed out of Claude's text completion)

```ts
type ClaudeReceiptResponseItem = {
  rawText: string;
  matchedFlowerName: string | null;
  quantity: number;
  price: number | null;
  priceUnit: 'stem' | 'bunch' | null;
};

type ClaudeReceiptResponse = ClaudeReceiptResponseItem[];
```

**Runtime validation** (Constitution Principle I — no trusting external boundaries): before mapping into `ParsedReceiptItem[]`, `lib/claude.ts` MUST:
1. Confirm the completion text parses as JSON (catch `JSON.parse` failure → malformed-response error path, below).
2. Confirm the parsed value is an array.
3. For each item, validate `quantity` is a positive number, `priceUnit` is one of `'stem' | 'bunch' | null`, and `matchedFlowerName` (if non-null) is resolvable to a known `Flower.id` via exact name match (case-insensitive) — if not resolvable, treat as if Claude returned `null` for that field (falls through to her manual match on the confirmation screen).

## Error paths (all route to the manual-entry fallback — `SPEC.md` §5.4)

| Failure | Detection | Resulting behavior |
|---|---|---|
| Network failure (no connectivity, timeout) | `fetch` throws / rejects | Manual entry fallback, OCR text still shown for reference |
| Non-2xx API response (rate limit, auth, exhausted credit, server error) | HTTP status check | Manual entry fallback |
| Malformed/non-JSON completion | `JSON.parse` throws | Manual entry fallback |
| Schema-invalid item (fails runtime validation above) | per-item check | That single item is dropped to a null-match state (treated as unmatched), not a fallback for the *whole* receipt — other valid items in the same response still populate the confirmation screen |

Only a **whole-response** failure (network/non-2xx/non-JSON) triggers full manual entry; a partial/per-item validation failure degrades gracefully to "unmatched line" within the normal confirmation-screen flow, since that's already a supported state (`matchedFlowerId: undefined`).
