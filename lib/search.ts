// Shared order search (SPEC §5.2 / §5.6). Substring, case-insensitive match across
// customer name, phone number, and Instagram handle — identical on Orders and Archive
// (she doesn't always remember a name). Phone matching is digit-only so a query with
// dashes/spaces still matches the stored digits-only number.

import type { Order } from '@/types';

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
