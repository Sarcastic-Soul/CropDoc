import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';

type Props = {
  message?: string;
  onRequest: () => void;
};

export function CameraPermissionGate({ message, onRequest }: Props) {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.centerText}>
          {t('cameraPermission.title')}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
          {message ?? t('camera.permissionMessage')}
        </ThemedText>
        <Pressable onPress={onRequest} style={styles.button}>
          <ThemedText type="default" style={styles.buttonText}>
            {t('cameraPermission.grant')}
          </ThemedText>
        </Pressable>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
  },
  buttonText: {
    color: '#ffffff',
  },
});
