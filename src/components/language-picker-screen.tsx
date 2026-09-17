import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLanguagePreference } from '@/contexts/language-preference';
import { useTheme } from '@/hooks/use-theme';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

type Props = {
  onSelected?: () => void;
};

export function LanguagePickerScreen({ onSelected }: Props) {
  const { language, setLanguage } = useLanguagePreference();
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('languagePicker.title')}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          {t('languagePicker.subtitle')}
        </ThemedText>

        <ThemedView style={styles.list}>
          {SUPPORTED_LANGUAGES.map((option) => {
            const selected = option.code === language;
            return (
              <Pressable
                key={option.code}
                onPress={() => {
                  setLanguage(option.code);
                  onSelected?.();
                }}
                style={[
                  styles.row,
                  { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
                ]}>
                <ThemedText type="default">{option.nativeLabel}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
