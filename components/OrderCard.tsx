// Order summary card (SPEC §5.2). Shows customer · due date · delivery · payment and
// a fulfillment progress bar; at 100% it highlights green with a "Fully Supplied"
// badge (a derived UI state only — Order.status stays 'active'). Optional swipe
// actions: left → Mark Delivered (US5/T044), right → Cancel Order (US1/T022). The
// `muted` variant is the Archive palette (SPEC §5.6).

import { Swipeable } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fulfillmentRatio } from '@/lib/allocation';
import { cardElevation, fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { Order } from '@/types';

const PAYMENT_LABEL: Record<Order['paymentStatus'], string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type Props = {
  order: Order;
  onPress: () => void;
  onCancel?: () => void;
  onMarkDelivered?: () => void;
  muted?: boolean;
};

export function OrderCard({ order, onPress, onCancel, onMarkDelivered, muted }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const ratio = fulfillmentRatio(order);
  const pct = Math.round(ratio * 100);
  const fullySupplied = ratio >= 1 && order.flowers.length > 0;

  const card = (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        muted && styles.cardMuted,
        fullySupplied && !muted && styles.cardFull,
      ]}
    >
      {fullySupplied && !muted ? (
        <Text style={styles.suppliedBadge}>🟢 FULLY SUPPLIED</Text>
      ) : null}
      <Text style={[styles.name, muted && styles.textMuted]}>{order.customerName}</Text>
      <Text style={[styles.meta, muted && styles.textMuted]}>
        Due {formatDue(order.dueDate)}
      </Text>
      <Text style={[styles.meta, muted && styles.textMuted]}>
        {order.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} · 💰{' '}
        {PAYMENT_LABEL[order.paymentStatus]}
        {order.totalPrice != null ? ` · $${order.totalPrice}` : ''}
      </Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%` },
            fullySupplied && { backgroundColor: theme.success },
            muted && { backgroundColor: theme.textSecondary },
          ]}
        />
      </View>
      <Text style={[styles.pct, muted && styles.textMuted]}>{pct}%</Text>
    </Pressable>
  );

  // No swipe handlers (e.g. Archive) → render the card directly.
  if (!onCancel && !onMarkDelivered) return card;

  return (
    <Swipeable
      renderLeftActions={
        onMarkDelivered
          ? () => (
              <View style={[styles.action, styles.deliverAction]}>
                <Text style={styles.actionText}>Mark{'\n'}Delivered</Text>
              </View>
            )
          : undefined
      }
      onSwipeableLeftOpen={onMarkDelivered}
      renderRightActions={
        onCancel
          ? () => (
              <View style={[styles.action, styles.cancelAction]}>
                <Text style={styles.actionText}>Cancel</Text>
              </View>
            )
          : undefined
      }
      onSwipeableRightOpen={onCancel}
    >
      {card}
    </Swipeable>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...cardElevation(theme),
    },
    cardMuted: { backgroundColor: theme.progressTrack, borderColor: theme.border },
    cardFull: { borderColor: theme.success, borderWidth: 1.5 },
    suppliedBadge: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      fontWeight: '700',
      color: theme.success,
      marginBottom: spacing.xs,
    },
    name: {
      fontFamily: typography.display,
      fontSize: fontSize.subtitle,
      color: theme.textPrimary,
      marginBottom: 2,
    },
    meta: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    textMuted: { color: theme.textSecondary },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.progressTrack,
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: theme.primary },
    pct: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginTop: 2,
      textAlign: 'right',
    },
    action: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 96,
      marginBottom: spacing.md,
      borderRadius: radius.lg,
    },
    deliverAction: { backgroundColor: theme.success },
    cancelAction: { backgroundColor: theme.danger },
    actionText: {
      color: '#fff',
      fontFamily: typography.body,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
}
