import * as Network from 'expo-network';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosisResult, type SecondOpinionState } from '@/components/diagnosis-result';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import { PlotTagField } from '@/components/plot-tag-field';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGeminiKey } from '@/contexts/gemini-key';
import { getScanById, updateScanPlotTag, updateScanSecondOpinion, type ScanRecord } from '@/lib/db';
import { getSecondOpinion } from '@/lib/gemini';
import { getTreatment } from '@/lib/model/treatments';

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<ScanRecord | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [secondOpinion, setSecondOpinion] = useState<string | null>(null);
  const [secondOpinionState, setSecondOpinionState] = useState<SecondOpinionState>('idle');
  const { apiKey } = useGeminiKey();

  useEffect(() => {
    Network.getNetworkStateAsync().then((state) => setIsOnline(Boolean(state.isConnected)));
  }, []);

  useEffect(() => {
    getScanById(Number(id)).then((result) => {
      setRecord(result);
      setSecondOpinion(result?.secondOpinion ?? null);
    });
  }, [id]);

  async function handlePlotTagChange(tag: string | null) {
    if (!record) return;
    setRecord({ ...record, plotTag: tag });
    await updateScanPlotTag(record.id, tag);
  }

  async function handleGetSecondOpinion() {
    if (!record || !apiKey) return;
    setSecondOpinionState('loading');
    try {
      const treatment = getTreatment(record.label);
      const text = await getSecondOpinion(record.photoUri, treatment, apiKey);
      setSecondOpinion(text);
      setSecondOpinionState('idle');
      await updateScanSecondOpinion(record.id, text);
    } catch {
      setSecondOpinionState('error');
    }
  }

  if (!record) {
    return (
      <ThemedView style={[styles.section, styles.loadingRow]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const treatment = getTreatment(record.label);

  return (
    <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SafeAreaView edges={['bottom']}>
        <DiagnosisResult
          photoUri={record.photoUri}
          prediction={{ label: record.label, confidence: record.confidence }}
          treatment={treatment}
          canRequestSecondOpinion={isOnline && Boolean(apiKey)}
          secondOpinion={secondOpinion}
          secondOpinionState={secondOpinionState}
          onRequestSecondOpinion={handleGetSecondOpinion}
        />
        <PlotTagField value={record.plotTag} onChange={handlePlotTagChange} />
      </SafeAreaView>
    </KeyboardScrollView>
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
