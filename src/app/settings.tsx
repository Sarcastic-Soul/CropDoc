import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type ThemePreference, useThemePreference } from '@/contexts/theme-preference';
import { useTheme } from '@/hooks/use-theme';
import { clearScanHistory } from '@/lib/db';
import { isGeminiConfigured } from '@/lib/gemini';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'System', icon: 'cellphone-cog' },
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Dark', icon: 'weather-night' },
];

export default function SettingsScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const { preference, setPreference } = useThemePreference();
  const theme = useTheme();

  function handleClearHistory() {
    Alert.alert('Clear scan history', 'This deletes all saved diagnoses from this device. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setIsClearing(true);
          try {
            await clearScanHistory();
          } finally {
            setIsClearing(false);
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            THEME
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.segmented}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  style={[styles.segment, selected && { backgroundColor: theme.backgroundSelected }]}>
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={18}
                    color={selected ? theme.text : theme.textSecondary}
                  />
                  <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            DIAGNOSIS
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="default">On-device model</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Always on, works fully offline
            </ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="default">Gemini second opinion</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isGeminiConfigured() ? 'Configured — available when online' : 'Not configured'}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            DATA
          </ThemedText>
          <Pressable
            onPress={handleClearHistory}
            disabled={isClearing}
            style={[styles.row, styles.dangerRow, isClearing && styles.rowDisabled]}>
            <ThemedText type="default" style={styles.dangerText}>
              Clear scan history
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ABOUT
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="default">CropDoc</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Version {Constants.expoConfig?.version ?? '1.0.0'}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  dangerRow: {
    borderWidth: 1,
    borderColor: '#d1453b',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  dangerText: {
    color: '#d1453b',
  },
});
