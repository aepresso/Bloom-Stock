// Shopping List screen (SPEC §5.1 + flow redesign). A purely derived view: flowers
// whose summed demand across active orders exceeds totalStock, sorted by urgency.
// Rows expand to show every order driving the shortfall. "Start shopping run" flips
// the screen into run mode — check off flowers as you buy them, then "Done" hands the
// checked items straight to the Stock-In manual entry, pre-filled with the deficits,
// closing the buy → stock loop in one flow.

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShoppingListRow } from '@/components/ShoppingListRow';
import { flowerName } from '@/data/flowers';
import { deriveShoppingList } from '@/lib/allocation';
import { useStore } from '@/lib/store';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

/** Days from today (local midnight) to an ISO due date; NaN-safe. */
function daysUntil(iso: string): number {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export default function ShoppingListScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { orders, inventory, hydrated } = useStore();

  const entries = useMemo(() => deriveShoppingList(orders, inventory), [orders, inventory]);
  const totalDeficit = entries.reduce((s, e) => s + e.deficit, 0);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  // null = normal list; a Set = run mode with these flowerIds checked off.
  const [checked, setChecked] = useState<Set<string> | null>(null);
  const running = checked !== null;

  const startRun = () => setChecked(new Set());
  const cancelRun = () => setChecked(null);
  const toggleChecked = (flowerId: string) =>
    setChecked((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(flowerId)) next.delete(flowerId);
      else next.add(flowerId);
      return next;
    });

  const finishRun = () => {
    if (!checked || checked.size === 0) {
      setChecked(null);
      return;
    }
    const prefill: Record<string, number> = {};
    for (const e of entries) if (checked.has(e.flowerId)) prefill[e.flowerId] = e.deficit;
    setChecked(null);
    router.push({
      pathname: '/stock-in',
      params: { action: 'manual', prefill: JSON.stringify(prefill) },
    });
  };

  if (running) {
    const done = entries.filter((e) => checked.has(e.flowerId)).length;
    const pct = entries.length > 0 ? Math.round((done / entries.length) * 100) : 0;
    return (
      <View style={styles.container}>
        <View style={[styles.runHeader, { paddingTop: insets.top + spacing.lg }]}>
          <Text style={styles.runTitle}>Shopping run</Text>
          <Text style={styles.runSub}>
            {done} of {entries.length} picked up · tap as you buy
          </Text>
          <View style={styles.runTrack}>
            <View style={[styles.runFill, { width: `${pct}%` }]} />
          </View>
        </View>

        <FlatList
          data={entries}
          keyExtractor={(e) => e.flowerId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isChecked = checked.has(item.flowerId);
            return (
              <Pressable style={styles.runRow} onPress={() => toggleChecked(item.flowerId)}>
                <View style={[styles.checkCircle, isChecked && styles.checkCircleOn]}>
                  {isChecked ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <View style={styles.runRowBody}>
                  <Text style={[styles.runRowName, isChecked && styles.runRowNameDone]}>
                    {flowerName(item.flowerId)}
                  </Text>
                  <Text style={styles.runRowMeta}>
                    {isChecked ? `got ${item.deficit}` : `need ${item.deficit} stems`}
                  </Text>
                </View>
                {!isChecked ? <Text style={styles.runRowQty}>{item.deficit}</Text> : null}
              </Pressable>
            );
          }}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable style={styles.cancelBtn} onPress={cancelRun}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.bigBtn, checked.size === 0 && styles.bigBtnDisabled]}
            onPress={finishRun}
            disabled={checked.size === 0}
          >
            <Text style={styles.bigBtnText}>Done — stock these in →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.pad}>
        <Text style={styles.title}>Shopping List</Text>
        {entries.length > 0 ? (
          <Text style={styles.subtitle}>
            {entries.length} flower{entries.length === 1 ? '' : 's'} · {totalDeficit} stem
            {totalDeficit === 1 ? '' : 's'} short
          </Text>
        ) : null}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.flowerId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ShoppingListRow
            flowerId={item.flowerId}
            deficit={item.deficit}
            demand={item.demand}
            urgent={daysUntil(item.earliestDueDate) <= 2}
            expanded={expandedId === item.flowerId}
            onToggle={() =>
              setExpandedId((cur) => (cur === item.flowerId ? null : item.flowerId))
            }
            onOpenOrder={(orderId) => router.push(`/order/${orderId}`)}
          />
        )}
        ListEmptyComponent={
          hydrated ? <Text style={styles.empty}>Nothing needed right now</Text> : null
        }
      />

      {entries.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable style={styles.bigBtn} onPress={startRun}>
            <Text style={styles.bigBtnText}>🛍 Start shopping run</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    pad: { paddingHorizontal: spacing.lg },
    title: { fontFamily: typography.display, fontSize: fontSize.header, color: theme.textPrimary },
    subtitle: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.sm },
    empty: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textSecondary,
      marginTop: spacing.xl,
      textAlign: 'center',
    },

    footer: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    bigBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    bigBtnDisabled: { backgroundColor: theme.progressTrack },
    bigBtnText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700' },
    cancelBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
    cancelText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },

    runHeader: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
    runTitle: { fontFamily: typography.display, fontSize: fontSize.header, color: '#fff' },
    runSub: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    runTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    runFill: { height: '100%', borderRadius: 3, backgroundColor: '#fff' },

    runRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    checkCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircleOn: { backgroundColor: theme.success, borderColor: theme.success },
    checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
    runRowBody: { flex: 1, minWidth: 0 },
    runRowName: { fontFamily: typography.body, fontSize: fontSize.subtitle, fontWeight: '600', color: theme.textPrimary },
    runRowNameDone: { textDecorationLine: 'line-through', color: theme.textSecondary },
    runRowMeta: { fontFamily: typography.body, fontSize: fontSize.caption, color: theme.textSecondary },
    runRowQty: { fontFamily: typography.body, fontSize: fontSize.subtitle, fontWeight: '700', color: theme.accent },
  });
}
