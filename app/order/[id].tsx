// Order Detail (SPEC §5.3 edit). One combined screen — all fields plus the inline
// FlowerPickerGrid for add/adjust/remove. Saving validates required fields, writes
// the order (store re-runs allocation), and returns. Reached from Orders (editable)
// or Archive (read-only via ?readonly=1, SPEC §5.6 — no edit controls).

import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DueDateField, PhotoPicker, PriceField, Segmented, TextField } from '@/components/forms';
import { FlowerPickerGrid } from '@/components/FlowerPickerGrid';
import { OrderCard } from '@/components/OrderCard';
import { flowerName } from '@/data/flowers';
import { useOrders } from '@/hooks/useOrders';
import { useRecencyOrder } from '@/hooks/useRecencyOrder';
import { deleteImage } from '@/lib/images';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { DeliveryType, OrderFlower, PaymentStatus } from '@/types';

export default function OrderDetailScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { id, readonly } = useLocalSearchParams<{ id: string; readonly?: string }>();
  const insets = useSafeAreaInsets();
  const { getOrder, updateOrder, deleteOrder, archiveOrder } = useOrders();
  const recencyOrder = useRecencyOrder();
  const order = getOrder(id);
  const isReadOnly = readonly === '1';

  const [customerName, setCustomerName] = useState(order?.customerName ?? '');
  const [instagramHandle, setInstagramHandle] = useState(order?.instagramHandle ?? '');
  const [phoneNumber, setPhoneNumber] = useState(order?.phoneNumber ?? '');
  const [dueDate, setDueDate] = useState(order?.dueDate ?? new Date().toISOString());
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(order?.deliveryType ?? 'delivery');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order?.paymentStatus ?? 'unpaid'
  );
  const [totalPrice, setTotalPrice] = useState(
    order?.totalPrice != null ? String(order.totalPrice) : ''
  );
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [referencePhotoUri, setReferencePhotoUri] = useState(order?.referencePhotoUri);
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries((order?.flowers ?? []).map((f) => [f.flowerId, f.quantity]))
  );

  const flowers: OrderFlower[] = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([flowerId, quantity]) => ({ flowerId, quantity, fulfilledQuantity: 0 })),
    [quantities]
  );

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Order not found.</Text>
      </View>
    );
  }

  // Read-only Archive view: reuse OrderCard for the summary + show the flower list.
  if (isReadOnly) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <OrderCard order={order} onPress={() => {}} muted />
        {order.referencePhotoUri ? (
          <Image source={{ uri: order.referencePhotoUri }} style={styles.photo} contentFit="cover" />
        ) : null}
        <Text style={styles.sectionTitle}>Flowers</Text>
        {order.flowers.map((f) => (
          <Text key={f.flowerId} style={styles.flowerLine}>
            {flowerName(f.flowerId)} — {f.fulfilledQuantity}/{f.quantity}
          </Text>
        ))}
        {order.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.flowerLine}>{order.notes}</Text>
          </>
        ) : null}
      </ScrollView>
    );
  }

  const isValid = customerName.trim().length > 0 && !!dueDate && flowers.length >= 1;

  const onSave = () => {
    if (!isValid) {
      Alert.alert('Missing info', 'Add a customer name, due date, and at least one flower.');
      return;
    }
    // If the photo was replaced or removed, the old file is now orphaned — clean it up.
    if (order.referencePhotoUri && order.referencePhotoUri !== referencePhotoUri) {
      void deleteImage(order.referencePhotoUri);
    }
    updateOrder(order.id, {
      customerName: customerName.trim(),
      instagramHandle: instagramHandle.trim().replace(/^@/, '') || undefined,
      phoneNumber: phoneNumber.replace(/\D/g, '') || undefined,
      dueDate,
      deliveryType,
      paymentStatus,
      totalPrice: totalPrice.trim() ? Number(totalPrice) : undefined,
      notes: notes.trim() || undefined,
      referencePhotoUri,
      flowers,
    });
    router.back();
  };

  const onCancelOrder = () =>
    Alert.alert('Cancel Order', `Permanently delete ${order.customerName}'s order?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: () => {
          deleteOrder(order.id);
          void deleteImage(order.referencePhotoUri);
          // Also clean up a picked-but-never-saved replacement photo, if any.
          if (referencePhotoUri && referencePhotoUri !== order.referencePhotoUri) {
            void deleteImage(referencePhotoUri);
          }
          router.back();
        },
      },
    ]);

  const onCloseOrder = () => {
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
          {
            text: 'Mark Delivered',
            onPress: () => {
              archiveOrder(order.id);
              router.back();
            },
          },
        ]
      );
    } else {
      archiveOrder(order.id);
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TextField label="Customer Name" value={customerName} onChangeText={setCustomerName} />
        <TextField
          label="Instagram Handle"
          value={instagramHandle}
          onChangeText={setInstagramHandle}
          autoCapitalize="none"
        />
        <TextField
          label="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        <DueDateField value={dueDate} onChange={setDueDate} />
        <Segmented
          label="Fulfillment"
          value={deliveryType}
          onChange={setDeliveryType}
          options={[
            { value: 'delivery', label: 'Delivery' },
            { value: 'pickup', label: 'Pickup' },
          ]}
        />
        <Segmented
          label="Payment Status"
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={[
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
          ]}
        />
        <PriceField value={totalPrice} onChange={setTotalPrice} />
        <TextField label="Special Notes" value={notes} onChangeText={setNotes} multiline />
        <PhotoPicker uri={referencePhotoUri} onChange={setReferencePhotoUri} />

        <Text style={styles.sectionTitle}>Flowers</Text>
        <View style={styles.pickerWrap}>
          <FlowerPickerGrid
            quantities={quantities}
            onSetQuantity={setQuantity(setQuantities)}
            recencyOrder={recencyOrder}
          />
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={[styles.cancelBtn, styles.actionBtn]} onPress={onCancelOrder}>
            <Text style={styles.cancelBtnText}>Cancel Order</Text>
          </Pressable>
          <Pressable style={[styles.closeBtn, styles.actionBtn]} onPress={onCloseOrder}>
            <Text style={styles.closeBtnText}>Close Order</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
        <Pressable
          style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={!isValid}
        >
          <Text style={styles.saveBtnText}>Save Order</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function setQuantity(set: React.Dispatch<React.SetStateAction<Record<string, number>>>) {
  return (flowerId: string, quantity: number) =>
    set((prev) => {
      const next = { ...prev };
      if (quantity > 0) next[flowerId] = quantity;
      else delete next[flowerId];
      return next;
    });
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
    sectionTitle: {
      fontFamily: typography.display,
      fontSize: fontSize.title,
      color: theme.textPrimary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    // The inline grid is a FlatList; give it a bounded height inside the ScrollView.
    pickerWrap: { height: 360 },
    flowerLine: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    photo: { width: '100%', height: 180, borderRadius: radius.lg, marginVertical: spacing.md },
    empty: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    actionBtn: { flex: 1 },
    cancelBtn: {
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.danger,
    },
    cancelBtnText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.danger },
    closeBtn: {
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.success,
    },
    closeBtnText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.success },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: theme.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    saveBtnDisabled: { backgroundColor: theme.progressTrack },
    saveBtnText: {
      color: '#fff',
      fontFamily: typography.body,
      fontSize: fontSize.subtitle,
      fontWeight: '700',
    },
  });
}
