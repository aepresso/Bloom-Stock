// Shared flower picker (SPEC §5.3). Search bar + grid; tapping a card expands it
// *in place* (no sheet) to reveal a − [qty] + stepper with tap-to-type entry.
// Selected cards show their chosen count. Used by the New Order wizard, Order Detail
// editing, and the manual receipt-entry fallback — one component, three call sites.
//
// Default ordering is alphabetical; pass `recencyOrder` (a list of flowerIds, most-
// used first) to switch to the recency-weighted sort (US8). Search always overrides
// the ranking while the user is typing.

import { useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Reanimated, { Layout } from 'react-native-reanimated';

import { FLOWERS } from '@/data/flowers';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
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
  const theme = useTheme();
  const styles = createStyles(theme);
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
        placeholderTextColor={theme.textSecondary}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />
      <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          {visible.map((item) => {
            const qty = quantities[item.id] ?? 0;
            const selected = qty > 0;
            const expanded = expandedId === item.id;
            return (
              <FlowerCard
                key={item.id}
                flower={item}
                qty={qty}
                selected={selected}
                expanded={expanded}
                onToggleExpand={() => setExpandedId(expanded ? null : item.id)}
                onSetQuantity={(n) => onSetQuantity(item.id, n)}
              />
            );
          })}
        </View>
      </ScrollView>
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
  const theme = useTheme();
  const styles = createStyles(theme);
  const [draft, setDraft] = useState(String(qty || ''));
  const [scale] = useState(() => new Animated.Value(1));

  const commitTyped = () => {
    const n = Math.max(0, Math.floor(Number(draft) || 0));
    onSetQuantity(n);
  };

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };

  return (
    <Reanimated.View
      layout={Layout.duration(200)}
      style={[styles.card, selected && styles.cardSelected, expanded && styles.cardExpanded]}
    >
      <Pressable
        onPress={onToggleExpand}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [styles.cardHeader, pressed && styles.cardHeaderPressed]}
      >
        <Animated.View style={[styles.cardHeaderInner, { transform: [{ scale }] }]}>
          <Text style={styles.cardName} numberOfLines={2}>
            {flower.name}
          </Text>
          {selected && !expanded ? <Text style={styles.cardBadge}>{qty}</Text> : null}
        </Animated.View>
      </Pressable>

      {expanded ? (
        <View style={styles.stepper}>
          <Pressable
            hitSlop={8}
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
            placeholderTextColor={theme.textSecondary}
          />
          <Pressable
            hitSlop={8}
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
    </Reanimated.View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1 },
    search: {
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    grid: { paddingBottom: spacing.xl },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.md,
      columnGap: spacing.sm,
    },
    card: {
      minWidth: 160,
      flexGrow: 1,
      flexBasis: 160,
      // Signature pressed-botanical surface tint (SPEC §8).
      backgroundColor: theme.flowerCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: radius.lg,
      padding: spacing.md + spacing.xs,
      minHeight: 72,
    },
    cardExpanded: {
      flexBasis: '100%',
      minWidth: '100%',
    },
    cardSelected: { borderColor: theme.primary, borderWidth: 1.5 },
    cardHeader: { flexDirection: 'row' },
    cardHeaderPressed: { opacity: 0.85 },
    cardHeaderInner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flex: 1,
      marginTop: spacing.xs,
      marginLeft: spacing.xs,
    },
    cardName: {
      flex: 1,
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
    },
    cardBadge: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      fontWeight: '700',
      color: theme.primary,
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
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { fontSize: 22, color: theme.primary, lineHeight: 24 },
    qtyInput: {
      flex: 1,
      textAlign: 'center',
      fontFamily: typography.body,
      fontSize: fontSize.subtitle,
      color: theme.textPrimary,
      paddingVertical: spacing.xs,
    },
  });
}
