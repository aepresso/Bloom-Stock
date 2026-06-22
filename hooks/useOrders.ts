// Orders facade over the central store (lib/store.tsx). Exposes the orders list
// plus create/update/delete/archive. Allocation recalc is handled inside the store
// on every mutation, so consumers always read fresh fulfilledQuantity values.

import { useMemo } from 'react';

import { useStore } from '@/lib/store';
import type { Order } from '@/types';

export function useOrders() {
  const { orders, hydrated, createOrder, updateOrder, deleteOrder, archiveOrder } = useStore();

  // Active orders, soonest due first (SPEC §5.2).
  const activeOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'active')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [orders]
  );

  // Archived orders, most-recently-archived first (SPEC §5.6).
  const archivedOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'archived')
        .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')),
    [orders]
  );

  const getOrder = (id: string): Order | undefined => orders.find((o) => o.id === id);

  return {
    orders,
    activeOrders,
    archivedOrders,
    hydrated,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    archiveOrder,
  };
}
