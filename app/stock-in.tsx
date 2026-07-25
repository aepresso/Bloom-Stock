// Stock-In flow (flow redesign). Stocking is an action, not a tab: this pushed
// modal route hosts the receipt pipeline that used to live on the Stock tab —
// Scan (camera) or Upload (library) → Claude reads the photo → ReceiptConfirmSheet
// → Confirm → inventory update, with manual entry as both a first-class option and
// the fallback for ANY Claude failure. Receipt history now lives on the Inventory
// tab (Receipts segment).
//
// Params:
//   action  — 'scan' | 'upload' | 'manual': auto-launch that path on arrival
//             (FAB, Home quick actions, shopping-run handoff)
//   prefill — JSON Record<flowerId, quantity>: seeds manual entry (shopping run)

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowerPickerGrid } from '@/components/FlowerPickerGrid';
import { ReceiptConfirmSheet, type ConfirmedLine } from '@/components/ReceiptConfirmSheet';
import { useInventory } from '@/hooks/useInventory';
import { useRecencyOrder } from '@/hooks/useRecencyOrder';
import { parseReceiptFromImage } from '@/lib/claude';
import { persistImage } from '@/lib/images';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { ParsedReceiptItem } from '@/types';

type Pipeline =
  | { phase: 'idle' }
  | { phase: 'processing' }
  | { phase: 'confirm'; imageUri: string; items: ParsedReceiptItem[] }
  | { phase: 'manual'; imageUri: string };

function parsePrefill(raw: string | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    }
    return out;
  } catch {
    return {};
  }
}

export default function StockInScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { confirmReceipt } = useInventory();
  const recencyOrder = useRecencyOrder();
  const { action, prefill } = useLocalSearchParams<{ action?: string; prefill?: string }>();

  const [pipeline, setPipeline] = useState<Pipeline>({ phase: 'idle' });
  const [manualQuantities, setManualQuantities] = useState<Record<string, number>>({});

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
      // TEMPORARY: surface the raw failure reason so receipt-parsing issues are
      // debuggable instead of disappearing into a silent fallback.
      if (!parsed.ok) {
        Alert.alert(`Receipt parsing failed (${parsed.error})`, parsed.detail ?? 'No detail available.');
      }
      // Any failure (or an empty parse) → manual entry fallback.
      setManualQuantities(parsePrefill(prefill));
      setPipeline({ phase: 'manual', imageUri });
    }
  };

  const openManual = () => {
    setManualQuantities(parsePrefill(prefill));
    setPipeline({ phase: 'manual', imageUri: '' });
  };

  // This route is pushed fresh for each stock-in, so the launch param only needs
  // consuming once per mount. Deferred a tick so the modal finishes presenting
  // before the camera/picker takes over.
  const launched = useRef(false);
  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    const t = setTimeout(() => {
      if (action === 'scan') void start(true);
      else if (action === 'upload') void start(false);
      else if (action === 'manual') openManual();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const onConfirmParsed = (lines: ConfirmedLine[]) => {
    if (pipeline.phase !== 'confirm') return;
    confirmReceipt({ imageUri: pipeline.imageUri, items: lines });
    finish();
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
    finish();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Scan or upload a receipt and the app reads it for you, or add what you bought by
        hand. Everything lands in Inventory after you confirm.
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => start(true)}>
          <Text style={styles.actionText}>📷 Scan Receipt</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => start(false)}>
          <Text style={styles.actionText}>📁 Upload Photo</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={openManual}>
          <Text style={styles.actionText}>✏️ Manual Entry</Text>
        </Pressable>
      </View>

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

      {/* Manual entry */}
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
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, padding: spacing.lg },
    title: { fontFamily: typography.display, fontSize: fontSize.header, color: theme.textPrimary },
    hint: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textSecondary,
      marginBottom: spacing.lg,
    },
    actions: { gap: spacing.md },
    actionBtn: {
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    actionText: { fontFamily: typography.body, fontSize: fontSize.subtitle, color: theme.primary },
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
  });
}
