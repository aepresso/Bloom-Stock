// Inventory row (SPEC §5.5). On hand / spoken for / available with a usage bar, last
// price + unit + date, a ⚠️ badge when fully allocated against live demand, and a
// pencil to open the manual-adjust sheet. Flow redesign: tapping the row expands it
// to show which active orders its allocated stems are committed to.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flowerName } from '@/data/flowers';
import type { InventoryRowData } from '@/hooks/useInventory';
import type { DemandLine } from '@/lib/allocation';
import { cardElevation, fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function InventoryRow({
  item,
  onAdjust,
  expanded,
  onToggle,
  allocations,
  onOpenOrder,
}: {
  item: InventoryRowData;
  onAdjust: () => void;
  expanded: boolean;
  onToggle: () => void;
  /** Active orders this flower's stems are committed to, soonest-due first. */
  allocations: DemandLine[];
  onOpenOrder: (orderId: string) => void;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const fullyAllocated = item.availableStock === 0 && item.hasUnmetDemand;
  const usedPct =
    item.totalStock > 0 ? Math.round((item.allocatedStock / item.totalStock) * 100) : 0;
  const date = formatDate(item.lastReceiptDate);

  return (
    <Pressable style={[styles.row, fullyAllocated && styles.rowWarn]} onPress={onToggle}>
      <View style={styles.headerLine}>
        <Text style={styles.name}>{flowerName(item.flowerId)}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onAdjust} hitSlop={8}>
            <Text style={styles.pencil}>✏️</Text>
          </Pressable>
          <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
        </View>
      </View>

      <Text style={styles.stats}>
        On hand: {item.totalStock} · Spoken for: {item.allocatedStock}
      </Text>

      <View style={styles.barRow}>
        <Text style={styles.available}>Available: {item.availableStock}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${usedPct}%` }, fullyAllocated && styles.fillWarn]} />
        </View>
      </View>

      <Text style={styles.price}>
        {item.lastPrice != null
          ? `Last price: $${item.lastPrice.toFixed(2)}/${item.lastPriceUnit ?? 'stem'}${
              date ? ` (${date})` : ''
            }`
          : 'No price data'}
      </Text>

      {fullyAllocated ? <Text style={styles.warnBadge}>⚠️ Fully allocated</Text> : null}

      {expanded ? (
        <View style={styles.expansion}>
          {allocations.length === 0 ? (
            <Text style={styles.allocMeta}>No active orders need this flower.</Text>
          ) : (
            allocations.map((a) => (
              <Pressable
                key={a.orderId}
                style={styles.allocLine}
                onPress={() => onOpenOrder(a.orderId)}
              >
                <Text style={styles.allocName} numberOfLines={1}>
                  → {a.customerName}
                </Text>
                <Text style={styles.allocMeta}>
                  {a.fulfilledQuantity} of {a.quantity} allocated
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    row: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...cardElevation(theme),
    },
    rowWarn: { borderColor: theme.warning, borderWidth: 1.5 },
    headerLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { fontFamily: typography.display, fontSize: fontSize.subtitle, color: theme.textPrimary },
    pencil: { fontSize: 18 },
    chevron: { fontSize: 14, color: theme.textSecondary },
    expansion: {
      marginTop: spacing.sm,
      backgroundColor: theme.flowerCard,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    allocLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    allocName: {
      flex: 1,
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    allocMeta: { fontFamily: typography.body, fontSize: fontSize.caption, color: theme.textSecondary },
    stats: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    available: { fontFamily: typography.body, fontSize: fontSize.caption, color: theme.textPrimary, minWidth: 92 },
    track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.progressTrack, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: theme.primary },
    fillWarn: { backgroundColor: theme.warning },
    price: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: spacing.sm,
    },
    warnBadge: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.warning,
      fontWeight: '700',
      marginTop: spacing.xs,
    },
  });
}
