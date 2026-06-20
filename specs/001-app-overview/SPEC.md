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
**Future:** Multi-florist expansion planned — design data models with this in mind (e.g. no hardcoded user state at the top level)

---

## 3. Navigation Structure

Bottom tab bar with 5 tabs. iPad uses a sidebar navigation instead of a bottom tab bar.

```
┌─────────────────────────────────────┐
│  [Catalog] [Orders] [Stock] [Inventory] [Archive] │
└─────────────────────────────────────┘
```

| Tab | Icon | Description |
|---|---|---|
| Catalog | 🌸 | Browse and search flowers to add to orders |
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
  category?: string;      // e.g. "Trader Joe's", "Work Stock", "Etc"
};
```

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
  lastPrice?: number;     // price per unit (stem/bunch) from most recent receipt
  lastReceiptDate?: string; // date of receipt containing this price
  // availableStock = totalStock - allocatedStock (derived, not stored)
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
  price?: number;         // price per unit extracted from receipt line
  confirmed: boolean;     // user confirmed this line item
};
```

---

## 5. Pages

---

### 5.1 Catalog Page

**Purpose:** Browse all available flowers and add them to an in-progress order.

**Layout:**
```
┌─────────────────────────┐
│ 🔍 Search flowers...    │  ← sticky search bar
├─────────────────────────┤
│ [Rose]   [Lily]  [Tulip]│
│ [Dahlia] [Alstr] [Orchi]│  ← 2-col grid (iPhone), 3-col (iPad)
│ ...                     │
└─────────────────────────┘
```

**Behavior:**
- Search filters the grid in real time by flower name
- Tapping a flower card opens a **stem count bottom sheet**:
  - Flower name + photo
  - `+` / `-` stepper for stem count (min 1)
  - "Add to Order" button → opens order selector if multiple in-progress orders exist, or adds directly to the single active draft
- If no draft order exists, tapping "Add to Order" prompts: **"Start a new order?"**

**Flower List (hardcoded v1):**

Trader Joe's:
- Alstroemeria, Baby's Breath, Carnation, Chrysanthemum, Dahlia, Eucalyptus (stems), Freesia, Gerbera Daisy, Iris, Lavender (stems), Lisianthus, Lily (Asiatic), Lily (Oriental), Orchid (Phalaenopsis), Peony, Ranunculus, Rose (Red), Rose (Pink), Rose (White), Rose (Yellow), Snapdragon, Statice, Stock (Matthiola), Sunflower, Sweet Pea, Tulip, Wax Flower

Her job stock (to be confirmed and expanded later):
- Protea, Anthurium, Bird of Paradise, Heliconia, Calla Lily, Hydrangea

> **Note:** Flower list is hardcoded for v1. No in-app add/edit UI yet. Expansions come via app update.

---

### 5.2 Orders Page

**Purpose:** View and manage all active orders, sorted by urgency.

