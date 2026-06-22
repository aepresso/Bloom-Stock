# UI Contract: Theme System

This app has no network/API surface for this feature; the "contract" here is the internal interface every screen/component is restyled against — `lib/theme-context.tsx` — so all ~17 call sites migrate to the same shape.

## `ThemeTokens`

Same key set as today's `palette` (so call sites are a 1:1 rename), values differ per mode:

```ts
type ThemeTokens = {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  progressTrack: string;
  flowerCard: string;
};
```

`spacing`, `radius`, `fontSize`, `typography` are unchanged and remain theme-independent exports of `lib/theme.ts`.

## `useTheme()`

```ts
function useTheme(): ThemeTokens;
```

Returns the resolved token set for the currently active mode (light or dark). This is what every screen/component calls instead of importing `palette` directly. Must be called within a `<ThemeProvider>` (mounted once, at the root, in `app/_layout.tsx`); throws descriptively if not (matching the existing `useStore()` pattern in `lib/store.tsx`).

## `useThemeMode()`

```ts
type ThemeMode = 'light' | 'dark' | 'system';

function useThemeMode(): {
  preference: ThemeMode;       // what the user has chosen (or 'system' default)
  resolvedMode: 'light' | 'dark'; // what's actually being displayed right now
  setPreference: (mode: ThemeMode) => void; // persists + applies immediately
};
```

Used exactly once, by the new inline theme control in the navigation chrome (`app/(tabs)/_layout.tsx`). `setPreference` must:
1. Update in-memory state synchronously (so the UI repaints immediately — FR-008 immediacy).
2. Call `Appearance.setColorScheme(mode === 'system' ? null : mode)` so native chrome follows.
3. Persist the choice via the `themePreferenceStore` (`lib/storage.ts`).

## `<ThemeProvider>`

```ts
function ThemeProvider(props: { children: React.ReactNode }): JSX.Element;
```

Mounted once in `app/_layout.tsx`, inside `<SafeAreaProvider>` and outside `<StoreProvider>` (theme has no dependency on domain data, but several domain screens will need `useTheme()`). On mount:
1. Reads the persisted preference (default `'system'`) before first paint of any wrapped screen — same launch gate as `runMigrations()`, to avoid a flash of the wrong theme.
2. Subscribes to `Appearance.addChangeListener` for live System-mode updates (FR-007); unsubscribes on unmount.
3. Provides both `ThemeTokens` (via `useTheme`) and the mode-control API (via `useThemeMode`) through context.
