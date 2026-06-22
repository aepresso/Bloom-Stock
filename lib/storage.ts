// AsyncStorage helpers + schema-version migration runner (SPEC.md §7,
// data-model.md "AsyncStorage key → type map"). All persistence flows through here
// so the key strings and (de)serialization live in exactly one place.
//
// Constitution Principle I: the AsyncStorage boundary is untyped/external, so reads
// are defensive — a parse failure or shape surprise yields the provided fallback
// rather than throwing into UI code.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  DraftOrder,
  InventoryAdjustment,
  InventoryItem,
  Order,
  StockingReceipt,
} from '@/types';

export const STORAGE_KEYS = {
  orders: 'bloomstock:orders',
  inventory: 'bloomstock:inventory',
  receipts: 'bloomstock:receipts',
  adjustments: 'bloomstock:adjustments',
  draftOrder: 'bloomstock:draft_order',
  schemaVersion: 'bloomstock:schema_version',
} as const;

/** Bump whenever a persisted shape changes; add a matching entry to MIGRATIONS. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Typed read. Returns `fallback` on missing key, parse failure, or any error. */
export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt/legacy value — don't crash the app over a bad cache entry.
    return fallback;
  }
}

/** Typed write. */
export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Remove a key entirely (used for clearing the transient draft). */
export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// Typed convenience accessors for each domain collection. ----------------------

export const ordersStore = {
  get: () => getItem<Order[]>(STORAGE_KEYS.orders, []),
  set: (orders: Order[]) => setItem(STORAGE_KEYS.orders, orders),
};

export const inventoryStore = {
  get: () => getItem<InventoryItem[]>(STORAGE_KEYS.inventory, []),
  set: (items: InventoryItem[]) => setItem(STORAGE_KEYS.inventory, items),
};

export const receiptsStore = {
  get: () => getItem<StockingReceipt[]>(STORAGE_KEYS.receipts, []),
  set: (receipts: StockingReceipt[]) => setItem(STORAGE_KEYS.receipts, receipts),
};

export const adjustmentsStore = {
  get: () => getItem<InventoryAdjustment[]>(STORAGE_KEYS.adjustments, []),
  set: (adjustments: InventoryAdjustment[]) =>
    setItem(STORAGE_KEYS.adjustments, adjustments),
};

export const draftOrderStore = {
  get: () => getItem<DraftOrder | undefined>(STORAGE_KEYS.draftOrder, undefined),
  set: (draft: DraftOrder) => setItem(STORAGE_KEYS.draftOrder, draft),
  clear: () => removeItem(STORAGE_KEYS.draftOrder),
};

// Migration runner. -----------------------------------------------------------
//
// Each entry migrates data *from* version `index` to `index + 1`. v1 is the
// initial shape, so MIGRATIONS is empty today; future shape changes append a
// function here and bump CURRENT_SCHEMA_VERSION. Migrations run sequentially at
// launch before any domain read (research.md §4).

type Migration = () => Promise<void>;

const MIGRATIONS: Migration[] = [
  // v1 → v2 would go at index 1, etc. None yet.
];

/**
 * Run any pending migrations and persist the new schema version. Idempotent:
 * calling it when already current is a no-op. Returns the version landed on.
 */
export async function runMigrations(): Promise<number> {
  const stored = await getItem<number | null>(STORAGE_KEYS.schemaVersion, null);

  // First launch: nothing to migrate, just stamp the current version.
  if (stored == null) {
    await setItem(STORAGE_KEYS.schemaVersion, CURRENT_SCHEMA_VERSION);
    return CURRENT_SCHEMA_VERSION;
  }

  let version = stored;
  while (version < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version - 1];
    if (migrate) await migrate();
    version += 1;
    await setItem(STORAGE_KEYS.schemaVersion, version);
  }

  return version;
}
