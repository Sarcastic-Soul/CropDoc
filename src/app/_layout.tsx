import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { GeminiKeyProvider } from '@/contexts/gemini-key';
import { ThemePreferenceProvider } from '@/contexts/theme-preference';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <GeminiKeyProvider>
        <AppShell />
      </GeminiKeyProvider>
    </ThemePreferenceProvider>
  );
}

function AppShell() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="camera-batch" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="result" options={{ title: 'Diagnosis', presentation: 'modal' }} />
        <Stack.Screen name="scan/[id]" options={{ title: 'Diagnosis', presentation: 'modal' }} />
        <Stack.Screen name="plot/[tag]" options={{ title: 'Progression', presentation: 'modal' }} />
        <Stack.Screen name="batch-summary" options={{ title: 'Batch results', presentation: 'modal' }} />
        <Stack.Screen name="batch/[batchId]" options={{ title: 'Batch scan', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
