// Shopping List row (SPEC §5.1). Names the flower, the deficit count, and the
// earliest order driving the need (for context). Tapping opens that Order Detail.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flowerName } from '@/data/flowers';
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
  customerName,
  dueDate,
  onPress,
}: {
  flowerId: string;
  deficit: number;
  customerName: string;
  dueDate: string;
  onPress: () => void;
}) {
  const styles = createStyles(useTheme());
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.headerLine}>
        <Text style={styles.name}>{flowerName(flowerId)}</Text>
        <Text style={styles.need}>need {deficit}</Text>
      </View>
      <Text style={styles.context}>
        for {customerName} · Due {formatDue(dueDate)}
      </Text>
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
    headerLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontFamily: typography.display, fontSize: fontSize.subtitle, color: theme.textPrimary },
    need: { fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700', color: theme.accent },
    context: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
}
