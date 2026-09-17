import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getScansByPlotTag, type ScanRecord } from '@/lib/db';
import { getTreatment, SEVERITY_COLOR, SEVERITY_RANK } from '@/lib/model/treatments';

export default function PlotProgressionScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const router = useRouter();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      getScansByPlotTag(tag).then(setScans);
    }, [tag])
  );

  const latest = scans[scans.length - 1];
  const previous = scans[scans.length - 2];
  const latestSeverity = latest ? getTreatment(latest.label).severity : null;
  const previousSeverity = previous ? getTreatment(previous.label).severity : null;

  let trendMessage: string | null = null;
  if (latestSeverity && previousSeverity && SEVERITY_RANK[latestSeverity] >= 0 && SEVERITY_RANK[previousSeverity] >= 0) {
    if (SEVERITY_RANK[latestSeverity] > SEVERITY_RANK[previousSeverity]) {
      trendMessage = t('plot.worse');
    } else if (SEVERITY_RANK[latestSeverity] < SEVERITY_RANK[previousSeverity]) {
      trendMessage = t('plot.better');
    } else {
      trendMessage = t('plot.same');
    }
  }

  const rows = [...scans].reverse();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {tag}
        </ThemedText>

        {trendMessage && (
          <ThemedView type="backgroundElement" style={styles.trendBanner}>
            <ThemedText type="smallBold">{trendMessage}</ThemedText>
          </ThemedView>
        )}

        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const severity = getTreatment(item.label).severity;
            return (
              <Pressable onPress={() => router.push(`/scan/${item.id}`)}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  <Image source={{ uri: item.photoUri }} style={styles.thumb} contentFit="cover" />
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">{getTreatment(item.label).displayName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {new Date(item.createdAt).toLocaleString()}
                    </ThemedText>
                  </View>
                  <ThemedView style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[severity] }]} />
                </ThemedView>
              </Pressable>
            );
          }}
        />
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
    marginBottom: Spacing.three,
  },
  trendBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
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
});
