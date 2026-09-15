import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  useEffect(() => {
    Network.getNetworkStateAsync().then((state) => setIsOffline(!state.isConnected));
  }, []);

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, exif: false });
      if (!photo) return;
      router.push({
        pathname: '/result',
        params: { uri: photo.uri, width: String(photo.width), height: String(photo.height) },
      });
    } finally {
      setIsCapturing(false);
    }
  }

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.permissionSafeArea}>
          <ThemedText type="subtitle" style={styles.centerText}>
            Camera access needed
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
            CropDoc needs your camera to photograph crop leaves for diagnosis.
          </ThemedText>
          <Pressable onPress={requestPermission} style={styles.permissionButton}>
            <ThemedText type="default" style={styles.permissionButtonText}>
              Grant camera access
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {isOffline && (
        <SafeAreaView style={styles.offlineBadgeWrap} pointerEvents="none">
          <ThemedView type="backgroundElement" style={styles.offlineBadge}>
            <ThemedText type="smallBold">📡 Offline mode — diagnosis still works</ThemedText>
          </ThemedView>
        </SafeAreaView>
      )}

      <SafeAreaView style={styles.controls}>
        <Pressable
          onPress={handleCapture}
          disabled={isCapturing}
          style={[styles.shutter, isCapturing && styles.shutterDisabled]}>
          <ThemedView style={styles.shutterInner} />
        </Pressable>
        <ThemedText type="small" style={styles.hint}>
          Point at a single leaf, fill the frame, tap to scan
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: '#3c87f7',
  },
  permissionButtonText: {
    color: '#ffffff',
  },
  offlineBadgeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  offlineBadge: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Platform.select({ ios: BottomTabInset, android: BottomTabInset }) ?? Spacing.four,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  hint: {
    color: '#ffffff',
  },
});
