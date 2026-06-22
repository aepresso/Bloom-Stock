// Stack for the order routes: the New Order wizard (`new`) and Order Detail
// (`[id]`). The wizard's own internal Step 1 → Step 2 slide is handled inside
// new.tsx; this stack governs push/pop between the list and these screens.

import { Stack } from 'expo-router';

import { palette, typography } from '@/lib/theme';

export default function OrderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.primary,
        headerTitleStyle: { fontFamily: typography.display, color: palette.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="new" options={{ title: 'New Order', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order' }} />
    </Stack>
  );
}
