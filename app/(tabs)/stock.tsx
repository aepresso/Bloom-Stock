// Stocking screen (SPEC §5.4). Scan (camera) or Upload (library, images only) →
// Claude reads the photo directly (no on-device OCR) → ReceiptConfirmSheet → Confirm
// → inventory update. ANY failure in the Claude path (no network, no API key, API
// error, malformed completion) falls back to manual entry via FlowerPickerGrid.
// Recent Receipts are read-only.

import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowerPickerGrid } from '@/components/FlowerPickerGrid';
import { ReceiptConfirmSheet, type ConfirmedLine } from '@/components/ReceiptConfirmSheet';
import { flowerName } from '@/data/flowers';
import { useInventory } from '@/hooks/useInventory';
import { useReceipts } from '@/hooks/useReceipts';
import { useRecencyOrder } from '@/hooks/useRecencyOrder';
import { parseReceiptFromImage } from '@/lib/claude';
import { persistImage } from '@/lib/images';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { ParsedReceiptItem, StockingReceipt } from '@/types';

type Pipeline =
  | { phase: 'idle' }
  | { phase: 'processing' }
  | { phase: 'confirm'; imageUri: string; items: ParsedReceiptItem[] }
  | { phase: 'manual'; imageUri: string };

export default function StockScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { confirmReceipt } = useInventory();
  const { recentReceipts } = useReceipts();
  const recencyOrder = useRecencyOrder();
  const { action } = useLocalSearchParams<{ action?: string }>();

  const [pipeline, setPipeline] = useState<Pipeline>({ phase: 'idle' });
  const [manualQuantities, setManualQuantities] = useState<Record<string, number>>({});
  const [viewing, setViewing] = useState<StockingReceipt | null>(null);

  const start = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;

    setPipeline({ phase: 'processing' });
    const imageUri = await persistImage(result.assets[0].uri);

    const parsed = await parseReceiptFromImage(imageUri);
    if (parsed.ok && parsed.items.length > 0) {
      setPipeline({ phase: 'confirm', imageUri, items: parsed.items });
    } else {
      // Any failure (or an empty parse) → manual entry fallback.
      setManualQuantities({});
      setPipeline({ phase: 'manual', imageUri });
    }
  };

  // Auto-launch the camera once when arriving from the FAB's Scan Receipt action.
  const scanTriggered = useRef(false);
  useEffect(() => {
    if (action === 'scan' && !scanTriggered.current) {
      scanTriggered.current = true;
      void start(true);
    }
  }, [action]);

  const onConfirmParsed = (lines: ConfirmedLine[]) => {
    if (pipeline.phase !== 'confirm') return;
    confirmReceipt({ imageUri: pipeline.imageUri, items: lines });
    setPipeline({ phase: 'idle' });
  };

  const onConfirmManual = () => {
    if (pipeline.phase !== 'manual') return;
    const items = Object.entries(manualQuantities)
      .filter(([, q]) => q > 0)
      .map(([flowerId, quantity]) => ({ flowerId, quantity })); // price omitted → defaults to lastPrice
    if (items.length === 0) {
      setPipeline({ phase: 'idle' });
      return;
    }
    confirmReceipt({ imageUri: pipeline.imageUri, items });
    setPipeline({ phase: 'idle' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Stock Inventory</Text>

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => start(true)}>
          <Text style={styles.actionText}>📷 Scan Receipt</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => start(false)}>
          <Text style={styles.actionText}>📁 Upload File</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => {
            setManualQuantities({});
            setPipeline({ phase: 'manual', imageUri: '' });
          }}
        >
          <Text style={styles.actionText}>✏️ Manual Entry</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent Receipts</Text>
      <FlatList
        data={recentReceipts}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.receiptRow} onPress={() => setViewing(item)}>
            <Text style={styles.receiptText}>
              {new Date(item.submittedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}{' '}
              · {item.parsedItems.length} item{item.parsedItems.length === 1 ? '' : 's'}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No receipts yet.</Text>}
      />

      {/* Processing overlay */}
      <Modal visible={pipeline.phase === 'processing'} transparent animationType="fade">
        <View style={styles.processingBackdrop}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.processingText}>Reading receipt…</Text>
        </View>
      </Modal>

      {/* Parsed-items confirmation */}
      {pipeline.phase === 'confirm' ? (
        <ReceiptConfirmSheet
          visible
          items={pipeline.items}
          onCancel={() => setPipeline({ phase: 'idle' })}
          onConfirm={onConfirmParsed}
        />
      ) : null}

      {/* Manual-entry fallback */}
      <Modal
        visible={pipeline.phase === 'manual'}
        animationType="slide"
        onRequestClose={() => setPipeline({ phase: 'idle' })}
      >
        <View style={[styles.manualRoot, { paddingTop: insets.top + spacing.lg }]}>
          <Text style={styles.title}>Manual Entry</Text>
          <Text style={styles.manualHint}>
            Add the flowers you bought. Price defaults to each flower&apos;s last recorded price.
          </Text>
          <View style={styles.manualGrid}>
            <FlowerPickerGrid
              quantities={manualQuantities}
              recencyOrder={recencyOrder}
              onSetQuantity={(flowerId, quantity) =>
                setManualQuantities((prev) => {
                  const next = { ...prev };
                  if (quantity > 0) next[flowerId] = quantity;
                  else delete next[flowerId];
                  return next;
                })
              }
            />
          </View>
          <View style={styles.footer}>
            <Pressable style={styles.sheetCancel} onPress={() => setPipeline({ phase: 'idle' })}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={onConfirmManual}>
              <Text style={styles.confirmText}>Confirm → Update Inventory</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Read-only past receipt */}
      <Modal
        visible={viewing !== null}
        animationType="slide"
        onRequestClose={() => setViewing(null)}
      >
        <ScrollView contentContainerStyle={[styles.viewerScroll, { paddingTop: insets.top + spacing.lg }]}>
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
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, paddingHorizontal: spacing.lg },
    title: { fontFamily: typography.display, fontSize: fontSize.header, color: theme.textPrimary },
    actions: { gap: spacing.md, marginTop: spacing.lg },
    actionBtn: {
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    actionText: { fontFamily: typography.body, fontSize: fontSize.subtitle, color: theme.primary },
    sectionTitle: {
      fontFamily: typography.display,
      fontSize: fontSize.title,
      color: theme.textPrimary,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    list: { paddingBottom: spacing.xl, gap: spacing.sm },
    receiptRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    receiptText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textPrimary },
    empty: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },
    processingBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    processingText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body },
    manualRoot: { flex: 1, backgroundColor: theme.background, paddingHorizontal: spacing.lg },
    manualHint: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: spacing.sm,
    },
    manualGrid: { flex: 1, marginTop: spacing.md },
    footer: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    sheetCancel: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, justifyContent: 'center' },
    sheetCancelText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },
    confirmBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    confirmText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700' },
    viewerScroll: { padding: spacing.lg },
    viewerLine: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
  });
}
