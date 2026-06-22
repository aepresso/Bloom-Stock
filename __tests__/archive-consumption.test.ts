// Inventory consumption-on-archive tests (SPEC §6, constitution Principle IV). The
// critical invariant: archiving consumes the order's *fulfilledQuantity*, not its
// requested quantity (quickstart step 5) — so an under-supplied order only removes
// what it was actually given.

import { consumeForArchive } from '@/lib/allocation';
import { DEFAULT_OWNER_ID, type InventoryItem, type Order } from '@/types';

function order(flowers: [flowerId: string, quantity: number, fulfilled: number][]): Order {
  return {
    id: 'o1',
    ownerId: DEFAULT_OWNER_ID,
    customerName: 'Jane',
    dueDate: '2026-06-10',
    deliveryType: 'delivery',
    paymentStatus: 'paid',
    flowers: flowers.map(([flowerId, quantity, fulfilledQuantity]) => ({
      flowerId,
      quantity,
      fulfilledQuantity,
    })),
    status: 'active',
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

function inv(flowerId: string, totalStock: number, allocatedStock: number): InventoryItem {
  return { flowerId, ownerId: DEFAULT_OWNER_ID, totalStock, allocatedStock };
}

const find = (inventory: InventoryItem[], flowerId: string) =>
  inventory.find((i) => i.flowerId === flowerId)!;

describe('consumeForArchive', () => {
  it('full supply: removes the full amount from both totalStock and allocatedStock', () => {
    const result = consumeForArchive(order([['rose', 10, 10]]), [inv('rose', 10, 10)]);
    expect(find(result, 'rose')).toMatchObject({ totalStock: 0, allocatedStock: 0 });
  });

  it('partial supply: consumes only the fulfilledQuantity, not the requested quantity', () => {
    // Ordered 10 roses but only 4 were ever allocated; only 4 should be consumed.
    const result = consumeForArchive(order([['rose', 10, 4]]), [inv('rose', 9, 4)]);
    expect(find(result, 'rose')).toMatchObject({ totalStock: 5, allocatedStock: 0 });
  });

  it('multiple flowers per order: each decremented independently', () => {
    const result = consumeForArchive(
      order([
        ['rose', 5, 5],
        ['tulip', 3, 3],
      ]),
      [inv('rose', 8, 5), inv('tulip', 3, 3)]
    );
    expect(find(result, 'rose')).toMatchObject({ totalStock: 3, allocatedStock: 0 });
    expect(find(result, 'tulip')).toMatchObject({ totalStock: 0, allocatedStock: 0 });
  });

  it('leaves unrelated inventory untouched', () => {
    const result = consumeForArchive(order([['rose', 5, 5]]), [
      inv('rose', 5, 5),
      inv('lily', 12, 2),
    ]);
    expect(find(result, 'lily')).toMatchObject({ totalStock: 12, allocatedStock: 2 });
  });

  it('never drives stock negative', () => {
    // Defensive: even if fulfilled somehow exceeds stock, clamp at 0.
    const result = consumeForArchive(order([['rose', 5, 5]]), [inv('rose', 3, 3)]);
    expect(find(result, 'rose').totalStock).toBe(0);
    expect(find(result, 'rose').allocatedStock).toBe(0);
  });
});
