import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPlotTags, getScanHistoryPage, type ScanRecord } from '@/lib/db';
import { getTreatment } from '@/lib/model/treatments';

const PAGE_SIZE = 20;

type HistoryRow = { kind: 'single'; item: ScanRecord } | { kind: 'batch'; batchId: string; items: ScanRecord[] };

function groupHistoryRows(scans: ScanRecord[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const scan of scans) {
    const last = rows[rows.length - 1];
    if (scan.batchId && last?.kind === 'batch' && last.batchId === scan.batchId) {
      last.items.push(scan);
    } else if (scan.batchId) {
      rows.push({ kind: 'batch', batchId: scan.batchId, items: [scan] });
    } else {
      rows.push({ kind: 'single', item: scan });
    }
  }
  return rows;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

export default function HistoryScreen() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [plotTags, setPlotTags] = useState<string[]>([]);
  const offsetRef = useRef(0);
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const loadFirstPage = useCallback(() => {
    const query = {
      limit: PAGE_SIZE,
      offset: 0,
      startDate: startDate ? startOfDay(startDate) : undefined,
      endDate: endDate ? endOfDay(endDate) : undefined,
    };
    getScanHistoryPage(query).then((page) => {
      offsetRef.current = page.length;
      setScans(page);
      setHasMore(page.length === PAGE_SIZE);
    });
    getPlotTags().then(setPlotTags);
  }, [startDate, endDate]);

  useFocusEffect(loadFirstPage);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await getScanHistoryPage({
        limit: PAGE_SIZE,
        offset: offsetRef.current,
        startDate: startDate ? startOfDay(startDate) : undefined,
        endDate: endDate ? endOfDay(endDate) : undefined,
      });
      offsetRef.current += page.length;
      setScans((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  function handlePickerValueChange(_event: DateTimePickerChangeEvent, date: Date) {
    const picker = activePicker;
    setActivePicker(null);
    if (!picker) return;
    if (picker === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  }

  function handlePickerDismiss() {
    setActivePicker(null);
  }

  function clearFilters() {
    setStartDate(null);
    setEndDate(null);
  }

  const hasFilter = startDate !== null || endDate !== null;
  const rows = useMemo(() => groupHistoryRows(scans), [scans]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.title}>
            {t('history.title')}
          </ThemedText>
          <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={styles.settingsButton}>
            <MaterialCommunityIcons name="cog-outline" size={24} color={theme.text} />
          </Pressable>
        </View>

        {plotTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.plotRow} contentContainerStyle={styles.plotRowContent}>
            {plotTags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => router.push(`/plot/${encodeURIComponent(tag)}`)}
                style={[styles.filterChip, { backgroundColor: theme.backgroundElement }]}>
                <MaterialCommunityIcons name="sprout-outline" size={14} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {tag}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.filterRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('history.filterLabel')}
          </ThemedText>
          <Pressable
            onPress={() => setActivePicker('start')}
            style={[styles.filterChip, { backgroundColor: theme.backgroundElement }]}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {startDate ? startDate.toLocaleDateString() : t('history.from')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setActivePicker('end')}
            style={[styles.filterChip, { backgroundColor: theme.backgroundElement }]}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {endDate ? endDate.toLocaleDateString() : t('history.to')}
            </ThemedText>
          </Pressable>

          {hasFilter && (
            <Pressable onPress={clearFilters} style={styles.clearButton}>
              <MaterialCommunityIcons name="close" size={14} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {t('history.clear')}
              </ThemedText>
            </Pressable>
          )}
        </View>

        {activePicker && (
          <DateTimePicker
            value={(activePicker === 'start' ? startDate : endDate) ?? new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onValueChange={handlePickerValueChange}
            onDismiss={handlePickerDismiss}
          />
        )}

        {scans.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText type="default" themeColor="textSecondary">
              {hasFilter ? t('history.emptyFiltered') : t('history.emptyDefault')}
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => (row.kind === 'batch' ? `batch-${row.batchId}` : String(row.item.id))}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} /> : null}
            renderItem={({ item: row }) => {
              if (row.kind === 'batch') {
                const cover = row.items[0];
                return (
                  <Pressable onPress={() => router.push(`/batch/${row.batchId}`)}>
                    <ThemedView type="backgroundElement" style={styles.row}>
                      <Image source={{ uri: cover.photoUri }} style={styles.thumb} contentFit="cover" />
                      <View style={styles.rowText}>
                        <ThemedText type="smallBold">
                          {t('history.batchRow', { count: row.items.length })}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {new Date(cover.createdAt).toLocaleString()}
                        </ThemedText>
                      </View>
                      <MaterialCommunityIcons name="view-grid-outline" size={18} color={theme.textSecondary} />
                    </ThemedView>
                  </Pressable>
                );
              }
              const item = row.item;
              return (
                <Pressable onPress={() => router.push(`/scan/${item.id}`)}>
                  <ThemedView type="backgroundElement" style={styles.row}>
                    <Image source={{ uri: item.photoUri }} style={styles.thumb} contentFit="cover" />
                    <View style={styles.rowText}>
                      <ThemedText type="smallBold">{getTreatment(item.label).displayName}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {Math.round(item.confidence * 100)}% · {new Date(item.createdAt).toLocaleString()}
                      </ThemedText>
                    </View>
                  </ThemedView>
                </Pressable>
              );
            }}
          />
        )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  settingsButton: {
    padding: Spacing.one,
  },
  plotRow: {
    marginBottom: Spacing.two,
  },
  plotRowContent: {
    gap: Spacing.two,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.four,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  list: {
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  footerLoader: {
    marginVertical: Spacing.three,
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
});
