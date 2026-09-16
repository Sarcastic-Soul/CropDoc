import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getScanHistory, type ScanRecord } from '@/lib/db';

export default function HistoryScreen() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      getScanHistory().then(setScans);
    }, [])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          History
        </ThemedText>

        {scans.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText type="default" themeColor="textSecondary">
              No scans yet. Diagnose a leaf from the Scan tab to see it here.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={scans}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
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
