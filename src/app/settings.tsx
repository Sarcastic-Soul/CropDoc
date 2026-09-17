import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import { useGeminiKey } from '@/contexts/gemini-key';
import { useLanguagePreference } from '@/contexts/language-preference';
import { type ThemePreference, useThemePreference } from '@/contexts/theme-preference';
import { useTheme } from '@/hooks/use-theme';
import { clearScanHistory } from '@/lib/db';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const THEME_OPTIONS: { value: ThemePreference; labelKey: string; icon: IconName }[] = [
  { value: 'system', labelKey: 'settings.themeSystem', icon: 'cellphone-cog' },
  { value: 'light', labelKey: 'settings.themeLight', icon: 'white-balance-sunny' },
  { value: 'dark', labelKey: 'settings.themeDark', icon: 'weather-night' },
];

export default function SettingsScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const { preference, setPreference } = useThemePreference();
  const { apiKey, setApiKey } = useGeminiKey();
  const { language } = useLanguagePreference();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const currentLanguage = SUPPORTED_LANGUAGES.find((option) => option.code === language);

  function handleClearHistory() {
    Alert.alert(t('settings.clearHistoryAlertTitle'), t('settings.clearHistoryAlertMessage'), [
      { text: t('settings.clearHistoryAlertCancel'), style: 'cancel' },
      {
        text: t('settings.clearHistoryAlertConfirm'),
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
    Alert.alert(t('settings.removeKeyAlertTitle'), t('settings.removeKeyAlertMessage'), [
      { text: t('settings.removeKeyAlertCancel'), style: 'cancel' },
      { text: t('settings.removeKeyAlertConfirm'), style: 'destructive', onPress: () => setApiKey(null) },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={Spacing.four}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.theme')}
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
                      {t(option.labelKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.diagnosisSection')}
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="default">{t('settings.onDeviceModel')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('settings.onDeviceModelDesc')}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.geminiSection')}
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.row}>
              {apiKey ? (
                <>
                  <ThemedText type="default">
                    {t('settings.keySaved', { last4: apiKey.slice(-4) })}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('settings.keySavedDesc')}
                  </ThemedText>
                  <Pressable onPress={handleRemoveKey} style={styles.linkButton}>
                    <ThemedText type="small" style={styles.dangerText}>
                      {t('settings.removeKey')}
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('settings.addKeyDesc')}
                  </ThemedText>
                  <TextInput
                    value={draftKey}
                    onChangeText={setDraftKey}
                    placeholder={t('settings.keyPlaceholder')}
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
                      {t('settings.saveKey')}
                    </ThemedText>
                  </Pressable>
                  <ExternalLink href="https://aistudio.google.com/apikey">
                    <ThemedText type="linkPrimary">{t('settings.getFreeKey')}</ThemedText>
                  </ExternalLink>
                </>
              )}
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.languageSection')}
            </ThemedText>
            <Pressable
              onPress={() => router.push('/language-picker')}
              style={[styles.row, styles.linkRow, { backgroundColor: theme.backgroundElement }]}>
              <MaterialCommunityIcons name="translate" size={20} color={theme.text} />
              <ThemedText type="default">{currentLanguage?.nativeLabel ?? t('settings.changeLanguage')}</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.dataSection')}
            </ThemedText>
            <Pressable
              onPress={handleClearHistory}
              disabled={isClearing}
              style={[styles.row, styles.dangerRow, isClearing && styles.rowDisabled]}>
              <ThemedText type="default" style={styles.dangerText}>
                {t('settings.clearHistory')}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.aboutSection')}
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="default">{t('settings.appName')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </SafeAreaView>
      </KeyboardAwareScrollView>
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
