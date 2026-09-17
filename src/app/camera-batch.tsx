import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraPermissionGate } from '@/components/camera-permission-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { classifyLeaf } from '@/lib/model/inference';
import { preprocessForModel } from '@/lib/model/preprocess';
import { getTreatment } from '@/lib/model/treatments';
import type { BatchItem } from '@/lib/model/batch';

export default function CameraBatchScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [results, setResults] = useState<BatchItem[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    Network.getNetworkStateAsync().then((state) => setIsOffline(!state.isConnected));
  }, []);

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, exif: false });
      if (!photo) return;
      const { input } = await preprocessForModel(photo.uri, photo.width, photo.height);
      const prediction = await classifyLeaf(input);
      const treatment = getTreatment(prediction.label);
      setResults((prev) => [
        ...prev,
        {
          photoUri: photo.uri,
          label: prediction.label,
          displayName: treatment.displayName,
          confidence: prediction.confidence,
        },
      ]);
    } finally {
      setIsCapturing(false);
    }
  }

  function handleFinish() {
    router.push({ pathname: '/batch-summary', params: { items: JSON.stringify(results) } });
  }

  if (!permission) {
    return <ThemedView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <CameraPermissionGate
        message="CropDoc needs your camera to batch-scan crop leaves for diagnosis."
        onRequest={requestPermission}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={20} color="#ffffff" />
        </Pressable>

        <ThemedView type="backgroundElement" style={styles.countBadge}>
          <MaterialCommunityIcons name="leaf" size={14} color={theme.text} />
          <ThemedText type="smallBold">{results.length} scanned</ThemedText>
        </ThemedView>

        {isOffline && (
          <ThemedView type="backgroundElement" style={styles.offlineBadge}>
            <MaterialCommunityIcons name="wifi-off" size={14} color={theme.text} />
            <ThemedText type="smallBold">Offline mode — diagnosis still works</ThemedText>
          </ThemedView>
        )}
      </SafeAreaView>

      <SafeAreaView style={styles.controls}>
        <ThemedText type="small" style={styles.hint}>
          Point at a leaf, fill the frame, tap to scan — repeat for each leaf
        </ThemedText>
        <ThemedView style={styles.controlsRow}>
          <Pressable
            onPress={handleFinish}
            disabled={results.length === 0}
            style={[styles.finishButton, results.length === 0 && styles.finishButtonDisabled]}>
            <ThemedText type="default" style={styles.finishButtonText}>
              Done
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleCapture}
            disabled={isCapturing}
            style={[styles.shutter, isCapturing && styles.shutterDisabled]}>
            {isCapturing ? <ActivityIndicator color="#000000" /> : <ThemedView style={styles.shutterInner} />}
          </Pressable>

          <ThemedView style={styles.finishButtonSpacer} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
    textAlign: 'center',
  },
  finishButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
  },
  finishButtonDisabled: {
    opacity: 0.4,
  },
  finishButtonText: {
    color: '#ffffff',
  },
  finishButtonSpacer: {
    width: 76,
    backgroundColor: 'transparent',
  },
});
