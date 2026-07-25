// Adaptive 5-tab navigator (SPEC.md §3). iPhone gets a bottom tab bar; iPad gets a
// left sidebar — one layout, switched on width (a tablet-width window), using the
// headless `expo-router/ui` Tabs so we control the bar's position/orientation
// directly instead of maintaining two navigators.
//
// 002-ui-redesign: also hosts the always-reachable theme control (FR-005) — a
// compact cycle button placed in this persistent chrome rather than a dedicated
// settings screen, per product decision (spec.md Assumptions).

import { router } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useThemeMode } from '@/lib/theme-context';
import { spacing, typography, radius, fontSize, type ThemeMode, type ThemeTokens } from '@/lib/theme';

type QuickAction = { key: string; icon: string; label: string; onPress: () => void };

type TabDef = { name: string; href: string; label: string; icon: string };

// Flow redesign: Home dashboard is the landing tab; the Stock tab is dissolved —
// stocking is an *action* (FAB / Home quick actions → pushed /stock-in route) and
// receipt history now lives under Inventory. Archive stays reachable from Orders.
const TABS: TabDef[] = [
  { name: 'home', href: '/home', label: 'Home', icon: '🏠' },
  { name: 'shopping-list', href: '/shopping-list', label: 'Shopping', icon: '🛒' },
  { name: 'orders', href: '/orders', label: 'Orders', icon: '📋' },
  { name: 'inventory', href: '/inventory', label: 'Inventory', icon: '📦' },
];

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const MODE_ICON: Record<ThemeMode, string> = { system: '🌓', light: '☀️', dark: '🌙' };
const MODE_LABEL: Record<ThemeMode, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };

/** Compact, always-reachable Light/Dark/System cycle button (FR-005). */
function ThemeToggle({ vertical, styles }: { vertical: boolean; styles: Styles }) {
  const { preference, setPreference } = useThemeMode();
  return (
    <Pressable
      onPress={() => setPreference(NEXT_MODE[preference])}
      style={[styles.themeToggle, vertical && styles.themeToggleVertical]}
      hitSlop={8}
    >
      <Text style={styles.themeToggleIcon}>{MODE_ICON[preference]}</Text>
      {vertical ? <Text style={styles.themeToggleLabel}>{MODE_LABEL[preference]}</Text> : null}
    </Pressable>
  );
}

/**
 * Raised center "+" on the iPhone bottom bar (inspired by REFERENCE/ — Cronometer's
 * oversized center tab). Tapping it pops up an animated grid of the two highest-
 * frequency actions (New Order, Scan Receipt) instead of forcing a tab switch first.
 */
