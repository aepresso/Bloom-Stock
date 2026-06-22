// Archive screen (SPEC §5.6). Completed orders in the muted card palette, sorted by
// archivedAt descending, tapping into a read-only Order Detail (?readonly=1). Search
// is wired in US6 (T048).
//
// 002-ui-redesign: lives as a top-level modal route (pushed from Orders via a header
// icon button) rather than a permanent tab — see app/_layout.tsx for the modal
// presentation registration.

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/OrderCard';
import { SearchBar } from '@/components/SearchBar';
import { useOrders } from '@/hooks/useOrders';
import { filterOrders } from '@/lib/search';
import { fontSize, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export default function ArchiveScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { archivedOrders, hydrated } = useOrders();
  const [query, setQuery] = useState('');
  const visibleOrders = useMemo(() => filterOrders(archivedOrders, query), [archivedOrders, query]);

  return (
    <View style={[styles.container, { paddingTop: spacing.lg }]}>
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
