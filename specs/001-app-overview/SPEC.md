# BloomStock — App Spec
**Version:** 1.0  
**Date:** 2026-06-20  
**Stack:** React Native · Expo · TypeScript  
**Platform:** iOS (iPhone + iPad), responsive layout for both  
**Repo:** `aepresso/bloom-stock`

---

## 1. Purpose

BloomStock is a florist order management app built for a single florist managing rush periods. It lets her:

- Build orders with exact flower quantities and customer details
- Track a global flower inventory updated by scanning purchase receipts
- Know at a glance which orders are fully stocked and which still need flowers
- Archive completed orders for reference

---

## 2. User

**Primary:** One florist (single user, no auth required for v1)  
**Future:** Multi-florist expansion planned — design data models with this in mind (e.g. no hardcoded user state at the top level). Also planned: cross-device sync (create an order on iPad, see it on iPhone) — v1 stays local-only (AsyncStorage, no backend), but this means v1 data models should use globally-unique IDs (e.g. UUIDs, not array indices) so a future sync layer can merge records without collisions.

---

## 3. Navigation Structure

Bottom tab bar with 5 tabs. iPad uses a sidebar navigation instead of a bottom tab bar.

```
┌─────────────────────────────────────────────────────┐
│  [Shopping List] [Orders] [Stock] [Inventory] [Archive] │
└─────────────────────────────────────────────────────┘
```

| Tab | Icon | Description |
|---|---|---|
| Shopping List | 🛒 | Flowers needed for active orders that aren't in stock yet |
| Orders | 📋 | All active orders sorted by due date |
| Stock | 🧾 | Submit receipts to update inventory |
| Inventory | 📦 | Current global stock levels |
| Archive | 🗂 | Completed / delivered orders |

---

## 4. Data Models

### Flower
```ts
type Flower = {
  id: string;
  name: string;           // e.g. "Alstroemeria"
  imageUri?: string;      // local asset or remote URL
  category?: string;      // e.g. "Trader Joe's", "Work Stock", "Etc" — informational only, not used for sorting/grouping anywhere in v1
};
```

**Flower List (hardcoded v1):**

Trader Joe's:
- Alstroemeria, Baby's Breath, Carnation, Chrysanthemum, Dahlia, Eucalyptus (stems), Freesia, Gerbera Daisy, Iris, Lavender (stems), Lisianthus, Lily (Asiatic), Lily (Oriental), Orchid (Phalaenopsis), Peony, Ranunculus, Rose (Red), Rose (Pink), Rose (White), Rose (Yellow), Snapdragon, Statice, Stock (Matthiola), Sunflower, Sweet Pea, Tulip, Wax Flower

Her job stock (to be confirmed and expanded later):
- Protea, Anthurium, Bird of Paradise, Heliconia, Calla Lily, Hydrangea

> **Note:** Flower list is hardcoded for v1. No in-app add/edit UI yet. Expansions come via app update. This list is shared by the order flower-picker (5.3), the Shopping List (5.1), and the manual receipt entry fallback (5.4) — there is no longer a standalone browsing page for it.

### OrderFlower
```ts
type OrderFlower = {
  flowerId: string;
  quantity: number;       // exact stem count required
  fulfilledQuantity: number; // stems currently allocated from inventory
};
```

### Order
```ts
type Order = {
  id: string;
  customerName: string;
  instagramHandle?: string;
  phoneNumber?: string;
  dueDate: string;        // ISO 8601 date string
  deliveryType: 'delivery' | 'pickup';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  referencePhotoUri?: string;
  flowers: OrderFlower[];
  status: 'active' | 'fulfilled' | 'archived';
  createdAt: string;
  archivedAt?: string;
};
```

### InventoryItem
```ts
type InventoryItem = {
  flowerId: string;
  totalStock: number;     // total stems on hand
  allocatedStock: number; // stems spoken for by active orders
  lastPrice?: number;     // price from most recent receipt, in lastPriceUnit
  lastPriceUnit?: 'stem' | 'bunch'; // unit lastPrice is denominated in, as printed on the receipt
  lastReceiptDate?: string; // date of receipt containing this price
  // availableStock = totalStock - allocatedStock (derived, not stored)
};
```