function QuickActionFab({ styles }: { styles: Styles }) {
  const [visible, setVisible] = useState(false);
  const [scale] = useState(() => new Animated.Value(0.8));
  const [opacity] = useState(() => new Animated.Value(0));

  const open = () => {
    setVisible(true);
    scale.setValue(0.8);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const close = () => setVisible(false);

  const actions: QuickAction[] = [
    {
      key: 'new-order',
      icon: '📋',
      label: 'New Order',
      onPress: () => {
        close();
        router.push('/order/new');
      },
    },
    {
      key: 'scan-receipt',
      icon: '📷',
      label: 'Scan Receipt',
      onPress: () => {
        close();
        router.push('/stock-in?action=scan');
      },
    },
  ];

  return (
    <>
      <Pressable style={styles.fab} onPress={open} hitSlop={8}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.fabBackdrop} onPress={close}>
          <Animated.View style={[styles.fabSheet, { opacity, transform: [{ scale }] }]}>
            {actions.map((a) => (
              <Pressable key={a.key} style={styles.fabAction} onPress={a.onPress}>
                <View style={styles.fabActionIconWrap}>
                  <Text style={styles.fabActionIcon}>{a.icon}</Text>
                </View>
                <Text style={styles.fabActionLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

/** A single tab button. `isVertical` lays it out for the iPad sidebar. */
const TabButton = forwardRef<
  View,
  TabTriggerSlotProps & { icon: string; label: string; isVertical: boolean; styles: Styles }
>(({ icon, label, isVertical, isFocused, styles, ...props }, ref) => (
  <Pressable
    ref={ref}
    {...props}
    style={[
      styles.tabButton,
      isVertical && styles.tabButtonVertical,
      isFocused && styles.tabButtonFocused,
    ]}
  >
    <Text style={styles.tabIcon}>{icon}</Text>
    <Text
      style={[
        styles.tabLabel,
        isVertical && styles.tabLabelVertical,
        isFocused && styles.tabLabelFocused,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </Pressable>
));
TabButton.displayName = 'TabButton';

export default function TabsLayout() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Treat genuinely tablet-sized windows as "sidebar" mode.
  const isWide = (Platform.OS === 'ios' && Platform.isPad) || width >= 768;

  const triggers = TABS.map((t) => (
    <TabTrigger key={t.name} name={t.name} href={t.href as never} asChild>
      <TabButton icon={t.icon} label={t.label} isVertical={isWide} styles={styles} />
    </TabTrigger>
  ));
  // Bottom bar only: split 2-and-2 around the raised center "+" (REFERENCE/ pattern).
  const leftTriggers = triggers.slice(0, 2);
  const rightTriggers = triggers.slice(2);

  return (
    <Tabs style={[styles.root, isWide && styles.rootWide]}>
      {isWide ? (
        // iPad: persistent left sidebar + content fills the rest.
        <>
          <TabList style={[styles.sidebar, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.sidebarBrand}>BloomxStock</Text>
            {triggers}
            <View style={styles.sidebarFooter}>
              <ThemeToggle vertical styles={styles} />
            </View>
          </TabList>
          <View style={styles.content}>
            <TabSlot />
          </View>
        </>
      ) : (
        // iPhone: content above, bottom tab bar.
        <>
          <View style={styles.content}>
            <TabSlot />
          </View>
          <TabList style={[styles.bottomBar, { paddingBottom: insets.bottom || spacing.sm }]}>
            {leftTriggers}
            <QuickActionFab styles={styles} />
            {rightTriggers}
            <ThemeToggle vertical={false} styles={styles} />
          </TabList>
        </>
      )}
    </Tabs>
  );
}

type Styles = ReturnType<typeof createStyles>;

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, flexDirection: 'column', backgroundColor: theme.background },
    rootWide: { flexDirection: 'row' },
    content: { flex: 1, backgroundColor: theme.background },

    bottomBar: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      paddingTop: spacing.sm,
    },
    sidebar: {
      width: 220,
      flexDirection: 'column',
      backgroundColor: theme.surface,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.border,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    sidebarBrand: {
      fontFamily: typography.display,
      fontSize: 22,
      color: theme.primary,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xl,
    },
    sidebarFooter: {
      marginTop: 'auto',
      paddingBottom: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      paddingTop: spacing.md,
    },

    tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
    tabButtonVertical: {
      flex: 0,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    },
    tabButtonFocused: { backgroundColor: theme.flowerCard },
    tabIcon: { fontSize: 20 },
    tabLabel: {
      fontFamily: typography.body,
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    tabLabelVertical: { fontSize: 15, marginTop: 0 },
    tabLabelFocused: { color: theme.primary, fontWeight: '600' },

    themeToggle: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    themeToggleVertical: {
      flex: 0,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    },
    themeToggleIcon: { fontSize: 20 },
    themeToggleLabel: {
      fontFamily: typography.body,
      fontSize: 15,
      color: theme.textSecondary,
    },

    fab: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginTop: -20, // raised above the bar line, like the REFERENCE/ center tab
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    fabIcon: { color: '#fff', fontSize: 30, lineHeight: 32, marginTop: -2 },
    fabBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    fabSheet: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
      backgroundColor: theme.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    fabAction: { alignItems: 'center', gap: spacing.sm },
    fabActionIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.flowerCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabActionIcon: { fontSize: 26 },
    fabActionLabel: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textPrimary,
    },
  });
}
