// Receipts facade over the central store. Receipts are written through the inventory
// path (confirmReceipt) — this hook is the read side: the Recent Receipts list and
// read-only tap-through (SPEC §5.4). Sorted most-recent first.

import { useMemo } from 'react';

import { useStore } from '@/lib/store';

export function useReceipts() {
  const { receipts, hydrated } = useStore();

  const recentReceipts = useMemo(
    () => [...receipts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [receipts]
  );

  const getReceipt = (id: string) => receipts.find((r) => r.id === id);

  return { receipts, recentReceipts, hydrated, getReceipt };
}
