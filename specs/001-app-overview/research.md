# Research: BloomStock v1

**Date**: 2026-06-20
**Input**: `specs/001-app-overview/SPEC.md` (no open `NEEDS CLARIFICATION` markers remain — the spec was resolved through an extended interview before planning began). This document captures the technical decisions needed to implement what the spec already specifies functionally.

---

## 1. On-device OCR (Apple Vision framework)

**Decision**: Use a native module wrapping `VNRecognizeTextRequest` (Apple Vision framework), exposed to the Expo app via an Expo Config Plugin + a small Swift native module. Requires a custom development client (`expo-dev-client`/EAS Build) — **not** compatible with Expo Go, since Expo Go ships a fixed native binary with no custom native code.

**Rationale**: The spec (5.4) explicitly calls for Apple Vision, not a cross-platform OCR library, and the app is iOS-only (no Android requirement), so there's no portability cost to going native. Vision's on-device text recognition (`VNRecognizeTextRequest` with `.accurate` recognition level) needs no network call and has no per-use cost, unlike cloud OCR APIs.

**Alternatives considered**:
- `expo-camera` + a JS-only OCR library — no pure-JS OCR library matches Vision's on-device accuracy for receipt text.
- `react-native-vision-camera` frame processor with an OCR plugin — viable, but pulls in a heavier camera replacement when `expo-image-picker`/`expo-camera` already cover the simple "snap or pick a photo" requirement (5.4 doesn't need live frame processing, just a single still capture).
- Cloud OCR (Google Vision API, AWS Textract) — adds a second paid API dependency and a network requirement on top of the already-bundled Claude API call; rejected to keep the receipt flow as offline-resilient as possible (only the *interpretation* step, not OCR itself, requires network).

**Implication**: Project requires `expo-dev-client` and EAS Build (or local Xcode build) from day one — plain Expo Go will not run this app once the native module is added.

---

## 2. Navigation structure (Expo Router)

**Decision**: `expo-router` (file-based routing), matching the `app/` directory structure already laid out in spec section 9. Bottom tabs on iPhone via `(tabs)` group; iPad gets a sidebar via a separate layout using `expo-router`'s adaptive layout (conditionally rendering a drawer/sidebar navigator instead of the tab bar based on `useWindowDimensions`/`Platform.isPad`).

**Rationale**: File-based routing keeps the route structure self-documenting and matches the project structure already agreed in the spec. Expo Router supports adaptive/responsive layouts without a second separate navigation library.

**Alternatives considered**: React Navigation directly (lower-level, more boilerplate for the same result — Expo Router is built on top of it) — rejected since Expo Router gives the same capability with less wiring.

---

## 3. State management

**Decision**: React Context + `useReducer` per-domain (`OrdersContext`, `InventoryContext`, `ReceiptsContext`), each backed by an AsyncStorage-persisted reducer. No external state library.

**Rationale**: Constitution Principle (Technology Stack) mandates this. App scale (single user, a few hundred orders/flowers at most) doesn't need a heavier solution (Redux, Zustand, etc.).

---

## 4. Local persistence & schema versioning

**Decision**: `@react-native-async-storage/async-storage`, one JSON-serialized array per key (orders, inventory, receipts, adjustments, draft), plus a `bloomstock:schema_version` integer key. A `lib/storage.ts` migration runner checks the stored version against the current code version at app launch and runs migration functions sequentially (`v1→v2`, `v2→v3`, ...) before the app reads any domain data.

**Rationale**: Matches spec section 7 and Constitution Principle IV (Local-First Storage with Audit Trail) directly. Sequential numbered migrations are the simplest reversible pattern for a single-device, single-writer datastore.

**Alternatives considered**: SQLite (via `expo-sqlite`) — more powerful querying, but overkill for collections in the hundreds of records with no relational query needs beyond simple filters/sorts already doable in-memory over a parsed JSON array.

---

## 5. Claude API integration & key handling

**Decision**: A thin `lib/claude.ts` wrapper does a direct `fetch` to the Anthropic Messages API (`model: claude-sonnet-4-6`) from the device, with the API key read from an Expo public env var (`EXPO_PUBLIC_ANTHROPIC_API_KEY` baked in at build time via `app.config.ts`). Errors are caught and distinguished (network failure vs. non-2xx API response vs. malformed/non-JSON completion) per Constitution Principle V, with all three routing to the manual-entry fallback (spec 5.4).

**Rationale**: Matches the spec's explicit "bundled key, accept the risk for v1, personal/internal distribution" decision. `EXPO_PUBLIC_*` env vars are the standard Expo mechanism for build-time constants, with the documented caveat that anything prefixed `EXPO_PUBLIC_` is inlined into the JS bundle and extractable by anyone with the IPA — acceptable per the spec's explicit risk acceptance, not appropriate if this app is ever distributed beyond one personal device.

**Alternatives considered**: A backend proxy holding the key server-side — explicitly rejected in the spec discussion as out of scope for v1.

---

## 6. Local image storage & cleanup

**Decision**: Use `expo-file-system` to copy captured/picked images (reference photos, receipt scans) into the app's persistent document directory (`FileSystem.documentDirectory + 'images/'`), storing only the resulting local URI string in AsyncStorage records. On order cancellation (spec 5.2) or discarding a stale autosaved draft (spec 5.3), the corresponding image file is deleted via `FileSystem.deleteAsync`.

**Rationale**: Picker/camera APIs return cache-directory URIs that the OS can evict; copying into the document directory ensures photos referenced by saved orders/receipts persist reliably across app restarts and OS cache clears.

---

## 7. Date picker, image/camera pickers

**Decision**: `@react-native-community/datetimepicker` for the Due Date field (with `minimumDate: new Date()` enforcing the "today or later" rule from spec 5.3); `expo-image-picker` for both camera capture and photo-library selection (covers Scan Receipt, Upload File, and Reference Photo — one library, three uses).

**Rationale**: Both are the standard, actively-maintained Expo-compatible choices; using one image library for all three "pick or take a photo" needs avoids redundant native dependencies.

---

## 8. Testing approach

**Decision**: Jest + `@testing-library/react-native` for component/hook tests (per constitution). Priority test coverage: the allocation algorithm (`lib/allocation.ts`) and inventory consumption-on-archive logic (section 6 of the spec) — these are the parts of the app where a silent bug would corrupt real inventory numbers. UI flows are manually verified for v1 (no E2E framework), consistent with the constitution's "manual testing of UI changes acceptable in v1."

---

## Summary of resolved unknowns

| Area | Resolution |
|---|---|
| OCR | Native Vision framework module + custom dev client (not Expo Go) |
| Navigation | Expo Router, adaptive tabs↔sidebar |
| State | Context + useReducer, per-domain |
| Storage | AsyncStorage + numbered migrations |
| Claude API | Direct on-device fetch, bundled `EXPO_PUBLIC_` key, fallback on any failure |
| Images | expo-file-system document directory, deleted on cancel/discard |
| Pickers | @react-native-community/datetimepicker, expo-image-picker |
| Testing | Jest + RNTL, prioritized on allocation/consumption logic |

No remaining `NEEDS CLARIFICATION` markers.
