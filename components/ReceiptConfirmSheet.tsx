// Receipt confirmation sheet (SPEC §5.4 step 4). Shows each parsed line — raw text,
// matched flower, quantity, price + unit — and lets her correct any mismatch (tap to
// change match/quantity/price/unit) or toggle off non-flower lines before anything
// touches inventory. Confirm emits only the kept, matched lines.

import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FLOWERS, flowerName } from '@/data/flowers';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { ParsedReceiptItem, PriceUnit } from '@/types';

export type ConfirmedLine = {
  flowerId: string;
  quantity: number;
  price?: number;
  priceUnit?: PriceUnit;
};

type Props = {
  visible: boolean;
  items: ParsedReceiptItem[];
  onCancel: () => void;
  onConfirm: (lines: ConfirmedLine[]) => void;
};

export function ReceiptConfirmSheet({ visible, items, onCancel, onConfirm }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [lines, setLines] = useState<ParsedReceiptItem[]>(items);
  const [matchingIndex, setMatchingIndex] = useState<number | null>(null);
  const [flowerSearch, setFlowerSearch] = useState('');

  // Re-seed local state whenever a new parse comes in.
  const [seed, setSeed] = useState(items);
  if (seed !== items) {
    setSeed(items);
    setLines(items);
  }

  const patch = (i: number, p: Partial<ParsedReceiptItem>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...p } : l)));

  const confirm = () => {
    const kept = lines
      .filter((l) => l.confirmed && l.matchedFlowerId && l.quantity > 0)
      .map<ConfirmedLine>((l) => ({
        flowerId: l.matchedFlowerId!,
        quantity: l.quantity,
        price: l.price,
        priceUnit: l.priceUnit,
      }));
    onConfirm(kept);
  };

  const matchOptions = FLOWERS.filter((f) =>
    f.name.toLowerCase().includes(flowerSearch.trim().toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Text style={styles.title}>Confirm Receipt</Text>
        <FlatList
          data={lines}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <View style={[styles.row, !item.confirmed && styles.rowOff]}>
              <Pressable
                style={styles.check}
                onPress={() => patch(index, { confirmed: !item.confirmed })}
              >
                <Text style={styles.checkText}>{item.confirmed ? '☑︎' : '☐'}</Text>
              </Pressable>

              <View style={styles.rowBody}>
                {item.rawText ? <Text style={styles.rawText}>{item.rawText}</Text> : null}

                <Pressable
                  onPress={() => {
                    setMatchingIndex(index);
                    setFlowerSearch('');
                  }}
                >
                  <Text style={[styles.match, !item.matchedFlowerId && styles.matchUnset]}>
                    {item.matchedFlowerId ? flowerName(item.matchedFlowerId) : 'Tap to match flower'}
                  </Text>
                </Pressable>

                <View style={styles.controls}>
                  <View style={styles.qtyGroup}>
                    <Text style={styles.ctrlLabel}>Qty</Text>
                    <TextInput
                      style={styles.qtyInput}
                      keyboardType="number-pad"
                      value={String(item.quantity)}
                      onChangeText={(t) =>
                        patch(index, { quantity: Math.max(0, Math.floor(Number(t) || 0)) })
                      }
                    />
                  </View>
                  <View style={styles.qtyGroup}>
                    <Text style={styles.ctrlLabel}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor={theme.textSecondary}
                      value={item.price != null ? String(item.price) : ''}
                      onChangeText={(t) =>
                        patch(index, { price: t.trim() === '' ? undefined : Number(t) })
                      }
                    />
                  </View>
                  <Pressable
                    style={styles.unitToggle}
                    onPress={() =>
                      patch(index, {
                        priceUnit: item.priceUnit === 'stem' ? 'bunch' : 'stem',
                      })
                    }
                  >
                    <Text style={styles.unitText}>/{item.priceUnit ?? 'stem'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={confirm}>
            <Text style={styles.confirmText}>Confirm → Update Inventory</Text>
          </Pressable>
        </View>
      </View>

      {/* Flower-match picker */}
      <Modal
        visible={matchingIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setMatchingIndex(null)}
      >
        <View style={styles.matchModalBackdrop}>
          <View style={styles.matchModal}>
            <TextInput
              style={styles.matchSearch}
              placeholder="Search flowers…"
              placeholderTextColor={theme.textSecondary}
              value={flowerSearch}
              onChangeText={setFlowerSearch}
              autoFocus
            />
            <FlatList
              data={matchOptions}
              keyExtractor={(f) => f.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: f }) => (
                <Pressable
                  style={styles.matchOption}
                  onPress={() => {
                    if (matchingIndex !== null) patch(matchingIndex, { matchedFlowerId: f.id });
                    setMatchingIndex(null);
                  }}
                >
                  <Text style={styles.matchOptionText}>{f.name}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.matchClose} onPress={() => setMatchingIndex(null)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background, paddingTop: spacing.xl },
    title: {
      fontFamily: typography.display,
      fontSize: fontSize.title,
      color: theme.textPrimary,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    row: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    rowOff: { opacity: 0.45 },
    check: { paddingRight: spacing.md, justifyContent: 'center' },
    checkText: { fontSize: 22, color: theme.primary },
    rowBody: { flex: 1 },
    rawText: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    match: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.primary },
    matchUnset: { color: theme.accent, fontStyle: 'italic' },
    controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
    qtyGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    ctrlLabel: { fontFamily: typography.body, fontSize: fontSize.caption, color: theme.textSecondary },
    qtyInput: {
      minWidth: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      textAlign: 'center',
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      paddingVertical: 2,
    },
    priceInput: {
      minWidth: 56,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      textAlign: 'center',
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      paddingVertical: 2,
    },
    unitToggle: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: theme.background,
    },
    unitText: { fontFamily: typography.body, fontSize: fontSize.caption, color: theme.primary },
    footer: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    cancelBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, justifyContent: 'center' },
    cancelText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },
    confirmBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    confirmText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700' },
    matchModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    matchModal: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      maxHeight: '70%',
    },
    matchSearch: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
    },
    matchOption: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    matchOptionText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textPrimary },
    matchClose: { alignItems: 'center', paddingVertical: spacing.md },
  });
}
