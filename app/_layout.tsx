// Root navigator. Runs storage migrations once at launch (research.md §4) before
// any domain screen reads data, then exposes the two route groups: the adaptive
// tab group `(tabs)` and the modal-ish `order/` stack (wizard + detail).

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '@/lib/theme';
import { runMigrations } from '@/lib/storage';
import { StoreProvider } from '@/lib/store';

export default function RootLayout() {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    runMigrations().finally(() => setMigrated(true));
  }, []);

  if (!migrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="order" />
          </Stack>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
