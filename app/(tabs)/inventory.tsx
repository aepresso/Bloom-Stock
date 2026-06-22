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
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export default function InventoryScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
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
