import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing, Tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const router = useRouter();
  const theme = useTheme();

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
          <MaterialCommunityIcons name="cog-outline" size={24} color={theme.text} />
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
              <MaterialCommunityIcons name="wifi-off" size={14} color={theme.text} />
              <ThemedText type="smallBold">Offline mode — diagnosis still works</ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.actions}>
          <Pressable onPress={() => router.push('/camera')} style={styles.primaryButton}>
            <MaterialCommunityIcons name="camera-outline" size={20} color="#ffffff" />
            <ThemedText type="default" style={styles.primaryButtonText}>
              Open camera
            </ThemedText>
          </Pressable>

          <Pressable onPress={handleUpload} style={styles.secondaryButton}>
            <MaterialCommunityIcons name="image-multiple-outline" size={20} color={theme.text} />
            <ThemedText type="default">Upload a photo</ThemedText>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: Tint,
  },
});
