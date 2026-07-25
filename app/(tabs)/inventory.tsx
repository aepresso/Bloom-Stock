// Inventory screen (SPEC §5.5 + flow redesign). Two segments: Stock (inventory rows,
// sorted fully-allocated-first, expandable to show which orders each flower's stems
// are committed to) and Receipts (stocking history, moved here when the Stock tab was
// dissolved). The pencil opens the manual-adjust sheet: a signed stem delta plus a
// required reason appended to the InventoryAdjustment audit log.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InventoryRow } from '@/components/InventoryRow';
import { flowerName } from '@/data/flowers';
import { useInventory } from '@/hooks/useInventory';
import { useReceipts } from '@/hooks/useReceipts';
import { allocationsForFlower } from '@/lib/allocation';
import { useStore } from '@/lib/store';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { StockingReceipt } from '@/types';

type Segment = 'stock' | 'receipts';

export default function InventoryScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { rows, hydrated, adjustInventory } = useInventory();
  const { recentReceipts } = useReceipts();
  const { orders } = useStore();
  const params = useLocalSearchParams<{ segment?: string }>();

  const [segment, setSegment] = useState<Segment>('stock');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<StockingReceipt | null>(null);

  const [adjustFlowerId, setAdjustFlowerId] = useState<string | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  // Deep links (Home activity/search) can land on the Receipts segment directly.
  // State adjustment happens during render (React's sanctioned pattern); the effect
  // only clears the consumed param so a later manual segment switch sticks.
  if (params.segment === 'receipts' && segment !== 'receipts') {
    setSegment('receipts');
  }
  useEffect(() => {
    if (params.segment === 'receipts') router.setParams({ segment: undefined });
  }, [params.segment]);

  const closeSheet = () => {
    setAdjustFlowerId(null);
    setDelta('');
    setReason('');
  };

  const submitAdjust = () => {
    const d = Math.floor(Number(delta) || 0);
    if (!adjustFlowerId || d === 0 || reason.trim() === '') return;
    adjustInventory(adjustFlowerId, d, reason.trim());
    closeSheet();
  };

  const canSubmit = Math.floor(Number(delta) || 0) !== 0 && reason.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Inventory</Text>

      <View style={styles.seg}>
        {(['stock', 'receipts'] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.segBtn, segment === s && styles.segBtnOn]}
            onPress={() => setSegment(s)}
          >
            <Text style={[styles.segText, segment === s && styles.segTextOn]}>
              {s === 'stock' ? 'Stock' : 'Receipts'}
            </Text>
          </Pressable>
        ))}
      </View>

      {segment === 'stock' ? (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.flowerId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <InventoryRow
              item={item}
              expanded={expandedId === item.flowerId}
              onToggle={() =>
                setExpandedId((cur) => (cur === item.flowerId ? null : item.flowerId))
              }
              allocations={allocationsForFlower(item.flowerId, orders)}
              onOpenOrder={(orderId) => router.push(`/order/${orderId}`)}
              onAdjust={() => setAdjustFlowerId(item.flowerId)}
            />
          )}
          ListEmptyComponent={
            hydrated ? <Text style={styles.empty}>No stock recorded yet.</Text> : null
          }
        />
      ) : (
        <FlatList
          data={recentReceipts}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.receiptRow} onPress={() => setViewing(item)}>
              <Text style={styles.receiptDate}>
                {new Date(item.submittedAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.receiptMeta}>
                {item.parsedItems.length} item{item.parsedItems.length === 1 ? '' : 's'}
                {' · '}
                {item.parsedItems
                  .filter((it) => it.matchedFlowerId)
                  .slice(0, 3)
                  .map((it) => flowerName(it.matchedFlowerId!))
                  .join(', ') || 'no matched flowers'}
                {item.parsedItems.length > 3 ? '…' : ''}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            hydrated ? (
              <Text style={styles.empty}>
                No receipts yet. Stock in a purchase from Home and it lands here.
              </Text>
            ) : null
          }
        />
      )}

      {/* Read-only past receipt */}
      <Modal visible={viewing !== null} animationType="slide" onRequestClose={() => setViewing(null)}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[styles.viewerScroll, { paddingTop: insets.top + spacing.lg }]}
        >
          <Text style={styles.title}>Receipt</Text>
          {viewing?.parsedItems.map((it, i) => (
            <Text key={i} style={styles.viewerLine}>
              {it.matchedFlowerId ? flowerName(it.matchedFlowerId) : it.rawText || 'Unmatched'} ×{' '}
              {it.quantity}
              {it.price != null ? ` · $${it.price.toFixed(2)}/${it.priceUnit ?? 'stem'}` : ''}
            </Text>
          ))}
          <Pressable style={styles.sheetCancel} onPress={() => setViewing(null)}>
            <Text style={styles.sheetCancelText}>Close</Text>
          </Pressable>
        </ScrollView>
      </Modal>

      {/* Manual-adjust sheet */}
      <Modal
        visible={adjustFlowerId !== null}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.sheetTitle}>
              Adjust {adjustFlowerId ? flowerName(adjustFlowerId) : ''}
            </Text>
            <Text style={styles.fieldLabel}>Change (stems, + or −)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              placeholder="e.g. -6"
              placeholderTextColor={theme.textSecondary}
              value={delta}
              onChangeText={setDelta}
            />
            <Text style={styles.fieldLabel}>Reason (required)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. damaged stems"
              placeholderTextColor={theme.textSecondary}
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.sheetButtons}>
              <Pressable style={styles.sheetCancel} onPress={closeSheet}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetSave, !canSubmit && styles.sheetSaveDisabled]}
                onPress={submitAdjust}
                disabled={!canSubmit}
              >
                <Text style={styles.sheetSaveText}>Save Adjustment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      marginBottom: spacing.md,
    },
    seg: {
      flexDirection: 'row',
      backgroundColor: theme.progressTrack,
      borderRadius: radius.md,
      padding: 3,
      marginBottom: spacing.md,
    },
    segBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
    segBtnOn: { backgroundColor: theme.surface },
    segText: { fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '600', color: theme.textSecondary },
    segTextOn: { color: theme.textPrimary },
    list: { paddingBottom: spacing.xl },
    empty: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textSecondary,
      marginTop: spacing.xl,
      textAlign: 'center',
    },
    receiptRow: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    receiptDate: { fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '600', color: theme.textPrimary },
    receiptMeta: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
    viewerScroll: { padding: spacing.lg },
    viewerLine: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
    },
    sheetTitle: {
      fontFamily: typography.display,
      fontSize: fontSize.title,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    fieldLabel: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: theme.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
    },
    sheetButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    sheetCancel: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, justifyContent: 'center' },
    sheetCancelText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },
    sheetSave: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    sheetSaveDisabled: { backgroundColor: theme.progressTrack },
    sheetSaveText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700' },
  });
}
