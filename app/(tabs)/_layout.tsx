// Adaptive 5-tab navigator (SPEC.md §3). iPhone gets a bottom tab bar; iPad gets a
// left sidebar — one layout, switched on width (a tablet-width window), using the
// headless `expo-router/ui` Tabs so we control the bar's position/orientation
// directly instead of maintaining two navigators.

import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing, typography } from '@/lib/theme';

type TabDef = { name: string; href: string; label: string; icon: string };

// Order matches SPEC §3: Shopping List · Orders · Stock · Inventory · Archive.
const TABS: TabDef[] = [
  { name: 'shopping-list', href: '/shopping-list', label: 'Shopping', icon: '🛒' },
  { name: 'orders', href: '/orders', label: 'Orders', icon: '📋' },
  { name: 'stock', href: '/stock', label: 'Stock', icon: '🧾' },
  { name: 'inventory', href: '/inventory', label: 'Inventory', icon: '📦' },
  { name: 'archive', href: '/archive', label: 'Archive', icon: '🗂' },
];

/** A single tab button. `isVertical` lays it out for the iPad sidebar. */
const TabButton = forwardRef<
  View,
  TabTriggerSlotProps & { icon: string; label: string; isVertical: boolean }
>(({ icon, label, isVertical, isFocused, ...props }, ref) => (
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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Treat genuinely tablet-sized windows as "sidebar" mode.
  const isWide = (Platform.OS === 'ios' && Platform.isPad) || width >= 768;

  const triggers = TABS.map((t) => (
    <TabTrigger key={t.name} name={t.name} href={t.href as never} asChild>
      <TabButton icon={t.icon} label={t.label} isVertical={isWide} />
    </TabTrigger>
  ));

  return (
    <Tabs style={[styles.root, isWide && styles.rootWide]}>
      {isWide ? (
        // iPad: persistent left sidebar + content fills the rest.
        <>
          <TabList style={[styles.sidebar, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.sidebarBrand}>BloomxStock</Text>
            {triggers}
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
            {triggers}
          </TabList>
        </>
      )}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column', backgroundColor: palette.background },
  rootWide: { flexDirection: 'row' },
  content: { flex: 1, backgroundColor: palette.background },

  bottomBar: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingTop: spacing.sm,
  },
  sidebar: {
    width: 200,
    backgroundColor: palette.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: palette.border,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  sidebarBrand: {
    fontFamily: typography.display,
    fontSize: 20,
    color: palette.primary,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },

  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs },
  tabButtonVertical: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  tabButtonFocused: {},
  tabIcon: { fontSize: 20 },
  tabLabel: {
    fontFamily: typography.body,
    fontSize: 11,
    color: palette.textSecondary,
    marginTop: 2,
  },
  tabLabelVertical: { fontSize: 15, marginTop: 0 },
  tabLabelFocused: { color: palette.primary, fontWeight: '600' },
});
