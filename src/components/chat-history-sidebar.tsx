import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ConversationSummary, getConversations } from '@/lib/db';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);

type Props = {
  visible: boolean;
  activeConversationId: number | null;
  onClose: () => void;
  onSelect: (id: number) => void;
};

export function ChatHistorySidebar({ visible, activeConversationId, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [translateX] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    getConversations().then(setConversations);
  }, [visible, activeConversationId]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_WIDTH, backgroundColor: theme.background, transform: [{ translateX }] },
        ]}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="smallBold" style={[styles.heading, { color: theme.text }]}>
            {t('ask.historyTitle')}
          </ThemedText>
          <ScrollView contentContainerStyle={styles.list}>
            {conversations.length === 0 && (
              <ThemedText type="small" style={[styles.emptyText, { color: theme.textSecondary }]}>
                {t('ask.historyEmpty')}
              </ThemedText>
            )}
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const day = conversation.previewCreatedAt
                ? new Date(conversation.previewCreatedAt).toLocaleDateString(i18n.language)
                : new Date(conversation.createdAt).toLocaleDateString(i18n.language);
              const time = conversation.previewCreatedAt
                ? new Date(conversation.previewCreatedAt).toLocaleTimeString(i18n.language, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              return (
                <Pressable
                  key={conversation.id}
                  onPress={() => onSelect(conversation.id)}
                  style={[
                    styles.row,
                    { backgroundColor: isActive ? theme.backgroundSelected : theme.backgroundElement },
                  ]}>
                  <ThemedText type="small" numberOfLines={2} style={[styles.preview, { color: theme.text }]}>
                    {conversation.previewContent ?? t('ask.historyEmptyPreview')}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {day} · {time}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000aa',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  heading: {
    marginBottom: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  emptyText: {
    paddingVertical: Spacing.three,
  },
  row: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
  preview: {
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
  },
});
