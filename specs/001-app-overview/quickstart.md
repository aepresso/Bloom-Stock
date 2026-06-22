# Quickstart: BloomStock v1

## Prerequisites

- Node.js + npm, Xcode (for iOS builds/simulator), an Apple ID for device builds
- EAS CLI (`npm i -g eas-cli`) — plain Expo Go **will not work** once the native Vision OCR module is added (research.md §1); development requires a custom dev client
- An Anthropic API key with available credit (research.md §5) — set as `EXPO_PUBLIC_ANTHROPIC_API_KEY` in a local `.env` (never committed)

## First run

```bash
npm install
eas build --profile development --platform ios   # first time only, to get a dev client onto the device/simulator
npx expo start --dev-client
```

## Verifying the core flows manually (no UI test framework in v1)

1. **Create an order**: Orders tab → `[+]` → fill Customer Info (Step 1) → Add Flowers (Step 2, confirm the picker cards expand in place and the recency-weighted sort puts recently-ordered flowers first) → Save Order. Confirm it appears on Orders, sorted by due date.
2. **Interrupt the wizard**: start a new order, enter a customer name, background the app (don't save), relaunch. Confirm the draft-resume prompt appears (`bloomstock:draft_order`).
3. **Submit a receipt**: Stock tab → Scan/Upload → confirm OCR text extraction happens, Claude's parsed items appear on the confirmation screen with price/unit, confirm → check Inventory tab reflects new `totalStock` and the order from step 1 advances toward "Fully Supplied" if it needed that flower.
4. **Force the manual-entry fallback**: temporarily break the API key (or airplane-mode the device) and repeat step 3 — confirm the picker-based manual entry appears instead of blocking the receipt.
5. **Mark delivered below 100%**: create an order, intentionally leave it under-supplied, swipe "Mark Delivered" — confirm the warning dialog appears, and after confirming, check Inventory's `totalStock`/`allocatedStock` dropped by exactly the order's `fulfilledQuantity` values (not the originally requested `quantity`).
6. **Cancel an order**: create an order, add flowers, cancel it — confirm `allocatedStock` releases (check Inventory), `totalStock` is untouched, and the order doesn't appear in Archive.
7. **Shopping List**: with at least one active order whose flower need exceeds `totalStock`, confirm it appears on the Shopping List tab with the correct deficit count and the earliest order's due date.
8. **Search**: on both Orders and Archive, search by a partial phone number and a partial Instagram handle (not just name) — confirm both match.

## Running tests

```bash
npm test                # Jest — prioritizes lib/allocation.ts and archive-consumption logic
```
