// Orders list (SPEC §5.2). Active orders sorted soonest-due-first, each an OrderCard
// with swipe-right to Cancel (T022) and swipe-left to Mark Delivered (US5/T044).
// `[+]` opens the New Order wizard. Search is wired in US6 (T047).

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderCard } from '@/components/OrderCard';
import { SearchBar } from '@/components/SearchBar';
import { useOrders } from '@/hooks/useOrders';
import { deleteImage } from '@/lib/images';
import { filterOrders } from '@/lib/search';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { Order } from '@/types';

export default function OrdersScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { activeOrders, hydrated, deleteOrder, archiveOrder } = useOrders();
  const [query, setQuery] = useState('');
  const visibleOrders = useMemo(() => filterOrders(activeOrders, query), [activeOrders, query]);

  const confirmCancel = (order: Order) =>
    Alert.alert('Cancel Order', `Permanently delete ${order.customerName}'s order?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: () => {
          deleteOrder(order.id);
          void deleteImage(order.referencePhotoUri);
        },
      },
    ]);

  const confirmDeliver = (order: Order) => {
    const pct = Math.round(
      (order.flowers.reduce((s, f) => s + f.fulfilledQuantity, 0) /
        Math.max(1, order.flowers.reduce((s, f) => s + f.quantity, 0))) *
        100
    );
    if (pct < 100) {
      Alert.alert(
        'Mark Delivered',
        `This order is only ${pct}% supplied — mark delivered anyway?`,
        [
          { text: 'Not yet', style: 'cancel' },
          { text: 'Mark Delivered', onPress: () => archiveOrder(order.id) },
        ]
      );
    } else {
      archiveOrder(order.id);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.archiveBtn} onPress={() => router.push('/archive')} hitSlop={8}>
            <Text style={styles.archiveBtnText}>🗄</Text>
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => router.push('/order/new')} hitSlop={8}>
            <Text style={styles.addBtnText}>＋</Text>
          </Pressable>
        </View>
      </View>

      <SearchBar value={query} onChangeText={setQuery} />

      <FlatList
        data={visibleOrders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => router.push(`/order/${item.id}`)}
            onCancel={() => confirmCancel(item)}
            onMarkDelivered={() => confirmDeliver(item)}
          />
        )}
        ListEmptyComponent={
          hydrated ? (
            <Text style={styles.empty}>
              {query ? 'No orders match your search.' : 'No active orders. Tap ＋ to create one.'}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    title: { fontFamily: typography.display, fontSize: fontSize.header, color: theme.textPrimary },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.xl,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: { color: '#fff', fontSize: 24, lineHeight: 26 },
    archiveBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.xl,
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    archiveBtnText: { fontSize: 20 },
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
