import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import type { Prediction } from '@/lib/model/inference';
import { SEVERITY_COLOR, type Treatment } from '@/lib/model/treatments';

export type SecondOpinionState = 'idle' | 'loading' | 'error';

type Props = {
  photoUri: string;
  prediction: Prediction;
  treatment: Treatment;
  canRequestSecondOpinion: boolean;
  secondOpinion: string | null;
  secondOpinionState: SecondOpinionState;
  onRequestSecondOpinion: () => void;
};

export function DiagnosisResult({
  photoUri,
  prediction,
  treatment,
  canRequestSecondOpinion,
  secondOpinion,
  secondOpinionState,
  onRequestSecondOpinion,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />

      <ThemedView style={styles.section}>
        <ThemedView style={styles.titleRow}>
          <ThemedText type="subtitle">{treatment.displayName}</ThemedText>
          <ThemedView style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[treatment.severity] }]} />
        </ThemedView>
        <ThemedText type="small" themeColor="textSecondary">
          {t('diagnosis.confidenceOnDevice', { confidence: Math.round(prediction.confidence * 100) })}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="default">{treatment.description}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" style={styles.treatmentHeading}>
          {t('diagnosis.treatmentHeading')}
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

        {treatment.dosage && (
          <Pressable
            onPress={() => router.push({ pathname: '/dosage', params: { label: prediction.label } })}
            style={styles.dosageButton}>
            <ThemedText type="small" style={styles.dosageButtonText}>
              {t('diagnosis.calculateDosage', { product: treatment.dosage.product })}
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>

      {canRequestSecondOpinion && (
        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" style={styles.treatmentHeading}>
            {t('diagnosis.secondOpinionHeading')}
          </ThemedText>

          {secondOpinionState === 'idle' && !secondOpinion && (
            <Pressable onPress={onRequestSecondOpinion} style={styles.secondOpinionButton}>
              <ThemedText type="default" style={styles.secondOpinionButtonText}>
                {t('diagnosis.askGemini')}
              </ThemedText>
            </Pressable>
          )}

          {secondOpinionState === 'loading' && (
            <ThemedView style={styles.loadingRow}>
              <ActivityIndicator />
              <ThemedText type="default" themeColor="textSecondary">
                {t('diagnosis.askingGemini')}
              </ThemedText>
            </ThemedView>
          )}

          {secondOpinionState === 'error' && (
            <ThemedText type="default" themeColor="textSecondary">
              {t('diagnosis.secondOpinionError')}
            </ThemedText>
          )}

          {secondOpinion && (
            <ThemedView type="backgroundElement" style={styles.secondOpinionBox}>
              <ThemedText type="default">{secondOpinion}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
  dosageButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
  dosageButtonText: {
    color: Tint,
  },
  secondOpinionButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
  },
  secondOpinionButtonText: {
    color: '#ffffff',
  },
  secondOpinionBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
