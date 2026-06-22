// Shopping List screen (SPEC §5.1). A purely derived view: flowers whose summed
// demand across active orders exceeds totalStock, sorted by urgency (earliest due).
// Tapping a row jumps to the order driving the shortfall.

import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShoppingListRow } from '@/components/ShoppingListRow';
import { deriveShoppingList } from '@/lib/allocation';
import { useStore } from '@/lib/store';
import { fontSize, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export default function ShoppingListScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { orders, inventory, hydrated } = useStore();

  const entries = useMemo(() => deriveShoppingList(orders, inventory), [orders, inventory]);
  const nameOf = useMemo(
    () => new Map(orders.map((o) => [o.id, o.customerName])),
    [orders]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Shopping List</Text>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.flowerId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ShoppingListRow
            flowerId={item.flowerId}
            deficit={item.deficit}
            customerName={nameOf.get(item.earliestOrderId) ?? 'an order'}
            dueDate={item.earliestDueDate}
            onPress={() => router.push(`/order/${item.earliestOrderId}`)}
          />
        )}
        ListEmptyComponent={
          hydrated ? <Text style={styles.empty}>Nothing needed right now</Text> : null
        }
      />
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, paddingHorizontal: spacing.lg },
    title: {
      fontFamily: typography.display,
      fontSize: fontSize.header,
      color: theme.textPrimary,
      marginBottom: spacing.lg,
    },
    list: { paddingBottom: spacing.xl, gap: spacing.sm },
    empty: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textSecondary,
      marginTop: spacing.xl,
      textAlign: 'center',
    },
  });
}
