import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { saveScan } from '@/lib/db';
import { classifyLeaf, type Prediction } from '@/lib/model/inference';
import { preprocessForModel } from '@/lib/model/preprocess';
import { getTreatment, type Treatment } from '@/lib/model/treatments';

const SEVERITY_COLOR: Record<Treatment['severity'], string> = {
  none: '#2e9e4f',
  moderate: '#d9932a',
  severe: '#d1453b',
  unknown: '#60646c',
};

export default function ResultScreen() {
  const { uri, width, height } = useLocalSearchParams<{ uri: string; width: string; height: string }>();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const { input } = await preprocessForModel(uri, Number(width), Number(height));
        const result = await classifyLeaf(input);
        if (cancelled) return;
        const treatmentInfo = getTreatment(result.label);
        setPrediction(result);
        setTreatment(treatmentInfo);
        await saveScan({
          photoUri: uri,
          label: result.label,
          displayName: treatmentInfo.displayName,
          confidence: result.confidence,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [uri, width, height]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SafeAreaView edges={['bottom']}>
        <Image source={{ uri }} style={styles.photo} contentFit="cover" />

        {error && (
          <ThemedView style={styles.section}>
            <ThemedText type="default" themeColor="textSecondary">
              Diagnosis failed: {error}
            </ThemedText>
          </ThemedView>
        )}

        {!error && !prediction && (
          <ThemedView style={[styles.section, styles.loadingRow]}>
            <ActivityIndicator />
            <ThemedText type="default" themeColor="textSecondary">
              Analyzing leaf on-device…
            </ThemedText>
          </ThemedView>
        )}

        {prediction && treatment && (
          <>
            <ThemedView style={styles.section}>
              <ThemedView style={styles.titleRow}>
                <ThemedText type="subtitle">{treatment.displayName}</ThemedText>
                <ThemedView
                  style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[treatment.severity] }]}
                />
              </ThemedView>
              <ThemedText type="small" themeColor="textSecondary">
                {Math.round(prediction.confidence * 100)}% confidence · on-device
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="default">{treatment.description}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText type="smallBold" style={styles.treatmentHeading}>
                Treatment
              </ThemedText>
              {treatment.treatment.map((step, index) => (
                <ThemedView key={index} style={styles.stepRow}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {index + 1}.
                  </ThemedText>
                  <ThemedText type="default" style={styles.stepText}>
                    {step}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </>
        )}
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.six,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
  },
  section: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  treatmentHeading: {
    marginBottom: Spacing.one,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  stepText: {
    flex: 1,
  },
});
