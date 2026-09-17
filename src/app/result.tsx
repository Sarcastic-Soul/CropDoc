import * as Network from 'expo-network';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosisResult, type SecondOpinionState } from '@/components/diagnosis-result';
import { PlotTagField } from '@/components/plot-tag-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGeminiKey } from '@/contexts/gemini-key';
import { saveScan, updateScanPlotTag, updateScanSecondOpinion } from '@/lib/db';
import { getSecondOpinion } from '@/lib/gemini';
import { classifyLeaf, type Prediction } from '@/lib/model/inference';
import { preprocessForModel } from '@/lib/model/preprocess';
import { getTreatment, type Treatment } from '@/lib/model/treatments';

export default function ResultScreen() {
  const { uri, width, height } = useLocalSearchParams<{ uri: string; width: string; height: string }>();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [scanId, setScanId] = useState<number | null>(null);
  const [plotTag, setPlotTag] = useState<string | null>(null);
  const [secondOpinion, setSecondOpinion] = useState<string | null>(null);
  const [secondOpinionState, setSecondOpinionState] = useState<SecondOpinionState>('idle');
  const { apiKey } = useGeminiKey();
  const { t } = useTranslation();

  useEffect(() => {
    Network.getNetworkStateAsync().then((state) => setIsOnline(Boolean(state.isConnected)));
  }, []);

  async function handlePlotTagChange(tag: string | null) {
    setPlotTag(tag);
    if (scanId !== null) {
      await updateScanPlotTag(scanId, tag);
    }
  }

  async function handleGetSecondOpinion() {
    if (!treatment || !apiKey) return;
    setSecondOpinionState('loading');
    try {
      const text = await getSecondOpinion(uri, treatment, apiKey);
      setSecondOpinion(text);
      setSecondOpinionState('idle');
      if (scanId !== null) {
        await updateScanSecondOpinion(scanId, text);
      }
    } catch {
      setSecondOpinionState('error');
    }
  }

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
        const id = await saveScan({
          photoUri: uri,
          label: result.label,
          displayName: treatmentInfo.displayName,
          confidence: result.confidence,
        });
        if (!cancelled) setScanId(id);
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
        {error && (
          <ThemedView style={styles.section}>
            <ThemedText type="default" themeColor="textSecondary">
              {t('result.diagnosisFailed', { error })}
            </ThemedText>
          </ThemedView>
        )}

        {!error && !prediction && (
          <ThemedView style={[styles.section, styles.loadingRow]}>
            <ActivityIndicator />
            <ThemedText type="default" themeColor="textSecondary">
              {t('result.analyzing')}
            </ThemedText>
          </ThemedView>
        )}

        {prediction && treatment && (
          <>
            <DiagnosisResult
              photoUri={uri}
              prediction={prediction}
              treatment={treatment}
              canRequestSecondOpinion={isOnline && Boolean(apiKey)}
              secondOpinion={secondOpinion}
              secondOpinionState={secondOpinionState}
              onRequestSecondOpinion={handleGetSecondOpinion}
            />
            <PlotTagField value={plotTag} onChange={handlePlotTagChange} />
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
});
