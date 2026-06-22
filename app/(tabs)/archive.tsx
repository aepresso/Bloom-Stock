// Archive screen (SPEC §5.6). Completed orders in the muted card palette, sorted by
// archivedAt descending, tapping into a read-only Order Detail (?readonly=1). Search
// is wired in US6 (T048).

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderCard } from '@/components/OrderCard';
import { SearchBar } from '@/components/SearchBar';
import { useOrders } from '@/hooks/useOrders';
import { filterOrders } from '@/lib/search';
import { fontSize, palette, spacing, typography } from '@/lib/theme';

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const { archivedOrders, hydrated } = useOrders();
  const [query, setQuery] = useState('');
  const visibleOrders = useMemo(() => filterOrders(archivedOrders, query), [archivedOrders, query]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Archive</Text>
      <SearchBar value={query} onChangeText={setQuery} />
      <FlatList
        data={visibleOrders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            muted
            onPress={() => router.push(`/order/${item.id}?readonly=1`)}
          />
        )}
        ListEmptyComponent={
          hydrated ? (
            <Text style={styles.empty}>
              {query ? 'No archived orders match your search.' : 'No archived orders.'}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background, paddingHorizontal: spacing.lg },
  title: {
    fontFamily: typography.display,
    fontSize: fontSize.header,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
  list: { paddingBottom: spacing.xl },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.body,
    color: palette.textSecondary,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
