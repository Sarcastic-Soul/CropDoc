import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getScansByBatchId, type ScanRecord } from '@/lib/db';
import { getTreatment, SEVERITY_COLOR } from '@/lib/model/treatments';

export default function BatchDetailScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const router = useRouter();
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      getScansByBatchId(batchId).then(setScans);
    }, [batchId])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('batchDetail.title', { count: scans.length })}
        </ThemedText>
        {scans[0] && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
            {new Date(scans[0].createdAt).toLocaleString()}
          </ThemedText>
        )}

        <FlatList
          data={scans}
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
                      {t('common.confidencePercent', { confidence: Math.round(item.confidence * 100) })}
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
  },
  date: {
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
