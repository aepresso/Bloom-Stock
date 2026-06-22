// Hardcoded flower catalog for v1 (SPEC.md §4). No in-app add/edit UI — expansions
// ship via app update. Shared by the order flower-picker, the Shopping List, and the
// manual receipt-entry fallback. `category` is informational only — never used for
// sorting or grouping anywhere in v1.
//
// `imageUri` is intentionally omitted for now: the catalog images (assets/flowers/)
// are a polish task (T053). Components fall back to a placeholder when it's absent.

import type { Flower } from '@/types';

export const FLOWERS: Flower[] = [
  // Trader Joe's
  { id: 'alstroemeria', name: 'Alstroemeria', category: "Trader Joe's" },
  { id: 'babys-breath', name: "Baby's Breath", category: "Trader Joe's" },
  { id: 'carnation', name: 'Carnation', category: "Trader Joe's" },
  { id: 'chrysanthemum', name: 'Chrysanthemum', category: "Trader Joe's" },
  { id: 'dahlia', name: 'Dahlia', category: "Trader Joe's" },
  { id: 'eucalyptus', name: 'Eucalyptus (stems)', category: "Trader Joe's" },
  { id: 'freesia', name: 'Freesia', category: "Trader Joe's" },
  { id: 'gerbera-daisy', name: 'Gerbera Daisy', category: "Trader Joe's" },
  { id: 'iris', name: 'Iris', category: "Trader Joe's" },
  { id: 'lavender', name: 'Lavender (stems)', category: "Trader Joe's" },
  { id: 'lisianthus', name: 'Lisianthus', category: "Trader Joe's" },
  { id: 'lily-asiatic', name: 'Lily (Asiatic)', category: "Trader Joe's" },
  { id: 'lily-oriental', name: 'Lily (Oriental)', category: "Trader Joe's" },
  { id: 'orchid-phalaenopsis', name: 'Orchid (Phalaenopsis)', category: "Trader Joe's" },
  { id: 'peony', name: 'Peony', category: "Trader Joe's" },
  { id: 'ranunculus', name: 'Ranunculus', category: "Trader Joe's" },
  { id: 'rose-red', name: 'Rose (Red)', category: "Trader Joe's" },
  { id: 'rose-pink', name: 'Rose (Pink)', category: "Trader Joe's" },
  { id: 'rose-white', name: 'Rose (White)', category: "Trader Joe's" },
  { id: 'rose-yellow', name: 'Rose (Yellow)', category: "Trader Joe's" },
  { id: 'snapdragon', name: 'Snapdragon', category: "Trader Joe's" },
  { id: 'statice', name: 'Statice', category: "Trader Joe's" },
  { id: 'stock-matthiola', name: 'Stock (Matthiola)', category: "Trader Joe's" },
  { id: 'sunflower', name: 'Sunflower', category: "Trader Joe's" },
  { id: 'sweet-pea', name: 'Sweet Pea', category: "Trader Joe's" },
  { id: 'tulip', name: 'Tulip', category: "Trader Joe's" },
  { id: 'wax-flower', name: 'Wax Flower', category: "Trader Joe's" },

  // Her job stock (to be confirmed/expanded later)
  { id: 'protea', name: 'Protea', category: 'Work Stock' },
  { id: 'anthurium', name: 'Anthurium', category: 'Work Stock' },
  { id: 'bird-of-paradise', name: 'Bird of Paradise', category: 'Work Stock' },
  { id: 'heliconia', name: 'Heliconia', category: 'Work Stock' },
  { id: 'calla-lily', name: 'Calla Lily', category: 'Work Stock' },
  { id: 'hydrangea', name: 'Hydrangea', category: 'Work Stock' },
];

const FLOWERS_BY_ID: Record<string, Flower> = Object.fromEntries(
  FLOWERS.map((f) => [f.id, f])
);

/** Look up a flower by id. Returns undefined if the id is not in the catalog. */
export function getFlower(flowerId: string): Flower | undefined {
  return FLOWERS_BY_ID[flowerId];
}

/** Human-readable name for a flower id, falling back to the raw id if unknown. */
export function flowerName(flowerId: string): string {
  return FLOWERS_BY_ID[flowerId]?.name ?? flowerId;
}

/**
 * Resolve a flower *name* (as printed/returned by Claude) to a catalog id via
 * exact, case-insensitive match. Returns undefined when unmatched — callers fall
 * through to a manual match (contracts/claude-receipt-parsing.md, runtime validation).
 */
export function resolveFlowerIdByName(name: string): string | undefined {
  const needle = name.trim().toLowerCase();
  return FLOWERS.find((f) => f.name.toLowerCase() === needle)?.id;
}
