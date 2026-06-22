// Allocation algorithm tests (SPEC §6, constitution Principle IV). These guard the
// one place where a silent bug would corrupt real inventory numbers. Pure functions,
// no RN/AsyncStorage, so they run under plain Jest.

import { allocate, deriveShoppingList, fulfillmentRatio } from '@/lib/allocation';
import { DEFAULT_OWNER_ID, type InventoryItem, type Order } from '@/types';

function order(
  id: string,
  dueDate: string,
  flowers: [flowerId: string, quantity: number][],
  status: Order['status'] = 'active'
): Order {
  return {
    id,
    ownerId: DEFAULT_OWNER_ID,
    customerName: id,
    dueDate,
    deliveryType: 'delivery',
    paymentStatus: 'unpaid',
    flowers: flowers.map(([flowerId, quantity]) => ({ flowerId, quantity, fulfilledQuantity: 0 })),
    status,
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

function inv(flowerId: string, totalStock: number): InventoryItem {
  return { flowerId, ownerId: DEFAULT_OWNER_ID, totalStock, allocatedStock: 0 };
}

const fulfilled = (o: Order, flowerId: string) =>
  o.flowers.find((f) => f.flowerId === flowerId)?.fulfilledQuantity ?? 0;

describe('allocate — single order / single flower', () => {
  it('fully fills when stock meets demand', () => {
    const { orders, inventory } = allocate([order('a', '2026-06-10', [['rose', 10]])], [inv('rose', 10)]);
    expect(fulfilled(orders[0], 'rose')).toBe(10);
    expect(inventory[0].allocatedStock).toBe(10);
  });

  it('partially fills when stock is short', () => {
    const { orders, inventory } = allocate([order('a', '2026-06-10', [['rose', 10]])], [inv('rose', 4)]);
    expect(fulfilled(orders[0], 'rose')).toBe(4);
    expect(inventory[0].allocatedStock).toBe(4);
  });
});

describe('allocate — scarce stock across competing orders', () => {
  it('prioritizes the earliest due order', () => {
    const later = order('later', '2026-06-20', [['rose', 6]]);
    const earlier = order('earlier', '2026-06-10', [['rose', 6]]);
    // Stock for only one order. Pass them out-of-order to prove sorting.
    const { orders, inventory } = allocate([later, earlier], [inv('rose', 6)]);

    const e = orders.find((o) => o.id === 'earlier')!;
    const l = orders.find((o) => o.id === 'later')!;
    expect(fulfilled(e, 'rose')).toBe(6); // earliest fully supplied
    expect(fulfilled(l, 'rose')).toBe(0); // later gets nothing
    expect(inventory[0].allocatedStock).toBe(6);
  });

  it('splits leftover stock to the next order', () => {
    const earlier = order('earlier', '2026-06-10', [['rose', 6]]);
    const later = order('later', '2026-06-20', [['rose', 6]]);
    const { orders } = allocate([earlier, later], [inv('rose', 8)]);
    expect(fulfilled(orders.find((o) => o.id === 'earlier')!, 'rose')).toBe(6);
    expect(fulfilled(orders.find((o) => o.id === 'later')!, 'rose')).toBe(2);
  });
});

describe('allocate — edge cases', () => {
  it('zero stock (no inventory item) yields zero fulfillment', () => {
    const { orders } = allocate([order('a', '2026-06-10', [['rose', 5]])], []);
    expect(fulfilled(orders[0], 'rose')).toBe(0);
  });

  it('exact-fit stock allocates everything and leaves none available', () => {
    const { orders, inventory } = allocate(
      [order('a', '2026-06-10', [['rose', 5]]), order('b', '2026-06-12', [['rose', 5]])],
      [inv('rose', 10)]
    );
    expect(fulfilled(orders[0], 'rose')).toBe(5);
    expect(fulfilled(orders[1], 'rose')).toBe(5);
    expect(inventory[0].allocatedStock).toBe(10);
  });

  it('ignores archived orders when allocating', () => {
    const archived = order('done', '2026-06-01', [['rose', 10]], 'archived');
    const active = order('live', '2026-06-10', [['rose', 4]]);
    const { orders, inventory } = allocate([archived, active], [inv('rose', 4)]);
    // Archived order is passed through untouched; active gets the stock.
    expect(orders.find((o) => o.id === 'done')!.flowers[0].fulfilledQuantity).toBe(0);
    expect(fulfilled(orders.find((o) => o.id === 'live')!, 'rose')).toBe(4);
    expect(inventory[0].allocatedStock).toBe(4);
  });
});

describe('deriveShoppingList', () => {
  it('surfaces only flowers in deficit, sorted by earliest due', () => {
    const orders = [
      order('a', '2026-06-25', [['rose', 5]]),
      order('b', '2026-06-20', [['rose', 5], ['tulip', 3]]),
    ];
    const inventory = [inv('rose', 4), inv('tulip', 10)];
    const list = deriveShoppingList(orders, inventory);

    // rose: need 10, stock 4 → deficit 6, earliest due 2026-06-20. tulip fully stocked.
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ flowerId: 'rose', deficit: 6, earliestDueDate: '2026-06-20' });
  });
});

describe('fulfillmentRatio', () => {
  it('is the fulfilled/needed fraction across all flowers', () => {
    const o = order('a', '2026-06-10', [['rose', 10], ['tulip', 10]]);
    o.flowers[0].fulfilledQuantity = 10;
    o.flowers[1].fulfilledQuantity = 5;
    expect(fulfillmentRatio(o)).toBeCloseTo(0.75);
  });

  it('is 0 for an order with no flowers', () => {
    expect(fulfillmentRatio(order('a', '2026-06-10', []))).toBe(0);
  });
});
