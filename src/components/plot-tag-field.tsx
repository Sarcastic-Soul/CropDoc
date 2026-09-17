import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string | null;
  onChange: (tag: string | null) => void;
};

export function PlotTagField({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value ?? '');
  const theme = useTheme();
  const { t } = useTranslation();

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === (value ?? '')) return;
    onChange(trimmed || null);
  }

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('plotTag.label')}
      </ThemedText>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        placeholder={t('plotTag.placeholder')}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        selectionColor={Tint}
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
});
