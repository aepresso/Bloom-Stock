// Shared recency ranking for every FlowerPickerGrid instance (wizard, Order Detail
// edit, manual receipt entry) so all three present the same live ranking (SPEC §5.3).

import { useMemo } from 'react';

import { recencyRankedFlowerIds } from '@/lib/flowerRanking';
import { useStore } from '@/lib/store';

export function useRecencyOrder(): string[] {
  const { orders } = useStore();
  return useMemo(() => recencyRankedFlowerIds(orders), [orders]);
}
