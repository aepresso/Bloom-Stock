// Shared order search (SPEC §5.2 / §5.6). Substring, case-insensitive match across
// customer name, phone number, and Instagram handle — identical on Orders and Archive
// (she doesn't always remember a name). Phone matching is digit-only so a query with
// dashes/spaces still matches the stored digits-only number.

import { FLOWERS, flowerName } from '@/data/flowers';
import type { Order, StockingReceipt } from '@/types';

export function orderMatchesQuery(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const textFields = [order.customerName, order.instagramHandle ?? ''];
  if (textFields.some((f) => f.toLowerCase().includes(q))) return true;

  const qDigits = q.replace(/\D/g, '');
  if (qDigits && (order.phoneNumber ?? '').includes(qDigits)) return true;

  return false;
}

export function filterOrders(orders: Order[], query: string): Order[] {
  if (!query.trim()) return orders;
  return orders.filter((o) => orderMatchesQuery(o, query));
}

// --- Global search (Home dashboard, flow redesign) ---------------------------
// One query across the three things she loses track of: orders (name/phone/handle),
// flowers (name → Inventory), and past receipts (matched by the flowers on them).

export type GlobalSearchResult =
  | { kind: 'order'; order: Order }
  | { kind: 'flower'; flowerId: string }
  | { kind: 'receipt'; receipt: StockingReceipt };

const MAX_PER_KIND = 5;

export function globalSearch(
  query: string,
  orders: Order[],
  receipts: StockingReceipt[]
): GlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: GlobalSearchResult[] = [];

  for (const order of orders) {
    if (!orderMatchesQuery(order, q)) continue;
    results.push({ kind: 'order', order });
    if (results.length >= MAX_PER_KIND) break;
  }

  const matchedFlowers = FLOWERS.filter((f) => f.name.toLowerCase().includes(q)).slice(
    0,
    MAX_PER_KIND
  );
  for (const f of matchedFlowers) results.push({ kind: 'flower', flowerId: f.id });

  // A receipt matches when any of its matched flowers matches the query.
  const flowerIdSet = new Set(matchedFlowers.map((f) => f.id));
  let receiptCount = 0;
  for (const receipt of receipts) {
    const hit = receipt.parsedItems.some(
      (it) =>
        (it.matchedFlowerId && flowerIdSet.has(it.matchedFlowerId)) ||
        (it.matchedFlowerId && flowerName(it.matchedFlowerId).toLowerCase().includes(q)) ||
        it.rawText.toLowerCase().includes(q)
    );
    if (!hit) continue;
    results.push({ kind: 'receipt', receipt });
    if (++receiptCount >= MAX_PER_KIND) break;
  }

  return results;
}
