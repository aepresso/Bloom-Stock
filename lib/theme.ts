// Design tokens (SPEC.md §8). Single source of truth for palette + typography so
// screens/components never hardcode hex values. Applied consistently in T053.
//
// 002-ui-redesign: `palette` is replaced by `lightPalette`/`darkPalette` (same key
// set, see ThemeTokens) so every screen migrates from a static import to
// `useTheme()` (lib/theme-context.tsx) with a one-line rename. Dark values are
// hand-tuned, not mechanically inverted, so status colors keep proper contrast on
// dark surfaces (FR-009).

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeTokens = {
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

export const lightPalette: ThemeTokens = {
  background: '#FAFAF8', // warm off-white
  surface: '#FFFFFF',
  primary: '#2D6A4F', // deep botanical green
  accent: '#B5451B', // dried rose / terracotta — used sparingly
  success: '#52B788', // fulfilled / fully supplied
  warning: '#E9C46A', // partial stock
  danger: '#E63946', // overdue, missing stock
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  // Derived neutrals used for borders/tracks (not in the spec list, kept consistent here).
  border: '#E7E5E0',
  progressTrack: '#ECEAE4',
  // Signature flower-card surface (SPEC §8). A faint warm botanical tint standing in
  // for the pressed-botanical texture until the texture asset lands in assets/flowers/.
  flowerCard: '#FBFAF6',
};

export const darkPalette: ThemeTokens = {
  background: '#11150F', // deep botanical near-black, warm green undertone
  surface: '#1A2017',
  primary: '#6FCF97', // brightened so it still reads as the brand green on dark
  accent: '#E0875A',
  success: '#52B788',
  warning: '#E9C46A',
  danger: '#F2667A',
  textPrimary: '#F2F0EC',
  textSecondary: '#A6A89E',
  border: '#2E362A',
  progressTrack: '#232B1F',
  flowerCard: '#1E2419',
};

export const typography = {
  // Display: Playfair Display (order names, page headers).
  // Body: Inter (all UI text). Custom font loading is a polish task; until the
  // fonts are bundled these family names fall back to the system font gracefully.
  display: 'Playfair Display',
  body: 'Inter',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
} as const;

export const fontSize = {
  caption: 12,
  body: 15,
  subtitle: 17,
  title: 22,
  header: 28,
} as const;

/**
 * Shared "refined botanical" card elevation (002-ui-redesign): a soft shadow on
 * light backgrounds, and a subtle 1px border instead on dark backgrounds — RN
 * shadows read as a muddy halo on dark surfaces, so dark mode leans on contrast
 * with `theme.border` rather than a shadow.
 */
export function cardElevation(theme: ThemeTokens) {
  return theme === lightPalette
    ? {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }
    : {
        borderWidth: StyleSheetHairline,
        borderColor: theme.border,
      };
}

// RN's StyleSheet.hairlineWidth isn't importable here without pulling in
// react-native (theme.ts stays RN-free for easy testing); 1 is an acceptable
// approximation for this border-only dark-mode fallback.
const StyleSheetHairline = 1;