### InventoryAdjustment
```ts
type InventoryAdjustment = {
  id: string;
  flowerId: string;
  delta: number;           // positive or negative stem count change
  reason: string;
  createdAt: string;
};
```

### StockingReceipt
```ts
type StockingReceipt = {
  id: string;
  submittedAt: string;
  imageUri: string;
  rawOcrText: string;     // Vision framework output
  parsedItems: ParsedReceiptItem[];
  confirmed: boolean;
};

type ParsedReceiptItem = {
  rawText: string;        // e.g. "ALSTRM 12ST $5.99"
  matchedFlowerId?: string;
  quantity: number;
  price?: number;         // price extracted from receipt line, in priceUnit
  priceUnit?: 'stem' | 'bunch'; // unit as printed on the receipt line, no normalization
  confirmed: boolean;     // user confirmed this line item
};
```

---

## 5. Pages

---

### 5.1 Shopping List Page

**Purpose:** At-a-glance view of what still needs to be bought for active orders.

**Layout:**
```
┌─────────────────────────────────┐
│ Shopping List                   │
├─────────────────────────────────┤
│ Rose (Red)            need 8    │
│ for Jane Doe · Due Jun 23       │
├─────────────────────────────────┤
│ Sunflower              need 5   │
│ for Sarah K. · Due Jun 25        │
└─────────────────────────────────┘
```

**Behavior:**
- Purely reactive/derived — no separate data is stored for this page. A flower appears if `sum(quantity needed across active orders) > inventory[flower].totalStock`. The deficit shown is `needed - totalStock`.
- No par levels or "low stock" thresholds in v1 — she buys only what's needed for booked orders, never holds buffer stock.
- Flat list, sorted by urgency: soonest due date among the active orders contributing to that flower's shortfall. Category (Trader Joe's vs. Work Stock) is not used for grouping or sorting.
- Each row names the earliest order driving the need (for context); tapping a row opens that Order Detail screen.
- Empty state: "Nothing needed right now" when no active order has a shortfall.

---

### 5.2 Orders Page

**Purpose:** View and manage all active orders, sorted by urgency.

