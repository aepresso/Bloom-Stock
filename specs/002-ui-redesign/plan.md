# Implementation Plan: UI Modernization & Light/Dark Mode

**Branch**: `002-ui-redesign` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ui-redesign/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Restyle every existing screen with a modernized "refined botanical" visual language (softer elevation, bigger rounded corners, clearer type hierarchy, more breathing room) and introduce a Light/Dark/System theme system. Technically this means replacing the static `palette` import from `lib/theme.ts` with a React Context (`ThemeProvider` + `useTheme()`) that exposes a light or dark token set chosen by OS appearance (`Appearance`/`useColorScheme`) or a persisted manual override, and updating all ~17 screens/components that currently import `palette` directly to consume it through the new hook instead.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict mode), React 19.2, React Native 0.85 via Expo SDK 56
**Primary Dependencies**: `expo-router` 56 (navigation), `react-native-reanimated` 4 (already present, usable for theme-switch transitions), `@react-native-async-storage/async-storage` 2.2 (persistence), `expo-system-ui` 56 (native root background/status bar sync), `expo-status-bar` (status bar style)
**Storage**: AsyncStorage — one new key (`bloomstock:theme_preference`), following the existing `lib/storage.ts` typed-store pattern
**Testing**: Jest + `@testing-library/react-native` (existing setup); manual verification acceptable for pure visual changes per Constitution Testing Standards
**Target Platform**: iOS (primary, iPhone + iPad) + web (PWA), per existing app.config.ts; Android untested but not excluded
**Project Type**: Mobile app (Expo Router, single `app/` tree) — Option 1/single-project structure, no separate backend
**Performance Goals**: Theme switch (manual or system-triggered) visually completes in <1s (SC-005); no added jank on existing list-heavy screens (Inventory, Orders)
**Constraints**: Must not change any business logic, data shapes, navigation structure, or existing AsyncStorage keys; must preserve the iPhone-bottom-tab / iPad-sidebar responsive breakpoint as-is; must keep `lib/theme.ts`'s existing `spacing`, `radius`, `fontSize`, `typography` tokens as the base (extended, not replaced) so non-color styling stays centralized
**Scale/Scope**: ~17 files currently import `palette` directly (5 tab screens, `order/new.tsx`, `order/[id].tsx`, `_layout.tsx` files, and 6 shared components) plus the root `app/_layout.tsx`; all are in scope for the palette→theme-hook migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Type Safety First** — Theme tokens, preference values, and the context shape are all explicit TypeScript types (`ThemeMode`, `ThemeTokens`); AsyncStorage read for the preference goes through the existing defensive `getItem` helper. ✅ PASS
- **II. Multi-User Ready** — Theme preference is a device/app-level UI setting, not florist business data (orders/inventory/receipts), so the "every collection needs an owner field" rule doesn't apply here. ✅ PASS (not applicable)
- **III. Responsive Design by Default** — Plan explicitly preserves the existing iPhone/iPad breakpoint structure and requires both layouts to be restyled and themed identically in substance. ✅ PASS
- **IV. Local-First Storage with Audit Trail** — New `bloomstock:theme_preference` AsyncStorage key follows the existing typed-store + schema-version pattern in `lib/storage.ts`. It's additive (a new key with a safe fallback), so no migration entry is required, consistent with how `draftOrder` was added. ✅ PASS
- **V. API Contract Clarity** — Not applicable; this feature touches no Claude API / receipt-parsing code. ✅ PASS (not applicable)

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
│   └── theme-contract.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
app/
├── _layout.tsx                 # Root: wrap in ThemeProvider, dynamic <StatusBar style>
├── (tabs)/
│   ├── _layout.tsx              # Sidebar/tab chrome restyle + inline theme control
│   ├── shopping-list.tsx        # Restyle, palette → useTheme()
│   ├── orders.tsx                # Restyle, palette → useTheme()
│   ├── stock.tsx                  # Restyle, palette → useTheme()
│   ├── inventory.tsx               # Restyle, palette → useTheme()
│   └── archive.tsx                  # Restyle, palette → useTheme()
└── order/
    ├── new.tsx                       # Restyle, palette → useTheme()
    └── [id].tsx                       # Restyle, palette → useTheme()

components/
├── FlowerPickerGrid.tsx   ├── forms.tsx            ├── InventoryRow.tsx
├── OrderCard.tsx          ├── ReceiptConfirmSheet.tsx  ├── SearchBar.tsx
└── ShoppingListRow.tsx    # All: restyle + palette → useTheme()

lib/
├── theme.ts                # Extended: light/dark token sets replace the single `palette` export
├── theme-context.tsx        # NEW: ThemeProvider, useTheme(), useThemeMode()
└── storage.ts                # Add themePreferenceStore (get/set), new STORAGE_KEYS entry

app.config.ts               # userInterfaceStyle: 'light' → 'automatic'
```

**Structure Decision**: Single Expo Router mobile-app project (existing structure unchanged). The only new file is `lib/theme-context.tsx`; everything else is a restyle/migration of files that already exist. No new top-level directories.

## Complexity Tracking

*No violations — table omitted.*
