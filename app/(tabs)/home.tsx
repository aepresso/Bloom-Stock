// Home dashboard (flow redesign). The landing screen, built around the daily loop:
// check what needs buying → buy → stock it in. Greeting + global search + the two
// highest-frequency actions up top, then a "Needs buying" summary (shopping list),
// "Coming up" (soonest-due orders with fulfillment), and recent activity. Every card
// deep-links to the full screen it summarizes.

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/components/SearchBar';
import { flowerName } from '@/data/flowers';
import { deriveShoppingList, fulfillmentRatio } from '@/lib/allocation';
import { globalSearch } from '@/lib/search';
import { useStore } from '@/lib/store';
import { cardElevation, fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 🌿';
  if (h < 18) return 'Good afternoon 🌿';
  return 'Good evening 🌿';
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Days from today (local midnight) to an ISO due date; NaN-safe. */
function daysUntil(iso: string): number {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export default function HomeScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { orders, inventory, receipts, adjustments, hydrated } = useStore();
  const [query, setQuery] = useState('');

  const activeOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'active')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt.localeCompare(b.createdAt)),
    [orders]
  );
  const shopping = useMemo(() => deriveShoppingList(orders, inventory), [orders, inventory]);
  const results = useMemo(() => globalSearch(query, orders, receipts), [query, orders, receipts]);

  const totalDeficit = shopping.reduce((s, e) => s + e.deficit, 0);
  const upcoming = activeOrders.slice(0, 3);
  const lastReceipt = receipts.length > 0 ? receipts[0] : null;
  const lastAdjustment = adjustments.length > 0 ? adjustments[0] : null;

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const searching = query.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.greeting}>{greeting()}</Text>
      <Text style={styles.dateLine}>
        {dateLine} · {activeOrders.length} order{activeOrders.length === 1 ? '' : 's'} active
      </Text>

      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search orders, flowers, receipts…"
        />
      </View>

      {searching ? (
        <View style={styles.card}>
          {results.length === 0 ? (
            <Text style={styles.emptyText}>No matches.</Text>
          ) : (
            results.map((r) => {
              if (r.kind === 'order') {
                return (
                  <Pressable
                    key={`o-${r.order.id}`}
                    style={styles.resultRow}
                    onPress={() => router.push(`/order/${r.order.id}`)}
                  >
                    <Text style={styles.resultIcon}>📋</Text>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>{r.order.customerName}</Text>
                      <Text style={styles.rowMeta}>
                        {r.order.status === 'archived' ? 'Archived · ' : ''}Due {formatDue(r.order.dueDate)}
                      </Text>
                    </View>
                  </Pressable>
                );
              }
              if (r.kind === 'flower') {
                return (
                  <Pressable
                    key={`f-${r.flowerId}`}
                    style={styles.resultRow}
                    onPress={() => router.push('/inventory')}
                  >
                    <Text style={styles.resultIcon}>🌸</Text>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>{flowerName(r.flowerId)}</Text>
                      <Text style={styles.rowMeta}>View in Inventory</Text>
                    </View>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={`r-${r.receipt.id}`}
                  style={styles.resultRow}
                  onPress={() => router.push('/inventory?segment=receipts')}
                >
                  <Text style={styles.resultIcon}>🧾</Text>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName}>Receipt · {formatDue(r.receipt.submittedAt)}</Text>
                    <Text style={styles.rowMeta}>
                      {r.receipt.parsedItems.length} item
                      {r.receipt.parsedItems.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      ) : (
        <>
          {/* Quick actions */}
          <View style={styles.quickRow}>
            <Pressable
              style={[styles.quickBtn, styles.quickSolid]}
              onPress={() => router.push('/stock-in?action=scan')}
            >
              <Text style={styles.quickIcon}>📷</Text>
              <Text style={styles.quickSolidLabel}>Scan Receipt</Text>
            </Pressable>
            <Pressable
              style={[styles.quickBtn, styles.quickGhost]}
              onPress={() => router.push('/order/new')}
            >
              <Text style={styles.quickIcon}>📋</Text>
              <Text style={styles.quickGhostLabel}>New Order</Text>
            </Pressable>
          </View>

          {/* Needs buying */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>🛒 Needs buying</Text>
              <Pressable onPress={() => router.push('/shopping-list')} hitSlop={8}>
                <Text style={styles.cardLink}>Shopping list →</Text>
              </Pressable>
            </View>
            {!hydrated ? null : shopping.length === 0 ? (
              <Text style={styles.emptyText}>Nothing needed right now 🎉</Text>
            ) : (
              <>
                {shopping.slice(0, 3).map((e) => {
                  const urgent = daysUntil(e.earliestDueDate) <= 2;
                  return (
                    <Pressable
                      key={e.flowerId}
                      style={styles.itemRow}
                      onPress={() => router.push('/shopping-list')}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: urgent ? theme.danger : theme.warning },
                        ]}
                      />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowName}>{flowerName(e.flowerId)}</Text>
                        <Text style={styles.rowMeta}>
                          {e.demand.length > 1
                            ? `${e.demand.length} orders need these`
                            : `for ${e.demand[0]?.customerName ?? 'an order'} · due ${formatDue(e.earliestDueDate)}`}
                        </Text>
                      </View>
                      <Text style={styles.deficit}>−{e.deficit}</Text>
                    </Pressable>
                  );
                })}
                <Text style={styles.cardFootnote}>
                  {totalDeficit} stem{totalDeficit === 1 ? '' : 's'} short across {shopping.length}{' '}
                  flower{shopping.length === 1 ? '' : 's'}
                </Text>
              </>
            )}
          </View>

          {/* Coming up */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>📅 Coming up</Text>
              <Pressable onPress={() => router.push('/orders')} hitSlop={8}>
                <Text style={styles.cardLink}>All orders →</Text>
              </Pressable>
            </View>
            {!hydrated ? null : upcoming.length === 0 ? (
              <Text style={styles.emptyText}>No active orders.</Text>
            ) : (
              upcoming.map((o) => {
                const pct = Math.round(fulfillmentRatio(o) * 100);
                const ready = pct >= 100;
                const short = o.flowers.filter((f) => f.fulfilledQuantity < f.quantity).length;
                return (
                  <Pressable
                    key={o.id}
                    style={styles.itemRow}
                    onPress={() => router.push(`/order/${o.id}`)}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>{o.customerName}</Text>
                      <Text style={styles.rowMeta}>
                        {formatDue(o.dueDate)} · {pct}% supplied
                      </Text>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: ready ? theme.success : theme.warning,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={[styles.badge, ready ? styles.badgeOk : styles.badgeWarn]}>
                      <Text style={[styles.badgeText, ready ? styles.badgeTextOk : styles.badgeTextWarn]}>
                        {ready ? 'Ready' : `${short} short`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Recent activity */}
          {lastReceipt || lastAdjustment ? (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>🧾 Recent activity</Text>
              </View>
              {lastReceipt ? (
                <Pressable onPress={() => router.push('/inventory?segment=receipts')}>
                  <Text style={styles.rowMeta}>
                    {formatDue(lastReceipt.submittedAt)} · Receipt · {lastReceipt.parsedItems.length}{' '}
                    item{lastReceipt.parsedItems.length === 1 ? '' : 's'}
                  </Text>
                </Pressable>
              ) : null}
              {lastAdjustment ? (
                <Text style={[styles.rowMeta, { marginTop: spacing.xs }]}>
                  {formatDue(lastAdjustment.createdAt)} · Adjusted {flowerName(lastAdjustment.flowerId)}{' '}
                  {lastAdjustment.delta > 0 ? '+' : ''}
                  {lastAdjustment.delta} ({lastAdjustment.reason})
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    greeting: { fontFamily: typography.display, fontSize: fontSize.header, color: theme.textPrimary },
    dateLine: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: 2,
      marginBottom: spacing.md,
    },
    searchWrap: { marginBottom: spacing.xs },

    quickRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    quickBtn: {
      flex: 1,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
    },
    quickSolid: { backgroundColor: theme.primary },
    quickGhost: {
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      ...cardElevation(theme),
    },
    quickIcon: { fontSize: 22 },
    quickSolidLabel: { fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700', color: '#fff' },
    quickGhostLabel: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      fontWeight: '700',
      color: theme.primary,
    },

    card: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...cardElevation(theme),
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: spacing.sm,
    },
    cardTitle: { fontFamily: typography.body, fontSize: fontSize.subtitle, fontWeight: '700', color: theme.textPrimary },
    cardLink: { fontFamily: typography.body, fontSize: fontSize.caption, fontWeight: '600', color: theme.primary },
    cardFootnote: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },

    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    resultIcon: { fontSize: 18 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    rowBody: { flex: 1, minWidth: 0 },
    rowName: { fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '600', color: theme.textPrimary },
    rowMeta: { fontFamily: typography.body, fontSize: fontSize.caption, color: theme.textSecondary },
    deficit: { fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700', color: theme.accent },

    track: {
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.progressTrack,
      overflow: 'hidden',
      marginTop: spacing.xs,
    },
    fill: { height: '100%', borderRadius: 3 },

    badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
    badgeOk: { backgroundColor: theme.progressTrack },
    badgeWarn: { backgroundColor: theme.progressTrack },
    badgeText: { fontFamily: typography.body, fontSize: fontSize.caption, fontWeight: '700' },
    badgeTextOk: { color: theme.success },
    badgeTextWarn: { color: theme.accent },

    emptyText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },
  });
}
