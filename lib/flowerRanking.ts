// Flower-picker recency ranking (SPEC §5.3 "Dynamic sort order", data-model.md
// derived values). Ranks flowers by occurrence count across the last 10 orders (any
// status, most-recently-created-first window), descending, alphabetical tiebreak.
// Derived at runtime — no stored counters. Search still overrides this in the grid.

import { flowerName } from '@/data/flowers';
import type { Order } from '@/types';

const RECENT_WINDOW = 10;

/** flowerIds in recency-rank order. Flowers outside the window are simply absent
 *  (the grid falls back to alphabetical for those). */
export function recencyRankedFlowerIds(orders: Order[]): string[] {
  const recent = [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_WINDOW);

  const counts = new Map<string, number>();
  for (const order of recent) {
    for (const f of order.flowers) {
      counts.set(f.flowerId, (counts.get(f.flowerId) ?? 0) + 1);
    }
  }

  return [...counts.keys()].sort(
    (a, b) => (counts.get(b)! - counts.get(a)!) || flowerName(a).localeCompare(flowerName(b))
  );
}
