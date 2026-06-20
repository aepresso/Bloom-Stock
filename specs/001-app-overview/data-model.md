# Data Model: BloomStock v1

Source of truth for field-level detail is `SPEC.md` section 4. This document adds: the constitution-mandated multi-user-ready field, validation rules pulled from spec page behaviors, state transitions, and derived (non-stored) values, so implementers don't have to cross-reference the narrative spec for every rule.

---

## Constitution compliance note

Constitution Principle II (Multi-User Ready) requires every collection to carry a user/owner field, even pre-multi-florist. Each persisted entity below adds:

```ts
ownerId: string; // v1: always a single constant, e.g. "default-user". Never read/branched on in v1 UI logic.
```

This is the only deviation from the literal types in `SPEC.md` §4 — additive, no behavior change, and unblocks v2 multi-florist work without a migration that touches every record's shape twice.

---

## Flower

```ts
type Flower = {
  id: string;              // stable slug, e.g. "rose-red"
  name: string;
  imageUri?: string;
  category?: string;       // informational only — not used for sorting/grouping (confirmed in spec)
};
```
- Hardcoded list, defined in `data/flowers.ts`, not persisted to AsyncStorage (no `ownerId` needed — it's static reference data, not a user-owned record).
- No in-app CRUD in v1.

## Order

```ts
type Order = {
  id: string;               // UUID — required for future sync merge-safety (spec §2)
  ownerId: string;
  customerName: string;           // required, non-empty
  instagramHandle?: string;       // stored without leading "@"; UI displays with "@" prefix
  phoneNumber?: string;           // digits only, no format enforcement beyond numeric input
  dueDate: string;          // ISO 8601 date; UI enforces >= today at creation/edit time
  deliveryType: 'delivery' | 'pickup';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  referencePhotoUri?: string;     // local file in document directory
  flowers: OrderFlower[];         // required, min length 1
  status: 'active' | 'fulfilled' | 'archived'; // 'fulfilled' reserved/unused in v1 — see below
  createdAt: string;
  archivedAt?: string;
};
```

**Validation rules** (from spec §5.3):
- `customerName`: required, non-empty.
- `dueDate`: required, must be >= today (date picker blocks past dates at input time; this is a UI constraint, not just a display rule — re-validate on save in case the device clock changes between picking and saving).
- `deliveryType`, `paymentStatus`: required, one of the enum values.
- `flowers`: required, at least 1 entry, each with `quantity >= 1`.

**State transitions**:
- `active → active` (edits) — any field change, including flower list, triggers an allocation recalc (§6).
- `active → archived`: only via "Mark Delivered" (spec §5.2). Triggers inventory consumption (§6) before the allocation recalc. Sets `archivedAt`.
- `active → (deleted)`: "Cancel Order" — not a status transition, the record is removed entirely. Releases `allocatedStock`, triggers reallocation, never touches `totalStock`, deletes `referencePhotoUri` file if present.
- `'fulfilled'` is never assigned by app logic in v1 — "Fully Supplied" (100% fulfillment) is a derived UI badge computed from `flowers[]`, not a stored status. The enum value is reserved for a possible v2 use.
- `archived` is terminal — no further transitions, no edits (spec §5.6).

## OrderFlower (embedded, not a top-level collection)

```ts
type OrderFlower = {
  flowerId: string;
  quantity: number;          // >= 1
  fulfilledQuantity: number; // 0 <= fulfilledQuantity <= quantity, recomputed by allocation pass
};
```

## InventoryItem

```ts
type InventoryItem = {
  flowerId: string;          // 1:1 with Flower.id — acts as primary key, no separate id field
  ownerId: string;
  totalStock: number;        // >= 0
  allocatedStock: number;    // >= 0, <= totalStock
  lastPrice?: number;
  lastPriceUnit?: 'stem' | 'bunch';
  lastReceiptDate?: string;
};
// availableStock = totalStock - allocatedStock — derived, never stored
```

**Invariant**: `allocatedStock <= totalStock` must hold after every mutation (receipt confirm, order create/edit/delete, manual adjustment, archive-consumption). The allocation algorithm (§6) is what re-derives `allocatedStock`; if a mutation could violate the invariant before the recalc runs (e.g. a manual adjustment reducing `totalStock` below current `allocatedStock`), the recalc immediately following it resolves it by recomputing `fulfilledQuantity`/`allocatedStock` from scratch — it never holds an invalid intermediate state past a single synchronous mutation+recalc unit.

## InventoryAdjustment

```ts
type InventoryAdjustment = {
  id: string;                // UUID
  ownerId: string;
  flowerId: string;
  delta: number;             // != 0; positive or negative
  reason: string;            // required, non-empty
  createdAt: string;
};
```
- Append-only log. No update/delete in v1 (audit trail integrity).

## StockingReceipt

```ts
type StockingReceipt = {
  id: string;                // UUID
  ownerId: string;
  submittedAt: string;
  imageUri: string;           // local file in document directory
  rawOcrText: string;
  parsedItems: ParsedReceiptItem[];
  confirmed: boolean;
};

type ParsedReceiptItem = {
  rawText: string;
  matchedFlowerId?: string;
  quantity: number;           // >= 1 once confirmed
  price?: number;
  priceUnit?: 'stem' | 'bunch';
  confirmed: boolean;         // toggled off = excluded from inventory update on Confirm
};
```
- Once `confirmed: true` at the receipt level, the receipt becomes read-only (spec §5.4 "Recent Receipts" — no re-edit path).
- Manual-entry fallback receipts (Claude API failure) still produce a `StockingReceipt` record — `rawOcrText` is still populated from on-device Vision OCR even when Claude's interpretation step fails; `parsedItems` are populated by the florist's manual picks instead of the API response.

## Draft order (transient, not a stored collection type)

```ts
type DraftOrder = Partial<Omit<Order, 'id' | 'ownerId' | 'createdAt' | 'status' | 'archivedAt'>> & {
  lastSavedAt: string;
};
```
- Stored under `bloomstock:draft_order` — at most one draft at a time (single wizard instance).
- Cleared (key removed) on explicit "Save Order" or explicit "Discard Draft."

---

## Derived/computed values (never persisted)

| Value | Formula | Used by |
|---|---|---|
| `availableStock` | `totalStock - allocatedStock` | Inventory page, allocation algorithm |
| Order fulfillment % | `sum(fulfilledQuantity) / sum(quantity)` across `flowers[]` | Orders page badge/progress bar, archive-warning dialog |
| Shopping List deficit | `sum(quantity across active orders' OrderFlower for a flowerId) - totalStock`, only shown if > 0 | Shopping List page |
| Flower-picker recency rank | occurrence count of `flowerId` across the last 10 `Order` records (any status, most-recently-created-first window), descending; ties broken alphabetically by `Flower.name` | `FlowerPickerGrid` (wizard, edit, manual receipt entry) |

---

## AsyncStorage key → type map

| Key | Type |
|---|---|
| `bloomstock:orders` | `Order[]` |
| `bloomstock:inventory` | `InventoryItem[]` |
| `bloomstock:receipts` | `StockingReceipt[]` |
| `bloomstock:adjustments` | `InventoryAdjustment[]` |
| `bloomstock:draft_order` | `DraftOrder \| undefined` |
| `bloomstock:schema_version` | `number` |
