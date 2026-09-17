import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import { saveScan } from '@/lib/db';
import type { BatchItem } from '@/lib/model/batch';
import { getTreatment, SEVERITY_COLOR, SEVERITY_RANK } from '@/lib/model/treatments';

export default function BatchSummaryScreen() {
  const { items } = useLocalSearchParams<{ items: string }>();
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const results = useMemo<BatchItem[]>(() => {
    try {
      return JSON.parse(items) as BatchItem[];
    } catch {
      return [];
    }
  }, [items]);

  const worst = useMemo(() => {
    return results.reduce<BatchItem | null>((worstSoFar, item) => {
      const rank = SEVERITY_RANK[getTreatment(item.label).severity];
      if (rank < 0) return worstSoFar;
      const worstRank = worstSoFar ? SEVERITY_RANK[getTreatment(worstSoFar.label).severity] : -1;
      return rank > worstRank ? item : worstSoFar;
    }, null);
  }, [results]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of results) {
      map.set(item.label, (map.get(item.label) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(
      ([label, count]) => [getTreatment(label, i18n.language).displayName, count] as const
    );
  }, [results, i18n.language]);

  async function handleSaveAll() {
    if (isSaving || results.length === 0) return;
    setIsSaving(true);
    try {
      const batchId = `batch-${Date.now()}`;
      for (const item of results) {
        await saveScan({
          photoUri: item.photoUri,
          label: item.label,
          displayName: item.displayName,
          confidence: item.confidence,
          batchId,
        });
      }
      router.replace(`/batch/${batchId}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('batchSummary.title', { count: results.length })}
        </ThemedText>

        {worst && (
          <ThemedView type="backgroundElement" style={styles.worstBanner}>
            <ThemedView
              style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[getTreatment(worst.label).severity] }]}
            />
            <ThemedText type="smallBold">
              {t('batchSummary.worstFinding', { name: getTreatment(worst.label).displayName })}
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.countsRow}>
          {counts.map(([name, count]) => (
            <ThemedText key={name} type="small" themeColor="textSecondary">
              {count}× {name}
            </ThemedText>
          ))}
        </ThemedView>

        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.photoUri}-${index}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const severity = getTreatment(item.label).severity;
            return (
              <ThemedView type="backgroundElement" style={styles.row}>
                <Image source={{ uri: item.photoUri }} style={styles.thumb} contentFit="cover" />
                <View style={styles.rowText}>
                  <ThemedText type="smallBold">{getTreatment(item.label).displayName}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('common.confidencePercent', { confidence: Math.round(item.confidence * 100) })}
                  </ThemedText>
                </View>
                <ThemedView style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[severity] }]} />
              </ThemedView>
            );
          }}
        />

        <Pressable
          onPress={handleSaveAll}
          disabled={isSaving || results.length === 0}
          style={[styles.saveButton, (isSaving || results.length === 0) && styles.saveButtonDisabled]}>
          <ThemedText type="default" style={styles.saveButtonText}>
            {isSaving ? t('batchSummary.saving') : t('batchSummary.saveAll')}
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
    paddingHorizontal: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  worstBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  countsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
  },
});
