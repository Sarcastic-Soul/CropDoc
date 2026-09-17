import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getScanHistoryPage, type ScanRecord } from '@/lib/db';
import { getTreatment } from '@/lib/model/treatments';

const PAGE_SIZE = 30;
const SHEET_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.7);

type Props = {
  visible: boolean;
  onSelect: (label: string) => void;
  onClose: () => void;
};

// Browses actual past scans (photo + date), not just a short list of distinct
// disease names — with potentially hundreds of scans, "Tomato — Early Blight"
// alone doesn't tell you which specific scan you meant.
//
// Two Android-only quirks this works around:
// - styles.list uses a fixed pixel height, not `flex`/`maxHeight` percentage:
//   this sheet's own height is content-derived (not a flex-bound ancestor),
//   so a percentage/flex height on the scrollable region doesn't resolve to
//   anything and it silently renders zero height. A concrete number
//   sidesteps that — same reason `sheet` below uses a computed pixel
//   maxHeight instead of a '70%' string. Plain ScrollView + map (not
//   FlatList) and a tap "load more" (not onEndReached) for the same reason —
//   both need real measured space to work.
// - The sheet is a plain `View` with an explicit `theme.background` color,
//   not `ThemedView` — a component that resolves its own color via
//   `useTheme()` while mounted as the direct child of a `Modal` gets an
//   unreliable (looks-like-light-mode) reading on Android on its first
//   render. Colors here all come from the `theme` this component already
//   resolved outside the Modal.
export function DiagnosisAttachPicker({ visible, onSelect, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const loadFirstPage = useCallback(() => {
    getScanHistoryPage({ limit: PAGE_SIZE, offset: 0 }).then((page) => {
      setScans(page);
      offsetRef.current = page.length;
      setHasMore(page.length === PAGE_SIZE);
    });
  }, []);

  useEffect(() => {
    if (visible) loadFirstPage();
  }, [visible, loadFirstPage]);

  function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    getScanHistoryPage({ limit: PAGE_SIZE, offset: offsetRef.current })
      .then((page) => {
        setScans((prev) => [...prev, ...page]);
        offsetRef.current += page.length;
        setHasMore(page.length === PAGE_SIZE);
      })
      .finally(() => setLoadingMore(false));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.background, borderColor: theme.backgroundSelected, maxHeight: SHEET_MAX_HEIGHT },
            ]}>
            <ThemedText type="smallBold" style={[styles.heading, { color: theme.text }]}>
              {t('ask.attachPickerTitle')}
            </ThemedText>
            <ThemedText type="small" style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t('ask.attachPickerSubtitle')}
            </ThemedText>
            {scans.length === 0 ? (
              <ThemedText type="small" style={[styles.empty, { color: theme.textSecondary }]}>
                {t('ask.attachPickerEmpty')}
              </ThemedText>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {scans.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => onSelect(item.label)}
                    style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                    <Image source={{ uri: item.photoUri }} style={styles.thumb} contentFit="cover" />
                    <View style={styles.rowText}>
                      <ThemedText type="default" numberOfLines={1} style={{ color: theme.text }}>
                        {getTreatment(item.label, i18n.language).displayName}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
                {hasMore && (
                  <Pressable onPress={loadMore} disabled={loadingMore} style={styles.loadMore}>
                    {loadingMore ? (
                      <ActivityIndicator size="small" color={theme.textSecondary} />
                    ) : (
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {t('ask.attachPickerLoadMore')}
                      </ThemedText>
                    )}
                  </Pressable>
                )}
              </ScrollView>
            )}
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t('ask.attachPickerCancel')}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  heading: {
    marginBottom: -Spacing.one,
  },
  subtitle: {
    marginBottom: Spacing.one,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  list: {
    height: 320,
  },
  listContent: {
    gap: Spacing.one,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Spacing.one,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  cancelButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
});