**Layout:**
```
┌──────────────────────────────┐
│ Orders                    [+]│  ← new order button
│ 🔍 Search...                 │  ← name, phone, or Instagram handle
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 🟢 FULLY SUPPLIED        │ │  ← green highlight when 100%
│ │ Jane Doe · Due Jun 23    │ │
│ │ Delivery · 💰 Paid       │ │
│ │ ████████████ 100%        │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Sarah K. · Due Jun 25    │ │
│ │ Pickup · 💰 Unpaid       │ │
│ │ ████████░░░░ 67%         │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**Behavior:**
- Search bar filters by Customer Name, Phone Number, or Instagram Handle — substring match, case-insensitive (same matching as Archive's search, since she doesn't always know/remember a customer's name)
- Sorted ascending by `dueDate` (soonest first)
- Fulfillment % = `sum(fulfilledQuantity) / sum(quantity)` across all flowers in the order
- At 100%: card highlights green, badge reads **"Fully Supplied"**. This is a derived UI badge only — `Order.status` stays `'active'` and does **not** auto-transition to `'fulfilled'`. (The `'fulfilled'` status value is reserved but unused in v1.)
- Tap card → Order Detail screen
- Swipe left → **"Mark Delivered"** action:
  - If fulfillment is below 100%, shows a confirmation dialog ("This order is only 67% supplied — mark delivered anyway?") before proceeding. No hard block — she can confirm through it.
  - On confirm: order moves to Archive, and inventory is consumed (see section 6 — archiving decrements `totalStock`/`allocatedStock` by the order's `fulfilledQuantity` per flower)
- Swipe right (or a "Cancel Order" button on Order Detail) → **"Cancel Order"** action: deletes the order outright (with a confirm dialog, since this is permanent and canceled orders don't appear in Archive). Releases `allocatedStock` back to the pool (triggers reallocation) but never touches `totalStock` — no bouquet was made, so nothing was consumed. Also deletes the order's local `referencePhotoUri` file, if any, since the record is gone for good.
- `[+]` button → New Order wizard (5.3)

---

### 5.3 New Order Wizard (creation) & Order Detail (edit)

Creating an order and editing one use **different screens**, since they're different tasks: creation is incremental build-up, editing is a quick targeted fix.

**Fields (shared by both):**
| Field | Type | Required |
|---|---|---|
| Customer Name | Text input | ✅ |
| Instagram Handle | Text input (@ prefix) | ❌ |
| Phone Number | Text input (numeric) | ❌ |
| Due Date | Date picker (today or later only — past dates blocked) | ✅ |
| Delivery / Pickup | Toggle | ✅ |
| Payment Status | Segmented control: Unpaid / Partial / Paid | ✅ |
| Special Notes | Multiline text | ❌ |
| Reference Photo | Camera or photo library picker | ❌ |
| Flowers | List of added flowers with stem counts | ✅ (min 1) |

#### New Order Wizard (creation)

Two-step flow, slides forward (Chick-fil-A style, no popups). Same sequential single-step-at-a-time behavior on iPad as iPhone, just at a wider layout — no side-by-side split view, to avoid maintaining two different interaction models for one wizard.

1. **Step 1 — Customer Info:** all fields above except Flowers.
2. **Step 2 — Add Flowers:** the shared flower-picker UI — search bar + grid, where tapping a flower card expands it **in place** (no separate sheet/dialog) to reveal a `– [qty] +` stepper, with tap-to-type for an exact number. Selected flowers show their chosen stem count directly on the card.

**Dynamic sort order:** The flower-picker grid (`FlowerPickerGrid`, shared by the wizard, Order Detail editing, and manual receipt entry — see 5.4) defaults to a **recency-weighted sort**, not alphabetical: flowers are ranked by occurrence count across her **last 10 orders** (active + archived, derived at runtime — no stored counters), so flowers she's actually been ordering lately rise to the top of the grid. Flowers outside that recent window fall below, sorted alphabetically as a tiebreaker/fallback. Search still filters/overrides this ranking when she's typing. Same sort applies uniformly in all three contexts — no special-casing for receipt entry.

No third "review" step — she can review and fix mistakes later from the Orders page itself. A persistent **"Save Order"** button is visible on both steps (e.g. sticky footer), so she can save as soon as the minimum required fields (customer name, due date, delivery/pickup, payment status, ≥1 flower) are met, without being forced to visit both steps in order. Back/forward between steps preserves entered data.

**Draft autosave:** Wizard state (both steps) is persisted to `bloomstock:draft_order` (AsyncStorage) on every field change/flower pick, not just on final save. If the app is interrupted (backgrounded, killed, force-quit) before "Save Order" is tapped, reopening the wizard offers to resume the in-progress draft. The draft key is cleared on explicit save or explicit discard. This protects against losing in-progress work during a rush — exactly the scenario the app exists to support.

#### Order Detail (edit)

**Single combined screen** — all fields above on one page, including the flower list inline (using the same expand-in-place picker for adding/adjusting/removing flowers). No step-based navigation. Reachable by tapping an order card from Orders or Archive (Archive is read-only, no edit controls shown).

**Save:** Validates required fields, saves order, triggers an allocation recalc (section 6), returns to the previous page.

---

### 5.4 Stocking Page

**Purpose:** Submit a purchase receipt to update global inventory.

**Layout:**
```
┌──────────────────────────┐
│ Stock Inventory          │
│                          │
│  [📷 Scan Receipt]       │
│  [📁 Upload File]        │
│                          │
│  Recent Receipts         │
│  · Jun 20 - Trader Joe's │
│  · Jun 18 - Trader Joe's │
└──────────────────────────┘
```

**Receipt Processing Flow:**
1. User taps **Scan** (camera) or **Upload** (image from photo library). Images only — no PDF support in v1, since Vision OCR works on images and PDF rendering is extra work for a rarely-hit case (a digital/PDF receipt can be screenshotted as a workaround).
2. Apple Vision framework runs on-device OCR → extracts raw text
3. Raw text sent to Claude API (`claude-sonnet-4-6`) for interpretation:
   - System prompt instructs Claude to match line items to known flower names, extract quantities, and extract price + unit (stem or bunch) as printed on the receipt — no normalization
   - Returns JSON array of `{ rawText, matchedFlowerName, quantity, price, priceUnit }`
4. **Confirmation screen** shown before any inventory changes:
   - List of parsed items, each showing raw text + matched flower + quantity + **price/unit** (e.g. "$5.99/bunch")
   - User can correct any mismatches (tap to edit match, quantity, price, or unit)
   - Toggle off items that aren't flowers
5. User taps **Confirm** → inventory updates with new stock quantities and prices, inventory allocation recalculates

**Recent Receipts:** Tapping a past receipt opens a **read-only** view of its parsed line items (matched flower, quantity, price). No editing after confirmation — correcting a historical receipt's resulting stock numbers is done via the Inventory page's manual adjust (with audit log), not by reopening the receipt, since retroactively replaying allocation against already-consumed/reallocated stock would be ambiguous.

**Manual entry fallback:** If the Claude API call fails (no network, API error, exhausted credit), the receipt isn't blocked. The on-device OCR text (captured regardless of the API call's success) is shown for reference, but instead of pre-filled parsed items, she uses the same flower-picker UI as the order wizard (search + grid, tap to expand in place, stepper or type-to-enter quantity) to add each purchased flower herself. Price per item is optional in this path — if left blank, it defaults to that flower's `lastPrice`/`lastPriceUnit` from `InventoryItem`.

**API key:** Single-user personal app, no backend. Anthropic API key (separate billing from any Claude Pro subscription) is bundled via app config/env, not user-entered. Acceptable risk for v1 given personal/internal distribution — revisit if the app is ever distributed beyond one device.

**Claude API prompt (reference):**
```
You are parsing a grocery/flower shop receipt. 
Given the raw OCR text below, identify all flower items and their quantities (stem count or bunch count).
Extract the price for each item exactly as printed, along with whether it's priced per stem or per bunch — do not convert between units.
Return ONLY a JSON array with no markdown, no preamble:
[{ "rawText": "...", "matchedFlowerName": "...", "quantity": 0, "price": 0.00, "priceUnit": "stem" }]
If you cannot match a line to a known flower, set matchedFlowerName to null.
If price is not visible on the receipt, set price and priceUnit to null.

