// Central app store. Research §3 mandates Context + per-domain state backed by
// AsyncStorage; allocation (§6) couples orders and inventory, so a single store
// owns all four collections and the per-domain hooks (useOrders/useInventory/
// useReceipts) are thin selectors over it.
//
// Mutations are pure functional updaters that re-run allocate() and return the next
// state — no side effects inside the updater (safe under strict-mode double-invoke).
// A single effect persists whatever changed after each commit.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { allocate, consumeForArchive } from '@/lib/allocation';
import {
  adjustmentsStore,
  inventoryStore,
  ordersStore,
  receiptsStore,
} from '@/lib/storage';
import { uuid } from '@/lib/id';
import {
  DEFAULT_OWNER_ID,
  type InventoryAdjustment,
  type InventoryItem,
  type Order,
  type ParsedReceiptItem,
  type PriceUnit,
  type StockingReceipt,
} from '@/types';

type State = {
  orders: Order[];
  inventory: InventoryItem[];
  receipts: StockingReceipt[];
  adjustments: InventoryAdjustment[];
};

type ReceiptInput = {
  imageUri: string;
  rawOcrText: string;
  items: {
    flowerId: string;
    quantity: number;
    price?: number;
    priceUnit?: PriceUnit;
  }[];
};

type StoreValue = State & {
  hydrated: boolean;
  // Orders
  createOrder: (draft: Omit<Order, 'id' | 'ownerId' | 'status' | 'createdAt'>) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  archiveOrder: (id: string) => void;
  // Inventory
  confirmReceipt: (input: ReceiptInput) => void;
  adjustInventory: (flowerId: string, delta: number, reason: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY: State = { orders: [], inventory: [], receipts: [], adjustments: [] };

/** Find an existing inventory item or create a fresh zeroed one for a flower. */
function ensureItem(inventory: InventoryItem[], flowerId: string): InventoryItem {
  return (
    inventory.find((i) => i.flowerId === flowerId) ?? {
      flowerId,
      ownerId: DEFAULT_OWNER_ID,
      totalStock: 0,
      allocatedStock: 0,
    }
  );
}

/** Apply allocation to a candidate state, returning the consistent next state. */
function reconcile(next: State): State {
  const { orders, inventory } = allocate(next.orders, next.inventory);
  return { ...next, orders, inventory };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  // Remember the last-persisted slices so the effect only writes what changed.
  const persisted = useRef<State>(EMPTY);

  // Hydrate once at mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [orders, inventory, receipts, adjustments] = await Promise.all([
        ordersStore.get(),
        inventoryStore.get(),
        receiptsStore.get(),
        adjustmentsStore.get(),
      ]);
      if (cancelled) return;
      const loaded: State = { orders, inventory, receipts, adjustments };
      persisted.current = loaded;
      setState(loaded);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist whichever slices changed identity since the last write.
  useEffect(() => {
    if (!hydrated) return;
    const prev = persisted.current;
    if (state.orders !== prev.orders) void ordersStore.set(state.orders);
    if (state.inventory !== prev.inventory) void inventoryStore.set(state.inventory);
    if (state.receipts !== prev.receipts) void receiptsStore.set(state.receipts);
    if (state.adjustments !== prev.adjustments) void adjustmentsStore.set(state.adjustments);
    persisted.current = state;
  }, [state, hydrated]);

  // --- Order actions -------------------------------------------------------

  const createOrder = useCallback<StoreValue['createOrder']>((draft) => {
    const order: Order = {
      ...draft,
      id: uuid(),
      ownerId: DEFAULT_OWNER_ID,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setState((prev) => reconcile({ ...prev, orders: [...prev.orders, order] }));
    return order;
  }, []);

  const updateOrder = useCallback<StoreValue['updateOrder']>((id, patch) => {
    setState((prev) =>
      reconcile({
        ...prev,
        orders: prev.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })
    );
  }, []);

  const deleteOrder = useCallback<StoreValue['deleteOrder']>((id) => {
    // Cancel: remove the record; releases allocation (allocate re-runs), never
    // touches totalStock. Reference-photo file cleanup is handled by the caller.
    setState((prev) => reconcile({ ...prev, orders: prev.orders.filter((o) => o.id !== id) }));
  }, []);

  const archiveOrder = useCallback<StoreValue['archiveOrder']>((id) => {
    setState((prev) => {
      const order = prev.orders.find((o) => o.id === id);
      if (!order) return prev;
      // Consume stock for the delivered order BEFORE reallocation (SPEC §6).
      const inventory = consumeForArchive(order, prev.inventory);
      const orders = prev.orders.map((o) =>
        o.id === id
          ? { ...o, status: 'archived' as const, archivedAt: new Date().toISOString() }
          : o
      );
      return reconcile({ ...prev, orders, inventory });
    });
  }, []);

  // --- Inventory actions ---------------------------------------------------

  const confirmReceipt = useCallback<StoreValue['confirmReceipt']>((input) => {
    setState((prev) => {
      const today = new Date().toISOString();
      let inventory = prev.inventory;
      for (const line of input.items) {
        const existing = ensureItem(inventory, line.flowerId);
        const updated: InventoryItem = {
          ...existing,
          totalStock: existing.totalStock + line.quantity,
          lastPrice: line.price ?? existing.lastPrice,
          lastPriceUnit: line.priceUnit ?? existing.lastPriceUnit,
          lastReceiptDate: line.price != null ? today : existing.lastReceiptDate,
        };
        inventory = inventory.some((i) => i.flowerId === line.flowerId)
          ? inventory.map((i) => (i.flowerId === line.flowerId ? updated : i))
          : [...inventory, updated];
      }
      const receipt: StockingReceipt = {
        id: uuid(),
        ownerId: DEFAULT_OWNER_ID,
        submittedAt: today,
        imageUri: input.imageUri,
        rawOcrText: input.rawOcrText,
        parsedItems: input.items.map<ParsedReceiptItem>((l) => ({
          rawText: '',
          matchedFlowerId: l.flowerId,
          quantity: l.quantity,
          price: l.price,
          priceUnit: l.priceUnit,
          confirmed: true,
        })),
        confirmed: true,
      };
      return reconcile({ ...prev, inventory, receipts: [receipt, ...prev.receipts] });
    });
  }, []);

  const adjustInventory = useCallback<StoreValue['adjustInventory']>((flowerId, delta, reason) => {
    setState((prev) => {
      const existing = ensureItem(prev.inventory, flowerId);
      const updated: InventoryItem = {
        ...existing,
        totalStock: Math.max(0, existing.totalStock + delta),
      };
      const inventory = prev.inventory.some((i) => i.flowerId === flowerId)
        ? prev.inventory.map((i) => (i.flowerId === flowerId ? updated : i))
        : [...prev.inventory, updated];
      const adjustment: InventoryAdjustment = {
        id: uuid(),
        ownerId: DEFAULT_OWNER_ID,
        flowerId,
        delta,
        reason,
        createdAt: new Date().toISOString(),
      };
      return reconcile({ ...prev, inventory, adjustments: [adjustment, ...prev.adjustments] });
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      hydrated,
      createOrder,
      updateOrder,
      deleteOrder,
      archiveOrder,
      confirmReceipt,
      adjustInventory,
    }),
    [
      state,
      hydrated,
      createOrder,
      updateOrder,
      deleteOrder,
      archiveOrder,
      confirmReceipt,
      adjustInventory,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
