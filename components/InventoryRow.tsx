// Inventory row (SPEC §5.5). On hand / spoken for / available with a usage bar, last
// price + unit + date, a ⚠️ badge when fully allocated against live demand, and a
// pencil to open the manual-adjust sheet.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flowerName } from '@/data/flowers';
import type { InventoryRowData } from '@/hooks/useInventory';
import { fontSize, palette, radius, spacing, typography } from '@/lib/theme';

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function InventoryRow({
  item,
  onAdjust,
}: {
  item: InventoryRowData;
  onAdjust: () => void;
}) {
  const fullyAllocated = item.availableStock === 0 && item.hasUnmetDemand;
  const usedPct =
    item.totalStock > 0 ? Math.round((item.allocatedStock / item.totalStock) * 100) : 0;
  const date = formatDate(item.lastReceiptDate);

  return (
    <View style={[styles.row, fullyAllocated && styles.rowWarn]}>
      <View style={styles.headerLine}>
        <Text style={styles.name}>{flowerName(item.flowerId)}</Text>
        <Pressable onPress={onAdjust} hitSlop={8}>
          <Text style={styles.pencil}>✏️</Text>
        </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rowWarn: { borderColor: palette.warning, borderWidth: 1.5 },
  headerLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: typography.display, fontSize: fontSize.subtitle, color: palette.textPrimary },
  pencil: { fontSize: 18 },
  stats: {
    fontFamily: typography.body,
    fontSize: fontSize.caption,
    color: palette.textSecondary,
    marginTop: 2,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  available: { fontFamily: typography.body, fontSize: fontSize.caption, color: palette.textPrimary, minWidth: 92 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: palette.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: palette.primary },
  fillWarn: { backgroundColor: palette.warning },
  price: {
    fontFamily: typography.body,
    fontSize: fontSize.caption,
    color: palette.textSecondary,
    marginTop: spacing.sm,
  },
  warnBadge: {
    fontFamily: typography.body,
    fontSize: fontSize.caption,
    color: palette.accent,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
