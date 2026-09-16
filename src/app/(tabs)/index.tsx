import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    Network.getNetworkStateAsync().then((state) => setIsOffline(!state.isConnected));
  }, []);

  async function handleUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled) return;

    const picked = result.assets[0];
    router.push({
      pathname: '/result',
      params: { uri: picked.uri, width: String(picked.width), height: String(picked.height) },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsButton} hitSlop={12}>
          <ThemedText type="default">⚙️</ThemedText>
        </Pressable>

        <ThemedView style={styles.hero}>
          <ThemedText type="title" style={styles.title}>
            CropDoc
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Point a leaf, get an instant diagnosis — fully offline, on-device.
          </ThemedText>

          {isOffline && (
            <ThemedView type="backgroundElement" style={styles.offlineBadge}>
              <ThemedText type="smallBold">📡 Offline mode — diagnosis still works</ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.actions}>
          <Pressable onPress={() => router.push('/camera')} style={styles.primaryButton}>
            <ThemedText type="default" style={styles.primaryButtonText}>
              📷 Open camera
            </ThemedText>
          </Pressable>

          <Pressable onPress={handleUpload} style={styles.secondaryButton}>
            <ThemedText type="default">🖼️ Upload a photo</ThemedText>
          </Pressable>
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
    paddingBottom: BottomTabInset + Spacing.three,
  },
  settingsButton: {
    alignSelf: 'flex-end',
    marginTop: Spacing.two,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  offlineBadge: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  actions: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3c87f7',
  },
});
