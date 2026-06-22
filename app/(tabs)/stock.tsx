// Stocking screen (SPEC §5.4). Scan (camera) or Upload (library, images only) →
// on-device Vision OCR → Claude interpretation → ReceiptConfirmSheet → Confirm →
// inventory update. ANY failure in the OCR/Claude path (no native module, no network,
// API error, malformed completion) falls back to manual entry via FlowerPickerGrid,
// still showing whatever OCR text was captured. Recent Receipts are read-only.

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
import { parseReceipt } from '@/lib/claude';
import { persistImage } from '@/lib/images';
import { extractReceiptText } from '@/lib/ocr';
import { fontSize, palette, radius, spacing, typography } from '@/lib/theme';
import type { ParsedReceiptItem, StockingReceipt } from '@/types';

type Pipeline =
  | { phase: 'idle' }
  | { phase: 'processing' }
  | { phase: 'confirm'; imageUri: string; rawOcrText: string; items: ParsedReceiptItem[] }
  | { phase: 'manual'; imageUri: string; rawOcrText: string };

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const { confirmReceipt } = useInventory();
  const { recentReceipts } = useReceipts();
  const recencyOrder = useRecencyOrder();

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

    // OCR is captured regardless of the API call's success (data-model.md).
    let rawOcrText = '';
    try {
      rawOcrText = await extractReceiptText(imageUri);
    } catch {
      rawOcrText = '';
    }

    const parsed = await parseReceipt(rawOcrText);
    if (parsed.ok && parsed.items.length > 0) {
      setPipeline({ phase: 'confirm', imageUri, rawOcrText, items: parsed.items });
    } else {
      // Any failure (or an empty parse) → manual entry fallback.
      setManualQuantities({});
      setPipeline({ phase: 'manual', imageUri, rawOcrText });
    }
  };

  const onConfirmParsed = (lines: ConfirmedLine[]) => {
    if (pipeline.phase !== 'confirm') return;
    confirmReceipt({ imageUri: pipeline.imageUri, rawOcrText: pipeline.rawOcrText, items: lines });
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
    confirmReceipt({ imageUri: pipeline.imageUri, rawOcrText: pipeline.rawOcrText, items });
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
          <ActivityIndicator color={palette.primary} size="large" />
          <Text style={styles.processingText}>Reading receipt…</Text>
        </View>
      </Modal>

      {/* Parsed-items confirmation */}
      {pipeline.phase === 'confirm' ? (
        <ReceiptConfirmSheet
          visible
          rawOcrText={pipeline.rawOcrText}
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
            Couldn&apos;t auto-read this receipt — add the flowers you bought. Price defaults to
            each flower&apos;s last recorded price.
          </Text>
          {pipeline.phase === 'manual' && pipeline.rawOcrText ? (
            <Text style={styles.manualOcr} numberOfLines={3}>
              {pipeline.rawOcrText}
            </Text>
          ) : null}
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
          {viewing?.rawOcrText ? (
            <>
              <Text style={styles.sectionTitle}>OCR text</Text>
              <Text style={styles.manualOcr}>{viewing.rawOcrText}</Text>
            </>
          ) : null}
          <Pressable style={styles.sheetCancel} onPress={() => setViewing(null)}>
            <Text style={styles.sheetCancelText}>Close</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background, paddingHorizontal: spacing.lg },
  title: { fontFamily: typography.display, fontSize: fontSize.header, color: palette.textPrimary },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  actionBtn: {
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  actionText: { fontFamily: typography.body, fontSize: fontSize.subtitle, color: palette.primary },
  sectionTitle: {
    fontFamily: typography.display,
    fontSize: fontSize.title,
    color: palette.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: { paddingBottom: spacing.xl },
  receiptRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  receiptText: { fontFamily: typography.body, fontSize: fontSize.body, color: palette.textPrimary },
  empty: { fontFamily: typography.body, fontSize: fontSize.body, color: palette.textSecondary },
  processingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  processingText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body },
  manualRoot: { flex: 1, backgroundColor: palette.background, paddingHorizontal: spacing.lg },
  manualHint: {
    fontFamily: typography.body,
    fontSize: fontSize.caption,
    color: palette.textSecondary,
    marginTop: spacing.sm,
  },
  manualOcr: {
    fontFamily: typography.body,
    fontSize: fontSize.caption,
    color: palette.textSecondary,
    marginTop: spacing.sm,
  },
  manualGrid: { flex: 1, marginTop: spacing.md },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  sheetCancel: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  sheetCancelText: { fontFamily: typography.body, fontSize: fontSize.body, color: palette.textSecondary },
  confirmBtn: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700' },
  viewerScroll: { padding: spacing.lg },
  viewerLine: {
    fontFamily: typography.body,
    fontSize: fontSize.body,
    color: palette.textPrimary,
    marginBottom: spacing.xs,
  },
});
