---
description: "Task list for BloomStock v1 implementation"
---

# Tasks: BloomStock v1

**Input**: Design documents from `/specs/001-app-overview/`
**Prerequisites**: plan.md, SPEC.md, research.md, data-model.md, contracts/claude-receipt-parsing.md, quickstart.md

**Tests**: Included only where the constitution mandates them (Principle IV/I: allocation and inventory-consumption logic must have test coverage). All other testing is manual per `quickstart.md`, consistent with the constitution's "manual testing of UI changes acceptable in v1."

**Organization**: Tasks are grouped by user story, derived from `SPEC.md`'s page-by-page behaviors (the spec is narrative, not pre-labeled with P1/P2/P3 — priorities below reflect dependency order: each story builds on the minimum needed from prior stories, and each is independently testable per its own checkpoint).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps task to its user story (US1–US8)
- File paths reference the structure in `plan.md`'s Project Structure section

---

## Phase 1: Setup (Shared Infrastructure)

> **✅ COMPLETE (2026-06-22).** All implementation phases (1–10) are done and the Phase 11
> polish is done except the two on-device validation tasks (T056/T057), which require a
> macOS + Xcode + EAS dev-client build and can't run from the Windows dev environment.
> Static gates are green: `tsc --noEmit` clean, `expo lint` clean, `jest` 18/18 passing.
> Feature runtime deps were installed via `npx expo install` and `eslint`/`eslint-config-expo`
> were added so `expo lint` runs.

