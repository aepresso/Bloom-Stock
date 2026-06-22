// Root navigator. Runs storage migrations once at launch (research.md §4) before
// any domain screen reads data, then exposes the two route groups: the adaptive
// tab group `(tabs)` and the modal-ish `order/` stack (wizard + detail).

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';

import { runMigrations } from '@/lib/storage';
import { StoreProvider } from '@/lib/store';
import { ThemeProvider, useTheme, useThemeMode } from '@/lib/theme-context';

function LoadingScreen() {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
      }}
    >
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

function ThemedApp({ migrated }: { migrated: boolean }) {
  const theme = useTheme();
  const { resolvedMode } = useThemeMode();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  if (!migrated) return <LoadingScreen />;

  return (
    <StoreProvider>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order" />
      </Stack>
    </StoreProvider>
  );
}

export default function RootLayout() {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    runMigrations().finally(() => setMigrated(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp migrated={migrated} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
