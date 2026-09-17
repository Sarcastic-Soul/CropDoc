import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import { useGeminiKey } from '@/contexts/gemini-key';
import { type ThemePreference, useThemePreference } from '@/contexts/theme-preference';
import { useTheme } from '@/hooks/use-theme';
import { clearScanHistory } from '@/lib/db';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'System', icon: 'cellphone-cog' },
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Dark', icon: 'weather-night' },
];

export default function SettingsScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const { preference, setPreference } = useThemePreference();
  const { apiKey, setApiKey } = useGeminiKey();
  const theme = useTheme();
  const router = useRouter();

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

  async function handleSaveKey() {
    const trimmed = draftKey.trim();
    if (!trimmed) return;
    await setApiKey(trimmed);
    setDraftKey('');
  }

  function handleRemoveKey() {
    Alert.alert('Remove Gemini API key', 'The "second opinion" feature will be unavailable until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setApiKey(null) },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              GEMINI SECOND OPINION
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.row}>
              {apiKey ? (
                <>
                  <ThemedText type="default">Key saved (•••• {apiKey.slice(-4)})</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Available when online. Stored encrypted on this device only.
                  </ThemedText>
                  <Pressable onPress={handleRemoveKey} style={styles.linkButton}>
                    <ThemedText type="small" style={styles.dangerText}>
                      Remove key
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Add your own free-tier Gemini API key to enable the optional online
                    &ldquo;second opinion&rdquo; explanation. Stored encrypted on this device only —
                    never bundled with the app.
                  </ThemedText>
                  <TextInput
                    value={draftKey}
                    onChangeText={setDraftKey}
                    placeholder="Paste your Gemini API key"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  />
                  <Pressable
                    onPress={handleSaveKey}
                    disabled={!draftKey.trim()}
                    style={[styles.saveButton, !draftKey.trim() && styles.rowDisabled]}>
                    <ThemedText type="default" style={styles.saveButtonText}>
                      Save key
                    </ThemedText>
                  </Pressable>
                  <ExternalLink href="https://aistudio.google.com/apikey">
                    <ThemedText type="linkPrimary">Get a free key from Google AI Studio</ThemedText>
                  </ExternalLink>
                </>
              )}
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              TOOLS
            </ThemedText>
            <Pressable
              onPress={() => router.push('/dosage-calculator')}
              style={[styles.row, styles.linkRow, { backgroundColor: theme.backgroundElement }]}>
              <MaterialCommunityIcons name="beaker-outline" size={20} color={theme.text} />
              <ThemedText type="default">Dosage calculator</ThemedText>
            </Pressable>
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  safeArea: {
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
    gap: Spacing.two,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
  },
  saveButtonText: {
    color: '#ffffff',
  },
  linkButton: {
    alignSelf: 'flex-start',
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
