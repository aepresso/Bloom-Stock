// Shopping List row (SPEC §5.1 + flow redesign). Names the flower, the deficit, and
// the earliest order driving the need. Tapping expands the row to show EVERY active
// order demanding this flower (needs X · has Y); tapping a line opens that order.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flowerName } from '@/data/flowers';
import type { DemandLine } from '@/lib/allocation';
import { cardElevation, fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ShoppingListRow({
  flowerId,
  deficit,
  demand,
  urgent,
  expanded,
  onToggle,
  onOpenOrder,
}: {
  flowerId: string;
  deficit: number;
  demand: DemandLine[];
  /** Earliest driving order is due within ~2 days. */
  urgent: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenOrder: (orderId: string) => void;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const earliest = demand[0];

  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <View style={styles.headerLine}>
        <View style={[styles.dot, { backgroundColor: urgent ? theme.danger : theme.warning }]} />
        <Text style={styles.name}>{flowerName(flowerId)}</Text>
        <Text style={styles.need}>−{deficit}</Text>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </View>
      <Text style={styles.context}>
        {demand.length > 1
          ? `${demand.length} orders · earliest ${earliest ? formatDue(earliest.dueDate) : ''}`
          : earliest
            ? `for ${earliest.customerName} · due ${formatDue(earliest.dueDate)}`
            : ''}
      </Text>

      {expanded ? (
        <View style={styles.expansion}>
          {demand.map((d) => (
            <Pressable key={d.orderId} style={styles.demandLine} onPress={() => onOpenOrder(d.orderId)}>
              <Text style={styles.demandName} numberOfLines={1}>
                {d.customerName} · {formatDue(d.dueDate)}
              </Text>
              <Text style={styles.demandMeta}>
                needs {d.quantity} · has {d.fulfilledQuantity}
              </Text>
            </Pressable>
          ))}
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
    headerLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4 },
    name: {
      flex: 1,
      fontFamily: typography.display,
      fontSize: fontSize.subtitle,
      color: theme.textPrimary,
    },
    need: { fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700', color: theme.accent },
    chevron: { fontSize: 14, color: theme.textSecondary },
    context: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: 2,
      marginLeft: 8 + spacing.sm,
    },
    expansion: {
      marginTop: spacing.sm,
      backgroundColor: theme.flowerCard,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    demandLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    demandName: {
      flex: 1,
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    demandMeta: { fontFamily: typography.body, fontSize: fontSize.caption, color: theme.textSecondary },
  });
}
