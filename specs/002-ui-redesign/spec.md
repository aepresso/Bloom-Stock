# Feature Specification: UI Modernization & Light/Dark Mode

**Feature Branch**: `002-ui-redesign`
**Created**: 2026-06-22
**Status**: Implemented
**Input**: User description: "Revamp the BloomStock app UI to be modern instead of plain/ugly, and add support for both dark mode and light mode (user-toggleable, following system theme by default) across all screens."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A modernized look across every screen (Priority: P1)

As the shop owner, when I open BloomStock, every screen (Shopping List, Orders, Stock, Inventory, Archive, New/Edit Order, receipt scanning & manual entry, inventory adjustment) should feel current and polished — clear visual hierarchy, comfortable spacing, and a cohesive style — instead of the current plain, flat appearance, without losing any existing information or functionality.

**Why this priority**: This is the core ask — the app is functional but the user has explicitly flagged it as "ugly and plain." Visual quality affects daily usability and how comfortable the owner feels using it in front of customers.

**Independent Test**: Can be fully tested by navigating through every existing screen and confirming each one reflects the refreshed visual style (typography, spacing, color, elevation) while every existing action (add order, scan receipt, adjust inventory, etc.) still works exactly as before.

**Acceptance Scenarios**:

1. **Given** the app is freshly opened, **When** the owner views any of the five main tabs, **Then** each screen displays the modernized visual style (updated spacing, typography, card/elevation treatment) with no functional regressions.
2. **Given** an existing flow (e.g. New Order, Stock receipt scan/manual entry, Inventory adjustment), **When** the owner completes that flow, **Then** all prior functionality (validation, navigation, data persistence) behaves identically to before the visual refresh.

---

### User Story 2 - Choosing Light or Dark mode (Priority: P2)

As the shop owner, I want to switch between a light and a dark appearance so the app is comfortable to use in different lighting conditions (e.g., a bright shop floor vs. a dim back room at night), with the app matching my device's system appearance by default until I choose otherwise.

**Why this priority**: Directly requested by the user; depends on User Story 1's visual system existing first (light/dark are two faces of the same modernized design), so it's the next most critical layer.

**Independent Test**: Can be fully tested by toggling the theme control between Light, Dark, and System, and confirming the entire app's appearance updates accordingly without restarting the app.

**Acceptance Scenarios**:

1. **Given** the owner has never set a preference, **When** they open the app, **Then** it displays in Light or Dark mode matching the device's current OS-level appearance setting.
2. **Given** the owner is viewing any screen, **When** they use the theme control to select Light or Dark, **Then** the entire app (all screens, modals, and sheets) immediately switches to and remains in that mode, including readable, correctly-contrasted text, icons, and status colors (warning/danger/success).
3. **Given** the owner has manually selected Light or Dark, **When** the device's OS appearance setting changes, **Then** the app stays on the owner's manually chosen mode (it does not override their explicit choice).
4. **Given** the owner has selected "System" (or never overridden it), **When** the device's OS appearance setting changes while the app is open, **Then** the app's appearance updates to match within a second.

---

### User Story 3 - Theme choice is remembered (Priority: P3)

As the shop owner, once I've set my preferred appearance, I don't want to have to set it again every time I reopen the app.

**Why this priority**: A smaller polish item that makes Story 2 feel complete, but the app is still usable session-to-session without it (it would just default back to System each launch).

**Independent Test**: Can be fully tested by setting a theme, fully closing the app, reopening it, and confirming the same theme is still active.

**Acceptance Scenarios**:

1. **Given** the owner has manually chosen Light, Dark, or System, **When** they close and reopen the app (including after a device restart), **Then** the app launches in that same chosen mode.

---

### Edge Cases

- What happens to status/semantic colors (success, warning, danger badges on Inventory) in dark mode? They must remain visually distinct and readable against dark surfaces, not just inverted.
- What happens on the iPad sidebar layout vs. the iPhone bottom-tab layout — does the theme control and the modernized style apply consistently to both? Yes, both must be restyled and themed identically in substance (layout differs only by existing responsive breakpoint).
- What happens to in-progress modals/sheets (receipt confirm, manual entry, inventory adjust, order forms) when the theme is changed mid-use? They must reflect the new theme immediately, same as the rest of the app.
- What happens to photos already captured/uploaded (receipt images, order reference photos)? Images themselves are unaffected by theme; only surrounding UI chrome changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a refreshed visual style — covering color palette, spacing, typography hierarchy, corner rounding, and elevation/shadow treatment — applied consistently across every existing screen, modal, and sheet (Shopping List, Orders, Stock, Inventory, Archive, New/Edit Order, receipt scan/upload/manual-entry flow, inventory adjustment sheet, and the tab/sidebar navigation chrome).
- **FR-002**: The refreshed visual style MUST preserve the existing botanical/green brand identity rather than replacing it with an unrelated aesthetic.
- **FR-003**: System MUST support two color themes — Light and Dark — both styled to the same modernized design language.
- **FR-004**: System MUST default a first-time user to whichever of Light/Dark matches the device's current OS-level appearance setting.
- **FR-005**: System MUST provide a manual theme control, reachable from anywhere in the app without navigating to a dedicated settings screen, offering at least Light, Dark, and System (follow device) options.
- **FR-006**: System MUST persist the owner's manual theme choice so it survives app restarts and device reboots.
- **FR-007**: When set to "System," the app's appearance MUST update automatically and immediately if the device's OS-level appearance setting changes while the app is open or resumed.
- **FR-008**: When the owner has manually selected Light or Dark (not System), the app MUST NOT automatically change appearance due to OS-level changes until the owner changes the setting themselves.
- **FR-009**: All existing semantic/status indicators (e.g. fully-allocated warning badge, success/partial/danger states) MUST remain clearly distinguishable and readable in both themes.
- **FR-010**: The visual refresh MUST NOT remove, hide, or alter the behavior of any existing feature or data field currently shown on any screen.
- **FR-011**: Theme switching MUST apply to all currently open modals/sheets immediately, without requiring the owner to close and reopen them.

### Key Entities

- **Theme Preference**: The owner's chosen appearance mode — one of Light, Dark, or System (follow device). Persists across app sessions. Has no relation to any other business data (orders, inventory, receipts).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every existing screen and modal in the app visually reflects the modernized style with no plain/unstyled remnants of the old look.
- **SC-002**: The owner can change between Light, Dark, and System modes in two taps or fewer from any screen.
- **SC-003**: 100% of text, icons, and status indicators remain clearly readable (sufficient contrast against their background) in both Light and Dark mode.
- **SC-004**: A manually chosen theme is still active in 100% of cases after fully closing and reopening the app.
- **SC-005**: When in System mode, the app's displayed theme matches the device's OS appearance setting within 1 second of it changing.
- **SC-006**: No existing functionality (every flow that worked before the redesign) regresses — verified by exercising each flow after the restyle.

## Assumptions

- The manual theme control will live as an inline, always-reachable control within the app's persistent navigation chrome (e.g. the iPad sidebar and the iPhone tab area) rather than on a new dedicated Settings screen, per product decision.
- "Modern, refined botanical" means evolving the current deep-green/cream palette with improved spacing, softer elevation, and clearer type hierarchy — not discarding the existing brand colors.
- Only Light and Dark are required; no additional custom/branded theme variants are in scope for this feature.
- This feature is visual/presentation-layer only — no changes to data models, business logic, or the allocation/receipt-parsing behavior are in scope.
- Existing responsive breakpoints (iPhone bottom tab bar vs. iPad sidebar) remain the layout structure; this feature restyles within that structure rather than redesigning navigation.
