import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPlotTags, getScanHistoryPage, type ScanRecord } from '@/lib/db';

const PAGE_SIZE = 20;

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

  function handlePickerChange(event: DateTimePickerEvent, date: Date | undefined) {
    const picker = activePicker;
    setActivePicker(null);
    if (event.type !== 'set' || !date || !picker) return;
    if (picker === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  }

  function clearFilters() {
    setStartDate(null);
    setEndDate(null);
  }

  const hasFilter = startDate !== null || endDate !== null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          History
        </ThemedText>

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
          <Pressable
            onPress={() => setActivePicker('start')}
            style={[styles.filterChip, { backgroundColor: theme.backgroundElement }]}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {startDate ? startDate.toLocaleDateString() : 'From'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setActivePicker('end')}
            style={[styles.filterChip, { backgroundColor: theme.backgroundElement }]}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {endDate ? endDate.toLocaleDateString() : 'To'}
            </ThemedText>
          </Pressable>

          {hasFilter && (
            <Pressable onPress={clearFilters} style={styles.clearButton}>
              <MaterialCommunityIcons name="close" size={14} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                Clear
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
            onChange={handlePickerChange}
          />
        )}

        {scans.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText type="default" themeColor="textSecondary">
              {hasFilter
                ? 'No scans in this date range.'
                : 'No scans yet. Diagnose a leaf from the Scan tab to see it here.'}
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={scans}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} /> : null}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/scan/${item.id}`)}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  <Image source={{ uri: item.photoUri }} style={styles.thumb} contentFit="cover" />
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">{item.displayName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {Math.round(item.confidence * 100)}% · {new Date(item.createdAt).toLocaleString()}
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            )}
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
  title: {
    fontSize: 32,
    lineHeight: 40,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
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
    paddingBottom: BottomTabInset + Spacing.three,
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
