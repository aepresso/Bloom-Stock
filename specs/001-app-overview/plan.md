# Implementation Plan: BloomStock v1

**Branch**: `001-app-overview` | **Date**: 2026-06-20 | **Spec**: [SPEC.md](./SPEC.md)
**Input**: Feature specification from `/specs/001-app-overview/SPEC.md`

## Summary

BloomStock is a single-user iOS app (iPhone + iPad) for a florist to build orders with exact flower quantities, track a global flower inventory updated by scanning purchase receipts (on-device OCR + Claude API interpretation), see at a glance what's fully stocked vs. still needed (Shopping List), and archive completed orders. v1 ships fully local (AsyncStorage, no backend, no auth), with data models designed for future multi-florist support and cross-device sync. Technical approach: Expo Router app with a native Vision-framework OCR module (requires custom dev client, not Expo Go), Context+useReducer state per domain, and a deterministic earliest-due-date-first inventory allocation algorithm that re-runs on every supply/demand-affecting mutation.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode (per consti/d schema migrations
**Testing**: Jest + `@testing-library/react-native`; prioritized on `lib/allocation.ts` and inventory consumption-on-archive logic
**Target Platform**: iOS 16+ (iPhone + iPad), no Android in v1
**Project Type**: Mobile app (single Expo project, no separate backend)
**Performance Goals**: No hard numeric targets — single-user, low-volume data (dozens of active orders, ~30 flowers); responsiveness bar is "feels instant on-device," not a measured SLA
**Constraints**: Must work fully offline except the one Claude API call (receipt interpretation), which has an explicit manual-entry fallback on any failure (network, API error, or exhausted credit) so the app is never blocked; requires `expo-dev-client`/EAS Build, not compatible with plain Expo Go (native Vision module)
**Scale/Scope**: 1 user, ~30 hardcoded flowers, 6 top-level pages, low-hundreds of orders/receipts over the app's lifetime — no scale concerns beyond keeping in-memory array operations (sort/filter) fast at that size, which they trivially are

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

| Principle | Status | Notes |
|---|---|---|
| I. Type Safety First | ✅ PASS | All entities in `data-model.md` are fully typed; runtime boundary validation (Claude API response parsing, AsyncStorage deserialization) called out explicitly in research.md §5 and the contract below. |
| II. Multi-User Ready | ⚠️ GAP → RESOLVED in Phase 1 | `SPEC.md`'s literal types omit a user/owner field. `data-model.md` adds `ownerId: string` (constant `"default-user"` in v1) to every persisted collection, satisfying the principle without changing v1 behavior. No further violation. |
| III. Responsive Design by Default | ✅ PASS | Spec already specifies iPad sidebar vs. iPhone tabs, and explicitly resolved (during planning interview) that the New Order wizard stays single-step-at-a-time on iPad rather than introducing a second split-view interaction model — satisfies "screen-specific logic only for true platform differences." |
| IV. Local-First Storage with Audit Trail | ✅ PASS | AsyncStorage is sole v1 store; `InventoryAdjustment` log (audit trail) and `bloomstock:schema_version` migration key are both already in `data-model.md`/`SPEC.md` §7. |
| V. API Contract Clarity | ✅ PASS | See `contracts/claude-receipt-parsing.md` — explicit request/response shape, and error-path distinction (network vs. non-2xx vs. malformed completion) per research.md §5. |

**Result**: No unresolved violations. The one gap (multi-user `ownerId`) is closed by an additive field in Phase 1, not a deferred risk — no entry needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-app-overview/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── claude-receipt-parsing.md
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

**Structure Decision**: Single Expo project (Option 1 shape, mobile-flavored) — no separate backend exists in v1, so the "frontend/backend split" and "mobile + API" options are both inapplicable. This matches the structure already committed to in `SPEC.md` §9, reproduced here as the authoritative layout for implementation:

```text
bloom-stock/
├── app/                              # Expo Router file-based routes
│   ├── (tabs)/
│   │   ├── shopping-list.tsx         # 5.1
│   │   ├── orders.tsx                # 5.2
│   │   ├── stock.tsx                 # 5.4
│   │   ├── inventory.tsx             # 5.5
│   │   └── archive.tsx               # 5.6
│   └── order/
│       ├── new.tsx                   # 5.3 — 2-step wizard (customer info → add flowers)
│       └── [id].tsx                  # 5.3 — single combined edit screen
├── components/
│   ├── FlowerPickerGrid.tsx          # shared expand-in-place picker (wizard, edit, manual receipt entry)
│   ├── OrderCard.tsx
│   ├── InventoryRow.tsx
│   ├── ReceiptConfirmSheet.tsx
│   └── ShoppingListRow.tsx
├── data/
│   └── flowers.ts                    # hardcoded Flower[] list
├── hooks/
│   ├── useOrders.ts
│   ├── useInventory.ts
│   └── useReceipts.ts
├── lib/
│   ├── storage.ts                    # AsyncStorage helpers + migration runner
│   ├── allocation.ts                 # inventory allocation algorithm (§6) + consumption-on-archive
│   ├── claude.ts                     # Claude API client, prompt constant, error classification
│   └── ocr.ts                        # native Vision module bridge
├── modules/
│   └── vision-ocr/                   # Expo Config Plugin + native Swift module (VNRecognizeTextRequest)
├── types/
│   └── index.ts                      # all shared TypeScript types (data-model.md)
├── assets/
│   └── flowers/                      # flower reference images
├── __tests__/
│   ├── allocation.test.ts
│   └── archive-consumption.test.ts
└── specs/
    └── 001-app-overview/             # this planning doc set
```

`modules/vision-ocr/` and `__tests__/` are additions beyond the original `SPEC.md` §9 listing — needed respectively for the native OCR module (research.md §1) and the test priorities (research.md §8, constitution Principle I/IV).

## Complexity Tracking

*No entries — no unresolved Constitution Check violations (see table above).*
