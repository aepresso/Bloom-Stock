# Quickstart: UI Modernization & Light/Dark Mode

## Verifying the theme system once implemented

1. `npm run ios` (or `npm run web`) to launch the app.
2. **System default**: With the device/browser set to light mode and no prior choice made, confirm the app opens light. Switch the OS to dark mode (iOS: Settings → Display & Brightness, or web: OS-level dark mode) while the app is in the foreground — the app should flip to dark within ~1s without restarting (FR-007).
3. **Manual override**: Use the in-app theme control (in the tab/sidebar chrome) to pick Dark explicitly. Then change the OS back to light — the app should *stay* dark (FR-008), proving the manual choice takes precedence over System.
4. **Persistence**: Force-quit and relaunch the app. It should reopen in the same Dark mode chosen in step 3 (FR-006/SC-004), not reset to System.
5. **Full-app coverage**: With Dark active, visit every tab (Shopping List, Orders, Stock, Inventory, Archive), open New Order, open an existing order's detail, run a manual receipt entry, and open the Inventory adjustment sheet. Confirm every screen/modal is fully dark-themed — no leftover white backgrounds or unreadable text (SC-001, SC-003).
6. **Status colors**: On the Inventory tab in Dark mode, confirm a fully-allocated flower's warning badge and the stock usage bar's success/warning fill colors are still clearly distinguishable from the surrounding surface (FR-009).
7. Repeat steps 5–6 in Light mode to confirm no regressions there either.
8. Run `npm run typecheck` and `npm run lint` — both must pass with zero errors after the `palette` → `useTheme()` migration.

## Manual smoke test for "no functional regression" (US1)

For each of: New Order save, Order edit/cancel, Stock scan→confirm, Stock manual entry, Inventory adjustment — perform the action once in Light and once in Dark, confirming the underlying behavior (data saved, navigation, validation messages) is identical to pre-redesign behavior. This is the acceptance bar for FR-010.