**Layout:**
```
┌──────────────────────────────┐
│ Orders                    [+]│  ← new order button
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
- Sorted ascending by `dueDate` (soonest first)
- Fulfillment % = `sum(fulfilledQuantity) / sum(quantity)` across all flowers in the order
- At 100%: card highlights green, badge reads **"Fully Supplied"**
- Tap card → Order Detail screen
- Swipe left → **"Mark Delivered"** action → moves order to Archive
- `[+]` button → New Order form

---

### 5.3 Order Detail / New Order Form

**Purpose:** Create a new order or view/edit an existing one.

**Fields:**
| Field | Type | Required |
|---|---|---|
| Customer Name | Text input | ✅ |
| Instagram Handle | Text input (@ prefix) | ❌ |
| Phone Number | Text input (numeric) | ❌ |
| Due Date | Date picker | ✅ |
| Delivery / Pickup | Toggle | ✅ |
| Payment Status | Segmented control: Unpaid / Partial / Paid | ✅ |
| Special Notes | Multiline text | ❌ |
| Reference Photo | Camera or photo library picker | ❌ |
| Flowers | List of added flowers with stem counts | ✅ (min 1) |

**Flower section:**
- "Add Flowers" button opens Catalog inline or as a modal
- Each added flower shows: name, stem count, fulfilled stems, edit/remove

**Save:** Validates required fields, saves order, returns to Orders page.

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
1. User taps **Scan** (camera) or **Upload** (image/PDF from files)
2. Apple Vision framework runs on-device OCR → extracts raw text
3. Raw text sent to Claude API (`claude-sonnet-4-6`) for interpretation:
   - System prompt instructs Claude to match line items to known flower names, extract quantities, and extract prices per unit
   - Returns JSON array of `{ rawText, matchedFlowerName, quantity, price }`
4. **Confirmation screen** shown before any inventory changes:
   - List of parsed items, each showing raw text + matched flower + quantity + **price per unit**
   - User can correct any mismatches (tap to edit match, quantity, or price)
   - Toggle off items that aren't flowers
5. User taps **Confirm** → inventory updates with new stock quantities and prices, inventory allocation recalculates

**Claude API prompt (reference):**
```
You are parsing a grocery/flower shop receipt. 
Given the raw OCR text below, identify all flower items and their quantities (stem count or bunch count).
Extract the price per unit for each item when available.
Return ONLY a JSON array with no markdown, no preamble:
[{ "rawText": "...", "matchedFlowerName": "...", "quantity": 0, "price": 0.00 }]
If you cannot match a line to a known flower, set matchedFlowerName to null.
If price is not visible on the receipt, set price to null.

Known flowers: [inject flower list here]

OCR Text:
[inject raw text here]
```

---

### 5.5 Inventory Page

**Purpose:** Show current global stock levels, allocation, and per-unit pricing.

**Layout:**
```
┌───────────────────────────────┐
│ Inventory                     │
├───────────────────────────────┤
│ Rose (Red)                    │
│ On hand: 48  ·  Spoken for: 36│
│ Available: 12  ████████░░ 75% │
│ Last price: $1.25 (Jun 20)    │
├───────────────────────────────┤
│ Sunflower                     │
│ On hand: 20  ·  Spoken for: 20│
│ Available: 0   ██████████ 100%│
│ Last price: $2.50 (Jun 18)    │
│ ⚠️ Fully allocated            │
└───────────────────────────────┘
```

**Behavior:**
- Rows sorted by: fully-allocated (⚠️) first, then alphabetical
- Each row displays **last price per unit** and the date it was recorded (from most recent receipt)
- Price field is optional; flowers stocked before any receipt confirmation will show "No price data"
- Each row has a **manual adjust** button (pencil icon) → opens a sheet to +/- stem count with a reason field (e.g. "damaged stems")
- Available = `totalStock - allocatedStock`
- ⚠️ badge when `available === 0` and active orders still need that flower

---

### 5.6 Archive Page

**Purpose:** View completed/delivered orders for reference.

**Layout:**
- Same card design as Orders page but muted/greyed palette
- Sorted by `archivedAt` descending (most recent first)
- Search bar at top (by customer name)
- Tap card → read-only Order Detail view
- No editing allowed after archiving

---

## 6. Inventory Allocation Logic

When inventory updates (after confirming a receipt), the app runs an allocation pass:

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
│   │   ├── catalog.tsx
│   │   ├── orders.tsx
│   │   ├── stock.tsx
│   │   ├── inventory.tsx
│   │   └── archive.tsx
│   └── order/
│       ├── new.tsx
│       └── [id].tsx
├── components/
│   ├── FlowerCard.tsx
│   ├── OrderCard.tsx
│   ├── InventoryRow.tsx
│   ├── ReceiptConfirmSheet.tsx
│   └── StemCountSheet.tsx
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
- Cloud sync / backend
- Android support
- In-app flower catalog editing
- Multi-florist accounts
- PDF receipt generation for customers