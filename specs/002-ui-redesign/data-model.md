# Data Model: UI Modernization & Light/Dark Mode

This feature adds exactly one new piece of state. It is a device/UI preference, not florist business data, so it does not participate in the existing `orders` / `inventory` / `receipts` / `adjustments` domain model or its owner-field convention (Constitution Principle II is not applicable to it).

## ThemePreference

The user's chosen appearance mode, persisted locally.

| Field | Type | Notes |
|---|---|---|
| value | `'light' \| 'dark' \| 'system'` | `'system'` is the default for first launch (FR-004). Persisted as-is, not resolved, so a later OS change is reflected correctly on next read. |

**Storage**: AsyncStorage key `bloomstock:theme_preference`, raw JSON string of the value above. Read once at app launch (alongside `runMigrations()`), written whenever the user changes the in-app theme control.

**Validation rule**: On read, any value other than the three literals above (corrupt data, future-incompatible value) falls back to `'system'`, consistent with the defensive-read pattern already used by every other `lib/storage.ts` accessor.

**State transitions**:

```
(no stored value) --first launch--> 'system'
'system'   --user picks Light--> 'light'
'system'   --user picks Dark-->  'dark'
'light'    --user picks Dark-->  'dark'
'light'    --user picks System--> 'system'
'dark'     --user picks Light--> 'light'
'dark'     --user picks System--> 'system'
```

There is no transition triggered by the OS appearance changing — that only affects which *resolved* theme is displayed while preference is `'system'` (FR-007); it never rewrites the stored preference itself.

## ResolvedTheme (derived, not persisted)

Computed at runtime from `ThemePreference` + the live OS appearance signal; not stored.

| Field | Type | Notes |
|---|---|---|
| mode | `'light' \| 'dark'` | `preference === 'system' ? osScheme : preference` |
| tokens | `ThemeTokens` | The full color token object (see contracts/theme-contract.md) for `mode` |

This is exposed to components via `useTheme()` (returns `tokens`) and `useThemeMode()` / theme-control component (returns `{ preference, mode, setPreference }`).
