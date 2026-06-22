---
description: "Task list for UI Modernization & Light/Dark Mode"
---

# Tasks: UI Modernization & Light/Dark Mode

**Input**: Design documents from `/specs/002-ui-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/theme-contract.md, quickstart.md

**Tests**: Not requested for this feature (Constitution: "manual testing of UI changes acceptable in v1"). Verification is via the manual scenarios in quickstart.md, referenced from each relevant task.

**Organization**: Tasks are grouped by user story (US1 visuals, US2 mode switching, US3 persistence) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define the new token types and palettes that everything else builds on. No behavior changes yet.

- [X] T001 Define `ThemeMode` (`'light' | 'dark' | 'system'`) and `ThemeTokens` types in `lib/theme.ts`, matching the key set in `specs/002-ui-redesign/contracts/theme-contract.md`
- [X] T002 [P] Replace the single `palette` export in `lib/theme.ts` with a `lightPalette: ThemeTokens` object carrying today's existing color values (no visual change yet — this is a rename/restructure)
- [X] T003 [P] Add a `darkPalette: ThemeTokens` object in `lib/theme.ts`, hand-tuned (not mechanically inverted) so `success`/`warning`/`danger`/`border`/`textSecondary` stay legible against dark `background`/`surface`/`flowerCard` values, per FR-009

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core theme plumbing that every screen and every later phase depends on.

**⚠️ CRITICAL**: No restyle work (US1) can begin until this phase is complete.

- [X] T004 Create `lib/theme-context.tsx`: `ThemeProvider` + `useTheme()` returning `lightPalette` (mode-switching logic deferred to US2 — for now it always resolves to light) (depends on T001-T003)
- [X] T005 Wrap the existing tree in `app/_layout.tsx` with `<ThemeProvider>` (inside `<SafeAreaProvider>`, outside `<StoreProvider>`), and replace its pre-migration loading screen's `palette` import with `useTheme()` (depends on T004)
- [X] T006 Update `app/_layout.tsx`'s `<StatusBar style="dark" />` to a placeholder derived from `useTheme()`/light-only for now (full dynamic light/dark resolution lands in US2) (depends on T005)

**Checkpoint**: `useTheme()` is callable from anywhere in the tree and returns real token values. US1 restyle work can now begin.

---

## Phase 3: User Story 1 - Modernized look across every screen (Priority: P1) 🎯 MVP

**Goal**: Every existing screen reflects the refined-botanical modern style (spacing, typography hierarchy, rounded corners, softer elevation) via `useTheme()`, with zero functional regression.

**Independent Test**: Navigate every tab and flow; confirm the modernized visual style renders everywhere and every existing action (add order, scan receipt, adjust inventory, etc.) still works exactly as before.

### Implementation for User Story 1

- [X] T007 [P] [US1] Restyle `app/(tabs)/_layout.tsx` sidebar/bottom-tab chrome: softer elevation, updated spacing/corners, `palette.x` → `useTheme().x`
- [X] T008 [P] [US1] Restyle `app/(tabs)/shopping-list.tsx` using `useTheme()`
- [X] T009 [P] [US1] Restyle `app/(tabs)/orders.tsx` using `useTheme()`
- [X] T010 [P] [US1] Restyle `app/(tabs)/stock.tsx` using `useTheme()`
- [X] T011 [P] [US1] Restyle `app/(tabs)/inventory.tsx` using `useTheme()`
- [X] T012 [P] [US1] Restyle `app/(tabs)/archive.tsx` using `useTheme()`
- [X] T013 [P] [US1] Restyle `app/order/_layout.tsx` using `useTheme()`
- [X] T014 [P] [US1] Restyle `app/order/new.tsx` using `useTheme()`
- [X] T015 [P] [US1] Restyle `app/order/[id].tsx` using `useTheme()`
- [X] T016 [P] [US1] Restyle `components/FlowerPickerGrid.tsx` using `useTheme()` (preserve the existing tap-target/expand-in-place fix)
- [X] T017 [P] [US1] Restyle `components/forms.tsx` using `useTheme()`
- [X] T018 [P] [US1] Restyle `components/InventoryRow.tsx` using `useTheme()`
- [X] T019 [P] [US1] Restyle `components/OrderCard.tsx` using `useTheme()`
- [X] T020 [P] [US1] Restyle `components/ReceiptConfirmSheet.tsx` using `useTheme()`
- [X] T021 [P] [US1] Restyle `components/SearchBar.tsx` using `useTheme()`
- [X] T022 [P] [US1] Restyle `components/ShoppingListRow.tsx` using `useTheme()`
- [X] T023 [US1] Manual regression pass per quickstart.md "Manual smoke test for no functional regression" — New Order save, Order edit/cancel, Stock scan→confirm, Stock manual entry, Inventory adjustment (depends on T007-T022; confirms FR-010)

**Checkpoint**: App is fully modernized and light-themed end-to-end with no regressions. **This is the MVP** — deployable on its own even if US2/US3 never ship.

---

## Phase 4: User Story 2 - Choosing Light or Dark mode (Priority: P2)

**Goal**: Real Light/Dark/System switching, defaulting to OS appearance, manual override reachable from anywhere, applied instantly app-wide.

**Independent Test**: Toggle the theme control between Light, Dark, and System; confirm the whole app updates immediately without restart, and that a manual choice isn't overridden by a later OS appearance change.

### Implementation for User Story 2

- [X] T024 [US2] Extend `lib/theme-context.tsx`'s `ThemeProvider`/`useTheme()` to resolve mode dynamically via `Appearance.getColorScheme()` + `Appearance.addChangeListener` (System mode) and `Appearance.setColorScheme()` (manual override), per research.md §1 (depends on T004)
- [X] T025 [US2] Implement `useThemeMode()` in `lib/theme-context.tsx` returning `{ preference, resolvedMode, setPreference }` per `specs/002-ui-redesign/contracts/theme-contract.md` (depends on T024)
- [X] T026 [US2] Change `userInterfaceStyle` from `'light'` to `'automatic'` in `app.config.ts`, per research.md §4
- [X] T027 [US2] Wire `app/_layout.tsx`'s `<StatusBar style>` to `resolvedMode` from `useThemeMode()`, and call `expo-system-ui`'s `setBackgroundColorAsync` whenever the resolved theme changes (depends on T025)
- [X] T028 [US2] Add an inline Light/Dark/System control to the nav chrome in `app/(tabs)/_layout.tsx` (sidebar footer on iPad, a reachable spot in the bottom tab area on iPhone), wired to `setPreference` (depends on T025, T007)
- [X] T029 [US2] Dark-mode QA pass across all files touched in T007-T022: verify status badges (success/warning/danger) and borders stay legible against `darkPalette`; fix any per-file contrast issues found (depends on T003, T023, T024)
- [X] T030 [US2] Manual verification per quickstart.md steps 2, 3, 5, 6, 7 (system default tracking, manual override persists over OS changes, full-app dark coverage, status colors, light-mode regression check) (depends on T026, T027, T028, T029)

**Checkpoint**: Light/Dark/System switching works correctly app-wide. (Surviving an app restart is US3's job, not required yet.)

---

## Phase 5: User Story 3 - Theme choice is remembered (Priority: P3)

**Goal**: The chosen theme preference survives app restarts and device reboots.

**Independent Test**: Set a theme, fully close and reopen the app, confirm the same theme is still active.

### Implementation for User Story 3

- [X] T031 [US3] Add a `themePreference` entry to `STORAGE_KEYS` and a typed `themePreferenceStore.get/set` (default `'system'`, defensive parse) in `lib/storage.ts`, following the existing pattern (e.g. `draftOrderStore`)
- [X] T032 [US3] In `app/_layout.tsx`, read `themePreferenceStore.get()` at the same launch gate as `runMigrations()` (before first paint) and seed `ThemeProvider`'s initial preference with it (depends on T031, T025)
- [X] T033 [US3] In `lib/theme-context.tsx`, call `themePreferenceStore.set(...)` from `useThemeMode().setPreference` every time the user changes their choice (depends on T031, T025)
- [X] T034 [US3] Manual verification per quickstart.md step 4 (force-quit/relaunch retains the chosen theme) (depends on T032, T033)

**Checkpoint**: All three user stories are independently functional — modernized visuals, working mode switch, and persistence.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T035 [P] Run `npm run typecheck` and `npm run lint`; fix any issues surfaced by the `palette` → `useTheme()` migration across all touched files
- [X] T036 [P] Run the full `specs/002-ui-redesign/quickstart.md` checklist end-to-end (iOS simulator/device + web) as a final sign-off
- [X] T037 Mark `specs/002-ui-redesign/checklists/requirements.md` and `spec.md` status as implemented once T001-T036 are verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational — delivers the MVP on its own
- **User Story 2 (Phase 4)**: Depends on Foundational; T028 also depends on US1's T007 (the nav chrome must already be restyled before adding the theme control to it); T029 depends on US1 being complete (it QAs the files US1 restyled)
- **User Story 3 (Phase 5)**: Depends on US2's `useThemeMode()` (T025) existing
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Parallel Opportunities

- T002 and T003 can run in parallel (different objects in the same file, but logically independent — or split into two quick sequential edits if preferred)
- All of T007-T022 (16 file restyles) can run in parallel — each touches a distinct file
- T035 and T036 can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational (T001-T006) completes, launch the restyle tasks together:
Task: "Restyle app/(tabs)/shopping-list.tsx using useTheme()"
Task: "Restyle app/(tabs)/orders.tsx using useTheme()"
Task: "Restyle app/(tabs)/stock.tsx using useTheme()"
Task: "Restyle app/(tabs)/inventory.tsx using useTheme()"
Task: "Restyle app/(tabs)/archive.tsx using useTheme()"
Task: "Restyle components/FlowerPickerGrid.tsx using useTheme()"
# ...and so on for the remaining files in T007-T022
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T006) — critical, blocks everything else
3. Complete Phase 3: User Story 1 (T007-T023)
4. **STOP and VALIDATE**: run the quickstart.md regression checklist
5. Ship the modernized, light-only app as an increment if desired

### Incremental Delivery

1. Setup + Foundational → theme plumbing exists
2. User Story 1 → modernized, light-only app → validate → ship (MVP)
3. User Story 2 → Light/Dark/System switching works → validate → ship
4. User Story 3 → preference persists across restarts → validate → ship
5. Polish (T035-T037) → final sign-off

---

## Notes

- [P] tasks touch different files with no inter-dependencies
- Commit after each phase checkpoint, not necessarily after every single task
- T029's dark-mode QA is the one place US2 reaches back into US1's files — expected, since dark tokens can't be visually verified until the screens exist to display them
- No test tasks were generated (feature spec doesn't request TDD); quickstart.md is the verification substitute throughout
