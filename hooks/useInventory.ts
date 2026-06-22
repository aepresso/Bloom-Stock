// Inventory facade over the central store. Exposes inventory items (with derived
// availableStock), the adjustment log, and the two mutations (confirm receipt, manual
// adjust). Also surfaces which flowers active orders still demand, to drive the
// ⚠️ fully-allocated badge (SPEC §5.5).

import { useMemo } from 'react';

import { useStore } from '@/lib/store';
import type { InventoryItem } from '@/types';

export type InventoryRowData = InventoryItem & {
  availableStock: number;
  /** active orders still want this flower (for the ⚠️ badge when available === 0). */
  hasUnmetDemand: boolean;
};

export function useInventory() {
  const { inventory, adjustments, orders, hydrated, confirmReceipt, adjustInventory } = useStore();

  // Flowers that active orders need at all (any quantity) — used for the ⚠️ badge.
  const demandedFlowerIds = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (o.status !== 'active') continue;
      for (const f of o.flowers) if (f.quantity > 0) set.add(f.flowerId);
    }
    return set;
  }, [orders]);

  // Rows sorted fully-allocated-first, then alphabetical by flowerId (SPEC §5.5).
  const rows = useMemo<InventoryRowData[]>(() => {
    return inventory
      .map((item) => {
        const availableStock = item.totalStock - item.allocatedStock;
        return {
          ...item,
          availableStock,
          hasUnmetDemand: demandedFlowerIds.has(item.flowerId),
        };
      })
      .sort((a, b) => {
        const aFull = a.availableStock === 0 && a.hasUnmetDemand;
        const bFull = b.availableStock === 0 && b.hasUnmetDemand;
        if (aFull !== bFull) return aFull ? -1 : 1;
        return a.flowerId.localeCompare(b.flowerId);
      });
  }, [inventory, demandedFlowerIds]);

  return { inventory, rows, adjustments, hydrated, confirmReceipt, adjustInventory };
}
