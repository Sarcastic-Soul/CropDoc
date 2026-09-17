import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SHEET_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.6);

type Option = { value: string; label: string };

type Props = {
  title: string;
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
};

// No picker/select library in this repo (adding one would need a native
// module + `expo prebuild`, which is banned in this project) — a Pressable
// that opens a Modal list is the same pattern already used for the
// language picker.
//
// The modal sheet is a plain `View` with colors set explicitly from `theme`
// (resolved outside the Modal), not `ThemedView`/`ThemedText`'s own internal
// `useTheme()` — a component that resolves its own color while mounted as
// the direct child of a `Modal` gets an unreliable (looks-like-light-mode)
// reading on Android on its first render. Same reason `sheet`'s maxHeight is
// a computed pixel number, not a '60%' string: percentage height doesn't
// resolve reliably against this sheet's content-derived (non-flex) parent.
export function DropdownField({ title, value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <ThemedText
          type="default"
          themeColor={selected ? 'text' : 'textSecondary'}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.fieldText}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <MaterialCommunityIcons name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheet,
                { backgroundColor: theme.background, borderColor: theme.backgroundSelected, maxHeight: SHEET_MAX_HEIGHT },
              ]}>
              <ThemedText type="smallBold" style={[styles.heading, { color: theme.text }]}>
                {title}
              </ThemedText>
              <ScrollView contentContainerStyle={styles.list}>
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      style={[
                        styles.row,
                        { backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement },
                      ]}>
                      <ThemedText type="default" style={{ color: theme.text }}>
                        {option.label}
                      </ThemedText>
                      {isSelected && <MaterialCommunityIcons name="check" size={18} color={theme.text} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  fieldText: {
    flex: 1,
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  heading: {
    marginBottom: Spacing.one,
  },
  list: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
});
