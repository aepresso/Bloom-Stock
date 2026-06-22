// Inventory allocation logic (SPEC.md §6). Pure functions — no I/O, no React — so
// they're trivially unit-testable (constitution Principle IV; tests T034/T042) and
// can be re-run by the store on every supply/demand-affecting mutation.
//
// Three concerns live here, all derived from the same earliest-due-first rule:
//   1. allocate()        — recompute fulfilledQuantity + allocatedStock (§6 core)
//   2. consumeForArchive — decrement stock when an order is delivered (§6 consumption)
//   3. deriveShoppingList — what's still short across active orders (§5.1, US4)

import type { InventoryItem, Order } from '@/types';

/**
 * Recompute fulfillment for all active orders and allocatedStock for all inventory
 * items, earliest-due-first per flower (SPEC §6). Pure: returns new arrays, mutates
 * nothing. Non-active orders are passed through untouched (their fulfilledQuantity
 * was frozen at archive time). Returns both collections since one pass derives both.
 */
export function allocate(
  orders: Order[],
  inventory: InventoryItem[]
): { orders: Order[]; inventory: InventoryItem[] } {
  // Remaining unallocated stock per flower, seeded from totalStock.
  const remaining = new Map<string, number>();
  for (const item of inventory) remaining.set(item.flowerId, item.totalStock);

  // Active orders, earliest due first. Stable-ish: dueDate then createdAt as tiebreak.
  const activeSorted = orders
    .filter((o) => o.status === 'active')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt));

  // fulfilledQuantity keyed by `${orderId}::${flowerId}`.
  const fulfilled = new Map<string, number>();
  for (const order of activeSorted) {
    for (const of of order.flowers) {
      const avail = remaining.get(of.flowerId) ?? 0;
      const give = Math.min(of.quantity, avail);
      fulfilled.set(`${order.id}::${of.flowerId}`, give);
      remaining.set(of.flowerId, avail - give);
    }
  }

  const nextOrders = orders.map((order) => {
    if (order.status !== 'active') return order;
    return {
      ...order,
      flowers: order.flowers.map((of) => ({
        ...of,
        fulfilledQuantity: fulfilled.get(`${order.id}::${of.flowerId}`) ?? 0,
      })),
    };
  });

  const nextInventory = inventory.map((item) => ({
    ...item,
    // allocatedStock = totalStock - whatever is left unallocated.
    allocatedStock: item.totalStock - (remaining.get(item.flowerId) ?? item.totalStock),
  }));

  return { orders: nextOrders, inventory: nextInventory };
}

/**
 * Consume stock for an order being archived (SPEC §6 "consumption on delivery"):
 * for each flower in the order, totalStock -= fulfilledQuantity AND allocatedStock
 * -= fulfilledQuantity. Returns new inventory; does NOT reallocate (the caller runs
 * allocate() afterward, since other active orders' availability shifts as a result).
 */
export function consumeForArchive(order: Order, inventory: InventoryItem[]): InventoryItem[] {
  const consumed = new Map<string, number>();
  for (const of of order.flowers) {
    consumed.set(of.flowerId, (consumed.get(of.flowerId) ?? 0) + of.fulfilledQuantity);
  }
  return inventory.map((item) => {
    const used = consumed.get(item.flowerId) ?? 0;
    if (used === 0) return item;
    return {
      ...item,
      totalStock: Math.max(0, item.totalStock - used),
      allocatedStock: Math.max(0, item.allocatedStock - used),
    };
  });
}

export type ShoppingListEntry = {
  flowerId: string;
  deficit: number; // needed across active orders minus totalStock, > 0
  earliestOrderId: string; // the soonest-due active order driving the shortfall
  earliestDueDate: string;
};

/**
 * Derive the Shopping List (SPEC §5.1, US4): per flower, sum the quantity needed
 * across active orders; if that exceeds totalStock, surface the deficit along with
 * the earliest-due order contributing to it. Sorted by that due date (urgency).
 */
export function deriveShoppingList(
  orders: Order[],
  inventory: InventoryItem[]
): ShoppingListEntry[] {
  const stockOf = new Map<string, number>();
  for (const item of inventory) stockOf.set(item.flowerId, item.totalStock);

  const needed = new Map<string, number>();
  const earliest = new Map<string, { orderId: string; dueDate: string }>();

  for (const order of orders) {
    if (order.status !== 'active') continue;
    for (const of of order.flowers) {
      needed.set(of.flowerId, (needed.get(of.flowerId) ?? 0) + of.quantity);
      const cur = earliest.get(of.flowerId);
      if (!cur || order.dueDate.localeCompare(cur.dueDate) < 0) {
        earliest.set(of.flowerId, { orderId: order.id, dueDate: order.dueDate });
      }
    }
  }

  const entries: ShoppingListEntry[] = [];
  for (const [flowerId, need] of needed) {
    const deficit = need - (stockOf.get(flowerId) ?? 0);
    if (deficit <= 0) continue;
    const e = earliest.get(flowerId)!;
    entries.push({
      flowerId,
      deficit,
      earliestOrderId: e.orderId,
      earliestDueDate: e.dueDate,
    });
  }

  return entries.sort((a, b) => a.earliestDueDate.localeCompare(b.earliestDueDate));
}

/** Order fulfillment fraction in [0,1]: sum(fulfilled)/sum(quantity). 0 flowers → 0. */
export function fulfillmentRatio(order: Order): number {
  const total = order.flowers.reduce((s, f) => s + f.quantity, 0);
  if (total === 0) return 0;
  const got = order.flowers.reduce((s, f) => s + f.fulfilledQuantity, 0);
  return got / total;
}