- [X] T001 Initialize Expo (TypeScript, strict mode) project with Expo Router at repo root, matching the `app/` structure in `plan.md`
- [X] T002 [P] Install dependencies: `@react-native-async-storage/async-storage`, `expo-image-picker`, `@react-native-community/datetimepicker`, `expo-file-system`, `expo-dev-client` — installed via `npx expo install` at SDK-56 versions
- [X] T003 [P] Configure ESLint + Prettier + `tsconfig.json` strict mode per constitution Principle I
- [X] T004 Configure `expo-dev-client` + EAS Build development profile (`eas.json`, `app.config.ts`) — config written; `expo-dev-client` package now installed (T002 batch)
- [X] T005 [P] Configure Jest + `@testing-library/react-native` test runner — jest config in package.json, jest-expo + RNTL installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Define all shared TypeScript types (`Flower`, `Order`, `OrderFlower`, `InventoryItem`, `InventoryAdjustment`, `StockingReceipt`, `ParsedReceiptItem`, `DraftOrder` — each persisted type includes `ownerId: string`) in `types/index.ts` per `data-model.md`
- [X] T007 [P] Create hardcoded `Flower[]` list (Trader Joe's + job stock, per `SPEC.md` §4) in `data/flowers.ts`
- [X] T008 Implement AsyncStorage helpers (typed get/set/remove per key) and the `bloomstock:schema_version` migration runner in `lib/storage.ts` per `SPEC.md` §7
- [X] T009 [P] Implement design tokens (palette, typography from `SPEC.md` §8) in `lib/theme.ts`
- [X] T010 [P] Scaffold adaptive tab layout `app/(tabs)/_layout.tsx` — iPhone bottom tabs / iPad sidebar via `Platform.isPad`/`useWindowDimensions`
- [X] T011 [P] Scaffold `app/order/_layout.tsx` stack layout for the New Order wizard and Order Detail routes
- [X] T012 Create placeholder screens for all 5 tabs (`shopping-list.tsx`, `orders.tsx`, `stock.tsx`, `inventory.tsx`, `archive.tsx`) so navigation is testable before story implementation begins

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Build & Manage Orders (Priority: P1) 🎯 MVP

**Goal**: Create, view, edit, and cancel orders end to end.

**Independent Test**: From a clean install, create an order through the full 2-step wizard, see it on the Orders list (sorted by due date), edit a field via Order Detail, then cancel it — all without ever touching Stock/Inventory (fulfillment stays at 0%, which is expected and correct at this stage).

- [X] T013 [P] [US1] Implement `useOrders` hook (create/update/delete/list, AsyncStorage-backed via `lib/storage.ts`) in `hooks/useOrders.ts` — facade over the central `lib/store.tsx`
- [X] T014 [P] [US1] Build `FlowerPickerGrid` component — search bar + grid, tap-to-expand-in-place stepper with tap-to-type quantity entry, alphabetical sort for now (recency sort lands in US8) in `components/FlowerPickerGrid.tsx`
- [X] T015 [P] [US1] Build `OrderCard` component (customer/due date/delivery/payment, fulfillment progress bar, green "Fully Supplied" badge at 100%) in `components/OrderCard.tsx`
- [X] T016 [US1] Build New Order wizard Step 1 — Customer Info form, due-date picker with `minimumDate: today` in `app/order/new.tsx`
- [X] T017 [US1] Build New Order wizard Step 2 — Add Flowers via `FlowerPickerGrid`, slide-forward transition from Step 1, identical sequential layout on iPad (no split view) in `app/order/new.tsx` (depends on T014, T016)
- [X] T018 [US1] Implement persistent "Save Order" sticky footer + required-field validation (customer name, due date, delivery/pickup, payment status, ≥1 flower) across both wizard steps in `app/order/new.tsx` (depends on T017)
- [X] T019 [US1] Implement reference-photo capture/picker, copying into the document directory via `expo-file-system`, in `app/order/new.tsx` (via `components/forms.tsx` + `lib/images.ts`)
- [X] T020 [US1] Build Order Detail single combined edit screen (all fields + inline `FlowerPickerGrid` for add/remove) in `app/order/[id].tsx` (depends on T014)
- [X] T021 [US1] Build Orders list screen — sorted ascending by `dueDate`, renders `OrderCard` list, `[+]` → new order route in `app/(tabs)/orders.tsx` (depends on T013, T015)
- [X] T022 [US1] Implement "Cancel Order" action (confirm dialog, delete order record, delete `referencePhotoUri` file if present) via swipe on `OrderCard` and a button on Order Detail in `components/OrderCard.tsx` and `app/order/[id].tsx` (depends on T013, T019)

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 — Inventory Tracking via Receipts (Priority: P2)

**Goal**: Submit a purchase receipt (scan or upload), get it OCR'd + Claude-parsed (or fall back to manual entry on any failure), confirm it, and see Inventory update; manually adjust stock with an audited reason.

**Independent Test**: Submit a receipt end-to-end with Claude succeeding and confirm Inventory's `totalStock`/`lastPrice` update; force a Claude failure (airplane mode) and confirm the manual-entry fallback still lets her log the same purchase; use the pencil-icon manual adjust and confirm the `InventoryAdjustment` log records it. All independent of any orders existing.

- [X] T023 [P] [US2] Implement native Vision OCR module (Swift, `VNRecognizeTextRequest`) + Expo Config Plugin in `modules/vision-ocr/`
- [X] T024 [P] [US2] Implement `lib/ocr.ts` bridge wrapping the native module for JS call sites
- [X] T025 [P] [US2] Implement `lib/claude.ts` — prompt constant (per `contracts/claude-receipt-parsing.md`), fetch wrapper, response runtime validation, error classification (network / non-2xx / malformed completion)
- [X] T026 [P] [US2] Implement `useInventory` hook (CRUD for `InventoryItem` + `InventoryAdjustment`, AsyncStorage-backed) in `hooks/useInventory.ts`
- [X] T027 [P] [US2] Implement `useReceipts` hook (CRUD for `StockingReceipt`, AsyncStorage-backed) in `hooks/useReceipts.ts`
- [X] T028 [US2] Build `ReceiptConfirmSheet` component — parsed items list with raw text/matched flower/quantity/price+unit, edit and toggle-off controls in `components/ReceiptConfirmSheet.tsx` (depends on T026, T027)
- [X] T029 [US2] Build Stocking screen — Scan/Upload buttons (images only, no PDF), Recent Receipts list (read-only tap-through) in `app/(tabs)/stock.tsx` (depends on T024, T025, T028)
- [X] T030 [US2] Wire Scan/Upload → OCR → Claude → `ReceiptConfirmSheet` → Confirm → inventory-update pipeline in `app/(tabs)/stock.tsx` (depends on T029)
- [X] T031 [US2] Implement manual-entry fallback — on any Claude/network failure, show `FlowerPickerGrid`-based manual entry (price optional, defaults to `InventoryItem.lastPrice`/`lastPriceUnit`) in `app/(tabs)/stock.tsx` (depends on T014, T030)
- [X] T032 [P] [US2] Build `InventoryRow` component (on hand / spoken for / available, last price+unit+date, ⚠️ fully-allocated badge) in `components/InventoryRow.tsx`
- [X] T033 [US2] Build Inventory screen — rows sorted fully-allocated-first then alphabetical, manual-adjust (pencil icon) sheet with required reason field appending to the `InventoryAdjustment` log in `app/(tabs)/inventory.tsx` (depends on T026, T032)

**Checkpoint**: User Story 2 is fully functional and independently testable — receipts (auto + manual) and manual adjustments both correctly update Inventory with an audit trail.

---

## Phase 5: User Story 3 — Inventory Allocation & Fulfillment (Priority: P3)

**Goal**: Connect Orders and Inventory — run the allocation algorithm whenever supply or demand changes, so Orders show accurate fulfillment % and Inventory shows accurate `allocatedStock`.

**Independent Test**: Create two orders needing the same flower with different due dates, stock just enough for one; confirm the earlier-due order is fulfilled first and the later one shows partial fulfillment. Edit/delete an order and confirm reallocation re-runs correctly.

### Tests for User Story 3 ⚠️ (constitution-mandated)

- [X] T034 [P] [US3] Unit tests for the allocation algorithm — single order/flower, multiple orders competing for scarce stock, zero stock, exact-fit stock — in `__tests__/allocation.test.ts` (10 tests passing)

### Implementation for User Story 3

- [X] T035 [US3] Implement the allocation algorithm (earliest-due-first distribution per `SPEC.md` §6) in `lib/allocation.ts`
- [X] T036 [US3] Wire allocation recalc into `useOrders` (create/edit/delete) in `hooks/useOrders.ts` — recalc lives in `lib/store.tsx` `reconcile()`, run on every order mutation (depends on T013, T035)
- [X] T037 [US3] Wire allocation recalc into `useInventory` (receipt confirm, manual adjustment) in `hooks/useInventory.ts` — same `reconcile()` runs on every inventory mutation (depends on T026, T035)
- [X] T038 [US3] Display live fulfillment % progress bar and "Fully Supplied" badge on `OrderCard`, driven by recalculated `fulfilledQuantity` in `components/OrderCard.tsx` (depends on T035, T036)

**Checkpoint**: User Stories 1–3 together form the core orders/inventory loop, testable end-to-end.

---

## Phase 6: User Story 4 — Shopping List (Priority: P4)

**Goal**: Surface, at a glance, which flowers are short for active orders.

**Independent Test**: With an active order needing more of a flower than is in stock, confirm it appears on the Shopping List with the correct deficit and earliest due date; resolve the shortfall via a receipt and confirm it disappears.

- [X] T039 [P] [US4] Implement shopping-list deficit derivation (sum needed across active orders minus `totalStock`, per flower) in `lib/allocation.ts`
- [X] T040 [P] [US4] Build `ShoppingListRow` component (flower, deficit count, earliest order + due date) in `components/ShoppingListRow.tsx`
- [X] T041 [US4] Build Shopping List screen — flat list sorted by urgency, tap-through to Order Detail, empty state ("Nothing needed right now") in `app/(tabs)/shopping-list.tsx` (depends on T039, T040)

**Checkpoint**: Shopping List works as a derived view layered on US1–US3.

---

## Phase 7: User Story 5 — Order Delivery & Archive (Priority: P5)

**Goal**: Mark an order delivered (consuming inventory, with a warning if under-supplied) and view completed orders in Archive.

**Independent Test**: Mark a fully-supplied order delivered, confirm `totalStock`/`allocatedStock` both drop by `fulfilledQuantity` and the order appears in Archive read-only; mark an under-supplied order delivered and confirm the warning dialog appears first.

### Tests for User Story 5 ⚠️ (constitution-mandated)

- [X] T042 [P] [US5] Unit tests for archive-consumption logic — full supply, partial supply, multiple flowers per order — in `__tests__/archive-consumption.test.ts` (5 tests passing)

### Implementation for User Story 5

- [X] T043 [US5] Implement inventory consumption-on-archive (decrement `totalStock`/`allocatedStock` by `fulfilledQuantity`, then trigger reallocation, per `SPEC.md` §6) in `lib/allocation.ts` — `consumeForArchive`, run before reallocation in `lib/store.tsx` `archiveOrder`
- [X] T044 [US5] Implement "Mark Delivered" swipe action with below-100%-fulfillment warning dialog on `OrderCard`/Orders screen (depends on T038, T043)
- [X] T045 [US5] Build Archive screen — muted card palette, sorted by `archivedAt` descending, read-only Order Detail on tap in `app/(tabs)/archive.tsx` (depends on T020, T044)

**Checkpoint**: Full order lifecycle (create → fulfill → deliver/archive, or cancel) works end-to-end.

---

## Phase 8: User Story 6 — Cross-Page Search (Priority: P6)

**Goal**: Find an order by name, phone, or Instagram handle on either Orders or Archive.

**Independent Test**: Create an order with a known phone number and Instagram handle; search Orders by a phone substring and by a handle substring — both find it. Archive it and confirm the same searches work on Archive.

- [X] T046 [P] [US6] Implement shared substring/case-insensitive multi-field search helper (name/phone/Instagram) in `lib/search.ts`
- [X] T047 [US6] Wire search bar into Orders screen in `app/(tabs)/orders.tsx` (depends on T021, T046)
- [X] T048 [US6] Wire search bar into Archive screen in `app/(tabs)/archive.tsx` (depends on T045, T046)

**Checkpoint**: Search works consistently on both pages.

---

## Phase 9: User Story 7 — Wizard Resilience: Draft Autosave (Priority: P7)

**Goal**: Protect in-progress order creation from app interruption during a rush.

**Independent Test**: Start a new order, enter customer info plus a flower, force-quit the app, relaunch, reopen the wizard — confirm it offers to resume the exact entered state.

- [X] T049 [US7] Implement draft persistence — write to `bloomstock:draft_order` on every field change/flower pick, clear on save/discard — in `app/order/new.tsx` and `lib/storage.ts` (depends on T016, T017, T018)
- [X] T050 [US7] Implement resume-draft prompt on wizard mount when a draft exists in `app/order/new.tsx` (depends on T049)

**Checkpoint**: Wizard survives interruption without data loss.

---

## Phase 10: User Story 8 — Dynamic Flower-Picker Recency Sort (Priority: P8)

**Goal**: Surface recently-ordered flowers at the top of every flower-picker instance.

**Independent Test**: Place 10+ orders concentrated on a few flowers; open the picker in the wizard, in Order Detail editing, and in manual receipt entry — confirm all three show the same recency-ranked order with heavily-used flowers on top.

- [X] T051 [US8] Implement recency-rank derivation (occurrence count across the last 10 orders, any status, alphabetical tiebreak) in `lib/flowerRanking.ts`
- [X] T052 [US8] Wire recency-weighted sort into `FlowerPickerGrid` as the default order, with search still overriding it, in `components/FlowerPickerGrid.tsx` — `recencyOrder` prop supplied at all three call sites via `useRecencyOrder` (depends on T014, T051)

**Checkpoint**: All three flower-picker call sites (wizard, edit, manual receipt entry) share the same live recency ranking.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T053 [P] Apply design tokens (`lib/theme.ts`) consistently across all screens/components, including the signature flower-card background texture (texture approximated by `palette.flowerCard` tint until a texture asset is added to `assets/flowers/`)
- [X] T054 [P] Add a dry-run test for the `bloomstock:schema_version` migration scaffold in `lib/storage.ts` — `__tests__/storage-migration.test.ts` (uses the official AsyncStorage jest mock via `jest.setup.js`)
- [X] T055 [P] Add empty/error-state polish: Shopping List empty state ("Nothing needed right now"), receipt-OCR-failure messaging (manual-entry hint), Orders/Archive no-results search state
- [ ] T056 Run `quickstart.md` validation end-to-end on a physical device or simulator with the dev client — **DEFERRED**: requires macOS + Xcode + EAS dev-client build (native Vision OCR module); cannot run from the current Windows dev environment. All static gates pass: `tsc --noEmit`, `expo lint`, and `jest` (18 tests) are green.
- [ ] T057 Manual performance check: confirm list/sort/filter operations stay smooth at ~100+ orders and ~30 flowers — **DEFERRED**: requires running on-device (same constraint as T056). No scale concern expected — all list ops are in-memory array sort/filter over low-hundreds of records.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–10)**: All depend on Foundational completion. Built in priority order (P1→P8) since later stories integrate with earlier ones (US3 needs US1+US2's data; US4 needs US3; US5 needs US3; US6 needs US1+US5; US7 needs US1; US8 needs US1/US2), but each still has its own independent-test checkpoint that doesn't require *later* stories to exist.
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies beyond Foundational — the true MVP
- **US2 (P2)**: No dependencies on US1 (can be built/tested in parallel with US1, though both ship before US3 needs them)
- **US3 (P3)**: Requires US1 (orders to allocate against) and US2 (inventory to allocate from)
- **US4 (P4)**: Requires US3 (needs `fulfilledQuantity`/`totalStock` semantics already wired)
- **US5 (P5)**: Requires US3 (needs fulfillment % for the warning dialog and `fulfilledQuantity` for consumption math)
- **US6 (P6)**: Requires US1 (Orders screen) and US5 (Archive screen) to exist as integration points
- **US7 (P7)**: Requires US1 (wraps the wizard built there)
- **US8 (P8)**: Requires US1 (wizard) and US2 (manual receipt entry) as integration points for `FlowerPickerGrid`

### Within Each User Story

- Tests (where included) before the implementation they cover
- Hooks/data layer before screens that consume them
- Shared components (`FlowerPickerGrid`, `OrderCard`) before the screens that compose them
- Story complete and checkpoint-verified before starting the next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- US1 and US2 can be built in parallel by different people (neither depends on the other) — both must finish before US3 starts
- Within each story, hook/component tasks marked [P] (different files) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Once Foundational is done, these can run together:
Task: "Implement useOrders hook in hooks/useOrders.ts"
Task: "Build FlowerPickerGrid component in components/FlowerPickerGrid.tsx"
Task: "Build OrderCard component in components/OrderCard.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Implement native Vision OCR module in modules/vision-ocr/"
Task: "Implement lib/claude.ts request/response handling"
Task: "Implement useInventory hook in hooks/useInventory.ts"
Task: "Implement useReceipts hook in hooks/useReceipts.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. Complete Phase 3 (US1 — Build & Manage Orders)
3. **STOP and VALIDATE**: run US1's independent test manually
4. This is a usable, demoable order-tracking tool even before inventory exists

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → validate → demo (MVP: order management)
3. US2 → validate → demo (inventory tracking, still disconnected from orders)
4. US3 → validate → demo (the two connect: real fulfillment tracking)
5. US4 → validate → demo (Shopping List)
6. US5 → validate → demo (full order lifecycle, Archive)
7. US6, US7, US8 → each validated and demoed independently — all are refinements on top of a fully working core (US1–US5)

### Suggested MVP Scope

**User Story 1 alone** — she can start managing orders immediately, even before the receipt-scanning/inventory side is built. US2 (inventory) is the next highest-value addition since it unlocks real fulfillment tracking (US3).

---

## Notes

- [P] tasks touch different files with no incomplete dependencies
- [Story] label maps every user-story-phase task to US1–US8 for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
- `modules/vision-ocr/` (US2) is the highest-risk/most-unfamiliar task in this plan (native Swift + Expo Config Plugin) — consider time-boxing a spike on T023 early if native-module experience is limited, since US3–US8 all assume inventory data is flowing correctly from US2
