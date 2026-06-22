// Design tokens (SPEC.md §8). Single source of truth for palette + typography so
// screens/components never hardcode hex values. Applied consistently in T053.

export const palette = {
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
} as const;

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
} as const;

export const fontSize = {
  caption: 12,
  body: 15,
  subtitle: 17,
  title: 22,
  header: 28,
} as const;
