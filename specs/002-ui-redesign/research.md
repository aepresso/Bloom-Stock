# Research: UI Modernization & Light/Dark Mode

## 1. Theme state source & override mechanism

**Decision**: Use React Native's `Appearance` API (`Appearance.getColorScheme()` + `Appearance.addChangeListener`) as the System-mode source, combined with React Native's `Appearance.setColorScheme()` (available in RN 0.85, the project's installed version) to force a manual Light/Dark override at the native level, wrapped in a small `ThemeProvider`/`useTheme()` context for the JS-side palette lookup.

**Rationale**: `Appearance.setColorScheme()` (RN ≥0.71) lets a manual in-app choice also flip the OS-reported scheme for that app process, which keeps native chrome (keyboard appearance, OS-level dark-mode-aware components) in sync with the in-app choice — not just the JS-rendered colors. Calling `useColorScheme()` elsewhere in the tree then "just works" without each component needing to know about the override. This avoids hand-rolling a redundant native bridge.

**Alternatives considered**:
- *Pure JS context, ignore `Appearance.setColorScheme`*: simpler, but native bits (keyboard, system UI) would stay tied to whatever the OS is actually set to, causing a visible mismatch when the user manually overrides. Rejected.
- *Third-party theming lib (e.g. `react-native-paper`, `tamagui`)*: pulls in a component system and design language that conflicts with the Constitution's "Third-party UI libs require team consensus" and would mean restyling against a foreign component API instead of the existing hand-rolled components. Rejected for this feature.

## 2. Persisting the user's manual choice

**Decision**: Store `'light' | 'dark' | 'system'` under a new AsyncStorage key `bloomstock:theme_preference`, read once at launch (alongside the existing `runMigrations()` call in `app/_layout.tsx`) before first paint, using the same defensive `getItem`/`setItem` helpers already in `lib/storage.ts`.

**Rationale**: Matches the existing Local-First Storage constitution principle and avoids inventing a second persistence path. Reading it at the same launch gate as `runMigrations()` means the correct theme is known before the app's first frame, preventing a light→dark flash.

**Alternatives considered**: `expo-secure-store` (overkill — not sensitive data), a dedicated `ThemeStorage` module separate from `lib/storage.ts` (rejected — fragments the single persistence pattern the codebase already has).

## 3. Native chrome sync (status bar, root background, splash)

**Decision**: Drive `<StatusBar style={mode === 'dark' ? 'light' : 'dark'} />` (from `expo-status-bar`, already a dependency) from the resolved theme, and set the root view background via `expo-system-ui`'s `setBackgroundColorAsync` (already a dependency) whenever the theme resolves/changes, so there's no white/light flash behind modals or during navigation transitions in dark mode.

**Rationale**: Both packages are already installed; this is additive configuration, not a new dependency.

**Alternatives considered**: Leaving `<StatusBar style="dark">` hardcoded (current state) — rejected, it's the literal bug being fixed; dark mode would otherwise render a dark page with a dark (invisible) status bar.

## 4. `app.config.ts` `userInterfaceStyle`

**Decision**: Change `userInterfaceStyle: 'light'` → `'automatic'`.

**Rationale**: `'light'` currently forces the native layer to report/behave as light always, which would fight the `Appearance` API's ability to report the true OS scheme and partially defeat `setColorScheme()`'s override behavior. `'automatic'` lets native-level dark mode (e.g. system alerts, keyboard) follow whichever scheme is actually active, light or dark, manual or system.

**Alternatives considered**: Leaving as `'light'` and only theming JS-rendered views — rejected because it would leave native-level UI (e.g. the iOS keyboard) stuck in light mode regardless of the in-app theme, an inconsistent experience the spec's "across all screens" intent rules out.

## 5. Color token structure (light vs. dark palettes)

**Decision**: Replace the single exported `palette` object in `lib/theme.ts` with `lightPalette` and `darkPalette` objects sharing the same keys (`background`, `surface`, `primary`, `accent`, `success`, `warning`, `danger`, `textPrimary`, `textSecondary`, `border`, `progressTrack`, `flowerCard`), tuned per-theme rather than mechanically inverted, so semantic colors (success/warning/danger) keep adequate contrast on dark surfaces (FR-009) instead of becoming muddy when naively inverted. `spacing`, `radius`, `fontSize`, `typography` stay theme-independent and unchanged.

**Rationale**: Keeping the same key names means every call site that currently does `palette.primary` becomes `theme.primary` with a one-line mechanical edit (swap the import for `useTheme()`), keeping the migration low-risk across ~17 files.

**Alternatives considered**: A single palette with CSS-custom-property-style "semantic role" tokens resolved at the StyleSheet layer — more flexible long-term, but a bigger structural change than this feature's scope (visual refresh + theming, not a token-architecture rewrite) justifies.

## 6. Applying it across ~17 existing call sites with minimal regression risk

**Decision**: Each file's `import { palette, ... } from '@/lib/theme'` becomes `import { useTheme } from '@/lib/theme-context'` (plus continuing to import the theme-independent `spacing`/`radius`/`fontSize`/`typography` directly from `lib/theme.ts`), and each component calls `const theme = useTheme();` then replaces `palette.x` references with `theme.x`. Because nearly all current styling is done inline via `StyleSheet.create` at module scope referencing `palette.x` directly, those `StyleSheet.create` calls move inside the component body (or into a small `useMemo(() => StyleSheet.create(...), [theme])`) so they re-evaluate per theme.

**Rationale**: This is the smallest mechanical change that achieves correctness; it doesn't require introducing styled-components or a CSS-in-JS runtime.

**Alternatives considered**: A `withTheme` HOC — no real benefit over a hook given the codebase is 100% function components already.
