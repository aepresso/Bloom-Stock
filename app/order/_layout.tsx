// Stack for the order routes: the New Order wizard (`new`) and Order Detail
// (`[id]`). The wizard's own internal Step 1 → Step 2 slide is handled inside
// new.tsx; this stack governs push/pop between the list and these screens.

import { Stack } from 'expo-router';

import { typography } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export default function OrderLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.primary,
        headerTitleStyle: { fontFamily: typography.display, color: theme.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="new" options={{ title: 'New Order', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order' }} />
    </Stack>
  );
}
