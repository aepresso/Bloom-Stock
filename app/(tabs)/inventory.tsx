// Inventory screen (SPEC §5.5). Rows sorted fully-allocated-first then alphabetical
// (handled in useInventory). The pencil opens a manual-adjust sheet: a signed stem
// delta plus a required reason that's appended to the InventoryAdjustment audit log.

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InventoryRow } from '@/components/InventoryRow';
import { flowerName } from '@/data/flowers';
import { useInventory } from '@/hooks/useInventory';
import { fontSize, palette, radius, spacing, typography } from '@/lib/theme';

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const { rows, hydrated, adjustInventory } = useInventory();

  const [adjustFlowerId, setAdjustFlowerId] = useState<string | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

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

  const canSubmit = Number(delta) !== 0 && reason.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Inventory</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.flowerId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <InventoryRow item={item} onAdjust={() => setAdjustFlowerId(item.flowerId)} />
        )}
        ListEmptyComponent={
          hydrated ? <Text style={styles.empty}>No stock recorded yet.</Text> : null
        }
      />

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
              placeholderTextColor={palette.textSecondary}
              value={delta}
              onChangeText={setDelta}
            />
            <Text style={styles.fieldLabel}>Reason (required)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. damaged stems"
              placeholderTextColor={palette.textSecondary}
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  sheetTitle: {
    fontFamily: typography.display,
    fontSize: fontSize.title,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.caption,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: palette.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: typography.body,
    fontSize: fontSize.body,
    color: palette.textPrimary,
  },
  sheetButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  sheetCancel: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  sheetCancelText: { fontFamily: typography.body, fontSize: fontSize.body, color: palette.textSecondary },
  sheetSave: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sheetSaveDisabled: { backgroundColor: palette.progressTrack },
  sheetSaveText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.body, fontWeight: '700' },
});
