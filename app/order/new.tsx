// New Order wizard (SPEC §5.3). Two steps that slide forward (no popups): Step 1
// Customer Info, Step 2 Add Flowers via the shared FlowerPickerGrid. A persistent
// "Save Order" footer is visible on both steps and enabled as soon as the minimum
// required fields are met, so she can save without stepping through in order. Same
// single-step-at-a-time layout on iPad (no split view). Draft autosave is wired in
// US7 (T049/T050).

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DueDateField, PhotoPicker, Segmented, TextField } from '@/components/forms';
import { FlowerPickerGrid } from '@/components/FlowerPickerGrid';
import { useOrders } from '@/hooks/useOrders';
import { useRecencyOrder } from '@/hooks/useRecencyOrder';
import { deleteImage } from '@/lib/images';
import { draftOrderStore } from '@/lib/storage';
import { fontSize, palette, radius, spacing, typography } from '@/lib/theme';
import type { DeliveryType, DraftOrder, OrderFlower, PaymentStatus } from '@/types';

function todayIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export default function NewOrderScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { createOrder } = useOrders();
  const recencyOrder = useRecencyOrder();

  const [step, setStep] = useState<0 | 1>(0);
  // Lazy init keeps a single stable Animated.Value without touching a ref in render.
  const [translateX] = useState(() => new Animated.Value(0));

  const [customerName, setCustomerName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dueDate, setDueDate] = useState(todayIso());
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [notes, setNotes] = useState('');
  const [referencePhotoUri, setReferencePhotoUri] = useState<string | undefined>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Draft autosave (SPEC §5.3). Gate persistence until the resume prompt resolves so
  // we never overwrite an existing draft before the user decides to keep it.
  const [draftChecked, setDraftChecked] = useState(false);

  const applyDraft = (draft: DraftOrder) => {
    setCustomerName(draft.customerName ?? '');
    setInstagramHandle(draft.instagramHandle ?? '');
    setPhoneNumber(draft.phoneNumber ?? '');
    if (draft.dueDate) setDueDate(draft.dueDate);
    if (draft.deliveryType) setDeliveryType(draft.deliveryType);
    if (draft.paymentStatus) setPaymentStatus(draft.paymentStatus);
    setNotes(draft.notes ?? '');
    setReferencePhotoUri(draft.referencePhotoUri);
    setQuantities(Object.fromEntries((draft.flowers ?? []).map((f) => [f.flowerId, f.quantity])));
  };

  // On mount: offer to resume an in-progress draft if one has meaningful content.
  useEffect(() => {
    let active = true;
    (async () => {
      const draft = await draftOrderStore.get();
      if (!active) return;
      const hasContent = !!draft && (!!draft.customerName || (draft.flowers?.length ?? 0) > 0);
      if (draft && hasContent) {
        Alert.alert('Resume draft?', 'You have an unsaved order in progress.', [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              void deleteImage(draft.referencePhotoUri);
              void draftOrderStore.clear();
              setDraftChecked(true);
            },
          },
          {
            text: 'Resume',
            onPress: () => {
              applyDraft(draft);
              setDraftChecked(true);
            },
          },
        ]);
      } else {
        setDraftChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist the draft on every change once the resume decision is made.
  useEffect(() => {
    if (!draftChecked) return;
    const draft: DraftOrder = {
      customerName,
      instagramHandle,
      phoneNumber,
      dueDate,
      deliveryType,
      paymentStatus,
      notes,
      referencePhotoUri,
      flowers: Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([flowerId, quantity]) => ({ flowerId, quantity, fulfilledQuantity: 0 })),
      lastSavedAt: new Date().toISOString(),
    };
    void draftOrderStore.set(draft);
  }, [
    draftChecked,
    customerName,
    instagramHandle,
    phoneNumber,
    dueDate,
    deliveryType,
    paymentStatus,
    notes,
    referencePhotoUri,
    quantities,
  ]);

  const goTo = (next: 0 | 1) => {
    setStep(next);
    Animated.timing(translateX, {
      toValue: next === 0 ? 0 : -width,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const flowers: OrderFlower[] = Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([flowerId, quantity]) => ({ flowerId, quantity, fulfilledQuantity: 0 }));

  const isValid =
    customerName.trim().length > 0 &&
    !!dueDate &&
    new Date(dueDate).getTime() >= new Date(todayIso()).setHours(0, 0, 0, 0) &&
    flowers.length >= 1;

  const onSave = () => {
    if (!isValid) return;
    createOrder({
      customerName: customerName.trim(),
      instagramHandle: instagramHandle.trim().replace(/^@/, '') || undefined,
      phoneNumber: phoneNumber.replace(/\D/g, '') || undefined,
      dueDate,
      deliveryType,
      paymentStatus,
      notes: notes.trim() || undefined,
      referencePhotoUri,
      flowers,
    });
    void draftOrderStore.clear(); // draft promoted to a saved order
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.stepsHeader}>
        <Pressable onPress={() => goTo(0)} hitSlop={8}>
          <Text style={[styles.stepTab, step === 0 && styles.stepTabActive]}>1 · Customer</Text>
        </Pressable>
        <Pressable onPress={() => goTo(1)} hitSlop={8}>
          <Text style={[styles.stepTab, step === 1 && styles.stepTabActive]}>2 · Flowers</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.panels, { width: width * 2, transform: [{ translateX }] }]}>
        {/* Step 1 — Customer Info */}
        <View style={[styles.panel, { width }]}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <TextField
              label="Customer Name"
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Jane Doe"
            />
            <TextField
              label="Instagram Handle"
              value={instagramHandle}
              onChangeText={setInstagramHandle}
              placeholder="@handle"
              autoCapitalize="none"
            />
            <TextField
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="5551234567"
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
            <TextField
              label="Special Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything to remember…"
              multiline
            />
            <PhotoPicker uri={referencePhotoUri} onChange={setReferencePhotoUri} />
            <Pressable style={styles.nextBtn} onPress={() => goTo(1)}>
              <Text style={styles.nextBtnText}>Next: Add Flowers →</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Step 2 — Add Flowers */}
        <View style={[styles.panel, { width, paddingHorizontal: spacing.lg }]}>
          <FlowerPickerGrid
            quantities={quantities}
            onSetQuantity={setQuantity(setQuantities)}
            recencyOrder={recencyOrder}
          />
        </View>
      </Animated.View>

      {/* Persistent Save footer (both steps) */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
        <Pressable
          style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={!isValid}
        >
          <Text style={styles.saveBtnText}>
            {isValid ? 'Save Order' : 'Add a name, due date & a flower'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Curried setter: update one flower's quantity in the map, dropping zeros. */
function setQuantity(set: React.Dispatch<React.SetStateAction<Record<string, number>>>) {
  return (flowerId: string, quantity: number) =>
    set((prev) => {
      const next = { ...prev };
      if (quantity > 0) next[flowerId] = quantity;
      else delete next[flowerId];
      return next;
    });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  stepsHeader: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepTab: { fontFamily: typography.body, fontSize: fontSize.body, color: palette.textSecondary },
  stepTabActive: { color: palette.primary, fontWeight: '700' },
  panels: { flex: 1, flexDirection: 'row' },
  panel: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  nextBtn: {
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  nextBtnText: { fontFamily: typography.body, fontSize: fontSize.body, color: palette.primary },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  saveBtn: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: palette.progressTrack },
  saveBtnText: { color: '#fff', fontFamily: typography.body, fontSize: fontSize.subtitle, fontWeight: '700' },
});
