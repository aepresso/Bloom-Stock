// Theme system (002-ui-redesign, contracts/theme-contract.md). Resolves a light or
// dark ThemeTokens set from either the device's OS appearance ("system") or an
// explicit user override, and exposes both via context so every screen/component
// reads colors through `useTheme()` instead of importing a static palette.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { darkPalette, lightPalette, type ThemeMode, type ThemeTokens } from '@/lib/theme';
import { themePreferenceStore } from '@/lib/storage';

type ResolvedMode = 'light' | 'dark';

type ThemeContextValue = {
  tokens: ThemeTokens;
  preference: ThemeMode;
  resolvedMode: ResolvedMode;
  setPreference: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(preference: ThemeMode, osScheme: ResolvedMode): ResolvedMode {
  return preference === 'system' ? osScheme : preference;
}

/**
 * react-native-web's Appearance shim doesn't implement setColorScheme (there's no
 * native chrome to sync on web anyway), so guard the call rather than crash there.
 */
function applyNativeColorScheme(mode: ThemeMode) {
  if (typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read at module-eval time for the very first paint (avoids a light→dark flash);
  // the loaded persisted preference (if any) replaces this once available below.
  const [osScheme, setOsScheme] = useState<ResolvedMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  );
  const [preference, setPreferenceState] = useState<ThemeMode>('system');

  // Live-update while in "system" mode (FR-007). A manual preference is unaffected
  // since `resolve()` only consults `osScheme` when preference === 'system'.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setOsScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  // Load the persisted preference once at launch and seed both local state and the
  // native Appearance override so OS-level chrome (keyboard, etc.) matches it too.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await themePreferenceStore.get();
      if (!active) return;
      setPreferenceState(stored);
      applyNativeColorScheme(stored);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setPreference = (mode: ThemeMode) => {
    setPreferenceState(mode);
    applyNativeColorScheme(mode);
    void themePreferenceStore.set(mode);
  };

  const resolvedMode = resolve(preference, osScheme);
  const tokens = resolvedMode === 'dark' ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({ tokens, preference, resolvedMode, setPreference }),
    [tokens, preference, resolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The resolved color tokens for the currently active theme. */
export function useTheme(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx.tokens;
}

/** The theme mode control: what's chosen, what's displayed, and how to change it. */
export function useThemeMode(): {
  preference: ThemeMode;
  resolvedMode: ResolvedMode;
  setPreference: (mode: ThemeMode) => void;
} {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within <ThemeProvider>');
  const { preference, resolvedMode, setPreference } = ctx;
  return { preference, resolvedMode, setPreference };
}
