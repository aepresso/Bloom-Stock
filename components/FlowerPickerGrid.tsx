// Shared flower picker (SPEC §5.3). Search bar + grid; tapping a card expands it
// *in place* (no sheet) to reveal a − [qty] + stepper with tap-to-type entry.
// Selected cards show their chosen count. Used by the New Order wizard, Order Detail
// editing, and the manual receipt-entry fallback — one component, three call sites.
//
// Default ordering is alphabetical; pass `recencyOrder` (a list of flowerIds, most-
// used first) to switch to the recency-weighted sort (US8). Search always overrides
// the ranking while the user is typing.

import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { FLOWERS } from '@/data/flowers';
import { fontSize, palette, radius, spacing, typography } from '@/lib/theme';
import type { Flower } from '@/types';

type Props = {
  /** flowerId → chosen quantity (absent or 0 = not selected). */
  quantities: Record<string, number>;
  /** Set a flower's quantity; 0 removes it from the selection. */
  onSetQuantity: (flowerId: string, quantity: number) => void;
  /** flowerIds in recency-rank order (US8). Omit for alphabetical. */
  recencyOrder?: string[];
  flowers?: Flower[];
};

export function FlowerPickerGrid({
  quantities,
  onSetQuantity,
  recencyOrder,
  flowers = FLOWERS,
}: Props) {
  const { width } = useWindowDimensions();
  const numColumns = width >= 700 ? 3 : 2;
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ranked = useMemo(() => {
    const alpha = [...flowers].sort((a, b) => a.name.localeCompare(b.name));
    if (!recencyOrder || recencyOrder.length === 0) return alpha;
    const rank = new Map(recencyOrder.map((id, i) => [id, i]));
    return alpha.sort((a, b) => {
      const ra = rank.get(a.id) ?? Infinity;
      const rb = rank.get(b.id) ?? Infinity;
      return ra - rb || a.name.localeCompare(b.name);
    });
  }, [flowers, recencyOrder]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter((f) => f.name.toLowerCase().includes(q));
  }, [ranked, search]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search flowers…"
        placeholderTextColor={palette.textSecondary}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />
      <FlatList
        key={numColumns} // numColumns can't change on a mounted FlatList
        data={visible}
        keyExtractor={(f) => f.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const qty = quantities[item.id] ?? 0;
          const selected = qty > 0;
          const expanded = expandedId === item.id;
          return (
            <FlowerCard
              flower={item}
              qty={qty}
              selected={selected}
              expanded={expanded}
              onToggleExpand={() => setExpandedId(expanded ? null : item.id)}
              onSetQuantity={(n) => onSetQuantity(item.id, n)}
            />
          );
        }}
      />
    </View>
  );
}

function FlowerCard({
  flower,
  qty,
  selected,
  expanded,
  onToggleExpand,
  onSetQuantity,
}: {
  flower: Flower;
  qty: number;
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSetQuantity: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(qty || ''));

  const commitTyped = () => {
    const n = Math.max(0, Math.floor(Number(draft) || 0));
    onSetQuantity(n);
  };

  return (
    <Pressable
      onPress={onToggleExpand}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={2}>
          {flower.name}
        </Text>
        {selected && !expanded ? <Text style={styles.cardBadge}>{qty}</Text> : null}
      </View>

      {expanded ? (
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepBtn}
            onPress={() => {
              const n = Math.max(0, qty - 1);
              onSetQuantity(n);
              setDraft(String(n || ''));
            }}
          >
            <Text style={styles.stepBtnText}>–</Text>
          </Pressable>
          <TextInput
            style={styles.qtyInput}
            keyboardType="number-pad"
            value={draft}
            onChangeText={setDraft}
            onEndEditing={commitTyped}
            onBlur={commitTyped}
            placeholder="0"
            placeholderTextColor={palette.textSecondary}
          />
          <Pressable
            style={styles.stepBtn}
            onPress={() => {
              const n = qty + 1;
              onSetQuantity(n);
              setDraft(String(n));
            }}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.body,
    fontSize: fontSize.body,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
  grid: { paddingBottom: spacing.xl, gap: spacing.sm },
  row: { gap: spacing.sm },
  card: {
    flex: 1,
    // Signature pressed-botanical surface tint (SPEC §8).
    backgroundColor: palette.flowerCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 72,
  },
  cardSelected: { borderColor: palette.primary, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSize.body,
    color: palette.textPrimary,
  },
  cardBadge: {
    fontFamily: typography.body,
    fontSize: fontSize.body,
    fontWeight: '700',
    color: palette.primary,
    marginLeft: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, color: palette.primary, lineHeight: 24 },
  qtyInput: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.body,
    fontSize: fontSize.subtitle,
    color: palette.textPrimary,
    paddingVertical: spacing.xs,
  },
});
