import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LanguagePickerScreen } from '@/components/language-picker-screen';
import { GeminiKeyProvider } from '@/contexts/gemini-key';
import { LanguagePreferenceProvider, useLanguagePreference } from '@/contexts/language-preference';
import { ThemePreferenceProvider } from '@/contexts/theme-preference';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <LanguagePreferenceProvider>
      <ThemePreferenceProvider>
        <GeminiKeyProvider>
          <AppShell />
        </GeminiKeyProvider>
      </ThemePreferenceProvider>
    </LanguagePreferenceProvider>
  );
}

function AppShell() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { language } = useLanguagePreference();
  const { t } = useTranslation();

  if (!language) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <LanguagePickerScreen />
      </ThemeProvider>
    );
  }

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
        <Stack.Screen name="result" options={{ title: t('nav.diagnosis'), presentation: 'modal' }} />
        <Stack.Screen name="scan/[id]" options={{ title: t('nav.diagnosis'), presentation: 'modal' }} />
        <Stack.Screen name="plot/[tag]" options={{ title: t('nav.progression'), presentation: 'modal' }} />
        <Stack.Screen name="batch-summary" options={{ title: t('nav.batchResults'), presentation: 'modal' }} />
        <Stack.Screen name="batch/[batchId]" options={{ title: t('nav.batchScan'), presentation: 'modal' }} />
        <Stack.Screen name="language-picker" options={{ title: t('nav.language'), presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: t('nav.settings'), presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