Known flowers: [inject flower list here]

OCR Text:
[inject raw text here]
```

---

### 5.5 Inventory Page

**Purpose:** Show current global stock levels, allocation, and pricing (as printed on the receipt, per stem or per bunch).

**Layout:**
```
┌───────────────────────────────┐
│ Inventory                     │
├───────────────────────────────┤
│ Rose (Red)                    │
│ On hand: 48  ·  Spoken for: 36│
│ Available: 12  ████████░░ 75% │
│ Last price: $1.25/stem (Jun 20)│
├───────────────────────────────┤
│ Sunflower                     │
│ On hand: 20  ·  Spoken for: 20│
│ Available: 0   ██████████ 100%│
│ Last price: $2.50/bunch (Jun 18)│
│ ⚠️ Fully allocated            │
└───────────────────────────────┘
```

**Behavior:**
- Rows sorted by: fully-allocated (⚠️) first, then alphabetical
- Each row displays **last price** with its unit (e.g. "$1.25/stem") and the date it was recorded (from most recent receipt)
- Price field is optional; flowers stocked before any receipt confirmation will show "No price data"
- Each row has a **manual adjust** button (pencil icon) → opens a sheet to +/- stem count with a required reason field (e.g. "damaged stems"). Every adjustment is appended to an `InventoryAdjustment` log (see section 4) for audit purposes.
- Available = `totalStock - allocatedStock`
- ⚠️ badge when `available === 0` and active orders still need that flower

---

### 5.6 Archive Page

**Purpose:** View completed/delivered orders for reference.

**Layout:**
- Same card design as Orders page but muted/greyed palette
- Sorted by `archivedAt` descending (most recent first)
- Search bar at top — matches Customer Name, Phone Number, or Instagram Handle, substring match, case-insensitive (no fuzzy matching)
- Tap card → read-only Order Detail view
- No editing allowed after archiving

---

## 6. Inventory Allocation Logic

The allocation pass re-runs on every mutation that affects supply or demand:
- Receipt confirmed (inventory totalStock changes)
- Order created, edited (flower list/quantities changed), or deleted
- Manual inventory adjustment (5.5 pencil icon)
- Order archived ("Mark Delivered") — see consumption step below

**Inventory consumption on delivery:** Stock is only deducted from `totalStock` when an order is actually completed, not when it's purchased or allocated. When an order is archived, for each flower in that order: `totalStock -= fulfilledQuantity` and `allocatedStock -= fulfilledQuantity` (the stems are gone — used on the bouquet — so they're removed from both "on hand" and "spoken for"). This runs *before* the allocation pass below, since other active orders' availability may shift as a result.

Allocation algorithm:

```
For each flower type:
  Sort active orders by dueDate ascending
  totalAvailable = inventory[flower].totalStock
  For each order (earliest first):
    needed = order.flowers[flower].quantity
    allocate = min(needed, totalAvailable)
    order.flowers[flower].fulfilledQuantity = allocate
    totalAvailable -= allocate
  inventory[flower].allocatedStock = totalStock - totalAvailable
