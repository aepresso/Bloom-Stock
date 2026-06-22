// Shared TypeScript types for BloomStock v1.
// Source of truth: specs/001-app-overview/data-model.md (which derives from SPEC.md §4).
//
// Every *persisted* entity carries `ownerId: string` (Constitution Principle II,
// Multi-User Ready). In v1 this is always the constant DEFAULT_OWNER_ID and is
// never read/branched on in UI logic — it exists purely to unblock v2 multi-florist
// work without a second shape-changing migration.

export const DEFAULT_OWNER_ID = 'default-user';

/** Price/quantity unit for a flower purchase. Units are never converted between. */
export type PriceUnit = 'stem' | 'bunch';

/** Static reference data — hardcoded in data/flowers.ts, not persisted, no ownerId. */
export type Flower = {
  id: string; // stable slug, e.g. "rose-red"
  name: string;
  imageUri?: string;
  category?: string; // informational only — not used for sorting/grouping
};

export type DeliveryType = 'delivery' | 'pickup';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

/** 'fulfilled' is reserved/unused in v1 — "Fully Supplied" is a derived UI badge. */
export type OrderStatus = 'active' | 'fulfilled' | 'archived';

/** Embedded in Order.flowers — not a top-level collection. */
export type OrderFlower = {
  flowerId: string;
  quantity: number; // >= 1
  fulfilledQuantity: number; // 0 <= fulfilledQuantity <= quantity, recomputed by allocation pass
};

export type Order = {
  id: string; // UUID — sync merge-safety
  ownerId: string;
  customerName: string; // required, non-empty
  instagramHandle?: string; // stored without leading "@"; UI displays with "@"
  phoneNumber?: string; // digits only
  dueDate: string; // ISO 8601 date; UI enforces >= today at create/edit
  deliveryType: DeliveryType;
  paymentStatus: PaymentStatus;
  notes?: string;
  referencePhotoUri?: string; // local file in document directory
  flowers: OrderFlower[]; // required, min length 1
  status: OrderStatus;
  createdAt: string;
  archivedAt?: string;
};

export type InventoryItem = {
  flowerId: string; // 1:1 with Flower.id — primary key, no separate id
  ownerId: string;
  totalStock: number; // >= 0
  allocatedStock: number; // >= 0, <= totalStock
  lastPrice?: number;
  lastPriceUnit?: PriceUnit;
  lastReceiptDate?: string;
};
// availableStock = totalStock - allocatedStock — derived, never stored

export type InventoryAdjustment = {
  id: string; // UUID
  ownerId: string;
  flowerId: string;
  delta: number; // != 0; positive or negative
  reason: string; // required, non-empty
  createdAt: string;
};

export type ParsedReceiptItem = {
  rawText: string;
  matchedFlowerId?: string;
  quantity: number; // >= 1 once confirmed
  price?: number;
  priceUnit?: PriceUnit;
  confirmed: boolean; // toggled off = excluded from inventory update on Confirm
};

export type StockingReceipt = {
  id: string; // UUID
  ownerId: string;
  submittedAt: string;
  imageUri: string; // local file in document directory
  rawOcrText: string;
  parsedItems: ParsedReceiptItem[];
  confirmed: boolean;
};

/** Transient autosave shape for the New Order wizard — at most one at a time. */
export type DraftOrder = Partial<
  Omit<Order, 'id' | 'ownerId' | 'createdAt' | 'status' | 'archivedAt'>
> & {
  lastSavedAt: string;
};