```

This ensures the earliest due orders are always prioritized for available stock.

---

## 7. Storage (v1)

Use **AsyncStorage** (via `@react-native-async-storage/async-storage`) for local persistence. No backend or auth required for v1.

Keys:
- `bloomstock:orders` → `Order[]`
- `bloomstock:inventory` → `InventoryItem[]`
- `bloomstock:receipts` → `StockingReceipt[]`
- `bloomstock:adjustments` → `InventoryAdjustment[]`
- `bloomstock:draft_order` → in-progress New Order wizard state (cleared on save/discard)

Migration strategy: store a `bloomstock:schema_version` key. Increment when data shape changes.

---

## 8. Design Direction

**Aesthetic:** Clean, professional, botanical — not cutesy. This is a business tool.

**Palette:**
- Background: `#FAFAF8` (warm off-white)
- Surface: `#FFFFFF`
- Primary: `#2D6A4F` (deep botanical green)
- Accent: `#B5451B` (dried rose / terracotta — used sparingly)
- Success: `#52B788` (fulfilled / fully supplied)
- Warning: `#E9C46A` (partial stock)
- Danger: `#E63946` (overdue, missing stock)
- Text primary: `#1A1A1A`
- Text secondary: `#6B7280`

**Typography:**
- Display: `Playfair Display` (order names, page headers)
- Body: `Inter` (all UI text, labels, inputs)

**Signature element:** Flower cards in the catalog use a subtle pressed-botanical illustration style background texture, giving the grid a physical, tactile feel without being decorative.

---

## 9. Project Structure

```
bloom-stock/
├── app/
│   ├── (tabs)/
│   │   ├── shopping-list.tsx
│   │   ├── orders.tsx
│   │   ├── stock.tsx
│   │   ├── inventory.tsx
│   │   └── archive.tsx
│   └── order/
│       ├── new.tsx         ← 2-step wizard (customer info → add flowers)
│       └── [id].tsx        ← single combined edit screen
├── components/
│   ├── FlowerPickerGrid.tsx ← shared expand-in-place picker (order wizard, edit, manual receipt entry)
│   ├── OrderCard.tsx
│   ├── InventoryRow.tsx
│   ├── ReceiptConfirmSheet.tsx
│   └── ShoppingListRow.tsx
├── data/
│   └── flowers.ts          ← hardcoded flower list
├── hooks/
│   ├── useOrders.ts
│   ├── useInventory.ts
│   └── useReceipts.ts
├── lib/
│   ├── storage.ts          ← AsyncStorage helpers
│   ├── allocation.ts       ← inventory allocation logic
│   └── claude.ts           ← Claude API receipt parsing
├── specs/
│   └── 001-app-overview/
│       └── SPEC.md         ← this file
├── types/
│   └── index.ts            ← all shared TypeScript types
└── assets/
    └── flowers/            ← flower images
```

---

## 10. Out of Scope (v1)

- Authentication / user accounts
- Push notifications
- Cloud sync / backend — **planned for v2**: full data layer (orders, inventory, receipts, adjustments), not just image storage, so an order created on iPad syncs to iPhone. Candidates: Supabase or Firebase (not Spanner — overkill for single-user scale). Out of scope for v1; v1 ships fully local via AsyncStorage.
- Android support
- In-app flower catalog editing
- Multi-florist accounts
- PDF receipt generation for customers