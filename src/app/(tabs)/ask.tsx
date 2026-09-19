import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatHistorySidebar } from '@/components/chat-history-sidebar';
import { DiagnosisAttachPicker } from '@/components/diagnosis-attach-picker';
import { MarkdownText } from '@/components/markdown-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createConversation, getConversationMessages, saveConversationMessage, touchConversation } from '@/lib/db';
import { LLM_MODEL_APPROX_BYTES } from '@/lib/llm/config';
import { cancelModelDownload, downloadModel } from '@/lib/llm/download';
import { retrieveTreatmentsSemantic, warmTreatmentEmbeddings } from '@/lib/llm/embeddings';
import { askLlm, isLlmReady, setupLlm } from '@/lib/llm/engine';
import { isModelDownloaded } from '@/lib/llm/model-file';
import { retrieveTreatments, type RetrievedTreatment } from '@/lib/llm/retrieval';
import { formatTreatmentContext, getTreatment } from '@/lib/model/treatments';
import { cancelRecording, requestMicPermission, startRecording, stopRecording } from '@/lib/stt/recorder';
import { STT_MODEL_APPROX_BYTES } from '@/lib/stt/config';
import { downloadModel as downloadSttModel } from '@/lib/stt/download';
import { isSttReady, setupStt, transcribeAudio } from '@/lib/stt/engine';
import { isModelDownloaded as isSttModelDownloaded } from '@/lib/stt/model-file';
import { speakText, stopSpeaking } from '@/lib/tts';

type Status = 'not-downloaded' | 'downloading' | 'downloaded' | 'setting-up' | 'ready';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachedLabel?: string | null;
};

// Attached diagnosis (if any) + up to 2 keyword-retrieved matches — keeps
// the grounding budget small for a model this size. See lib/llm/engine.ts
// for why.
const MAX_GROUNDING_BLOCKS = 3;
const MAX_RETRIEVED_MATCHES = 2;

const APPROX_MB = Math.round(LLM_MODEL_APPROX_BYTES / 1_000_000);
const STT_APPROX_MB = Math.round(STT_MODEL_APPROX_BYTES / 1_000_000);

type SttStatus = 'idle' | 'downloading' | 'preparing' | 'recording' | 'transcribing';

function computeStatus(): Status {
  return isLlmReady() ? 'ready' : isModelDownloaded() ? 'downloaded' : 'not-downloaded';
}

export default function AskScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [status, setStatus] = useState<Status>(computeStatus);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [indexedLanguage, setIndexedLanguage] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachPickerOpen, setAttachPickerOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<string | null>(null);
  const [sttStatus, setSttStatus] = useState<SttStatus>('idle');
  const [sttProgress, setSttProgress] = useState(0);
  const lastAutoSpokenIndexRef = useRef(-1);

  // Cancels a still-running recording if this screen goes away mid-capture
  // (e.g. the user switches tabs) rather than leaving the mic open.
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, []);

  // Model can be removed from Settings while this tab stays mounted (tabs
  // don't unmount on blur) — re-derive on focus so we don't show a stale
  // "ready" state after that.
  useFocusEffect(
    useCallback(() => {
      setStatus((prev) => (prev === 'downloading' || prev === 'setting-up' ? prev : computeStatus()));
    }, [])
  );

  // One-time (per language) background pass that embeds all 38 treatment
  // entries via the already-loaded chat model and caches them in SQLite —
  // see lib/llm/embeddings.ts. The chat itself never waits on this; while it
  // runs (or if it fails), handleSend falls back to keyword retrieval.
  useEffect(() => {
    if (status !== 'ready' || indexedLanguage === i18n.language || isIndexing) return;
    const language = i18n.language;
    // setIsIndexing(true) deferred into a .then() rather than called
    // synchronously here — doesn't trip the "no setState directly in an
    // effect body" lint rule.
    Promise.resolve()
      .then(() => setIsIndexing(true))
      .then(() => warmTreatmentEmbeddings(language))
      .then(() => setIndexedLanguage(language))
      .catch(() => {})
      .finally(() => setIsIndexing(false));
  }, [status, indexedLanguage, isIndexing, i18n.language]);

  const isIndexReady = indexedLanguage === i18n.language;

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: true });
  }, [messages, isAsking]);

  // Reads each new assistant answer aloud as it arrives — the main reason
  // for having TTS at all is farmers who can't comfortably read the screen,
  // so replaying it after the fact isn't the primary path, this is.
  useEffect(() => {
    const lastIndex = messages.length - 1;
    if (!autoSpeak || lastIndex < 0 || lastIndex <= lastAutoSpokenIndexRef.current) return;
    const last = messages[lastIndex];
    if (last.role !== 'assistant') return;
    lastAutoSpokenIndexRef.current = lastIndex;
    // Deferred into a microtask rather than called synchronously here, same
    // as the indexing effect above — keeps this clear of the "no setState
    // directly in an effect body" lint rule.
    Promise.resolve().then(() => {
      setSpeakingIndex(lastIndex);
      speakText(last.content, i18n.language, {
        onDone: () => setSpeakingIndex((current) => (current === lastIndex ? null : current)),
        onStopped: () => setSpeakingIndex((current) => (current === lastIndex ? null : current)),
        onError: () => setSpeakingIndex((current) => (current === lastIndex ? null : current)),
      });
    });
  }, [messages, autoSpeak, i18n.language]);

  useEffect(() => stopSpeaking, []);

  const handleToggleSpeak = useCallback(
    (index: number, content: string) => {
      stopSpeaking();
      if (speakingIndex === index) {
        setSpeakingIndex(null);
        return;
      }
      setSpeakingIndex(index);
      speakText(content, i18n.language, {
        onDone: () => setSpeakingIndex((current) => (current === index ? null : current)),
        onStopped: () => setSpeakingIndex((current) => (current === index ? null : current)),
        onError: () => setSpeakingIndex((current) => (current === index ? null : current)),
      });
    },
    [speakingIndex, i18n.language]
  );

  const handleToggleAutoSpeak = useCallback(() => {
    stopSpeaking();
    setSpeakingIndex(null);
    setAutoSpeak((prev) => !prev);
  }, []);

  const handleDownload = useCallback(async () => {
    setStatus('downloading');
    setProgress(0);
    try {
      await downloadModel(setProgress);
      setStatus('downloaded');
    } catch {
      setStatus('not-downloaded');
      Alert.alert(t('ask.errorDownload'));
    }
  }, [t]);

  const handleCancelDownload = useCallback(() => {
    cancelModelDownload();
    setStatus('not-downloaded');
    setProgress(0);
  }, []);

  const handleSetup = useCallback(async () => {
    setStatus('setting-up');
    setProgress(0);
    try {
      await setupLlm(setProgress);
      setStatus('ready');
    } catch {
      setStatus('downloaded');
      Alert.alert(t('ask.errorSetup'));
    }
  }, [t]);

  const handleNewChat = useCallback(() => {
    stopSpeaking();
    setMessages([]);
    setActiveConversationId(null);
    setPendingAttachment(null);
    setSpeakingIndex(null);
    lastAutoSpokenIndexRef.current = -1;
  }, []);

  const handleSelectConversation = useCallback(async (id: number) => {
    const rows = await getConversationMessages(id);
    stopSpeaking();
    setMessages(rows.map((row) => ({ role: row.role, content: row.content, attachedLabel: row.attachedLabel })));
    setActiveConversationId(id);
    setHistoryOpen(false);
    setSpeakingIndex(null);
    // Loaded history shouldn't be auto-spoken as if it just arrived.
    lastAutoSpokenIndexRef.current = rows.length - 1;
  }, []);

  const handleSelectAttachment = useCallback((label: string) => {
    setPendingAttachment(label);
    setAttachPickerOpen(false);
  }, []);

  const handleMicPress = useCallback(async () => {
    if (sttStatus === 'recording') {
      setSttStatus('transcribing');
      try {
        const wavPath = await stopRecording();
        const text = await transcribeAudio(wavPath, i18n.language);
        if (text) setQuestion((prev) => (prev ? `${prev} ${text}` : text));
      } catch {
        Alert.alert(t('ask.micError'));
      } finally {
        setSttStatus('idle');
      }
      return;
    }

    if (sttStatus !== 'idle') return;

    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert(t('ask.micPermissionDenied'));
      return;
    }

    const beginRecording = async () => {
      try {
        if (!isSttReady()) {
          setSttStatus('preparing');
          await setupStt();
        }
        setSttStatus('recording');
        await startRecording();
      } catch {
        setSttStatus('idle');
        Alert.alert(t('ask.micError'));
      }
    };

    if (!isSttModelDownloaded()) {
      Alert.alert(t('ask.micDownloadConfirmTitle'), t('ask.micDownloadConfirmMessage', { size: STT_APPROX_MB }), [
        { text: t('ask.micDownloadConfirmCancel'), style: 'cancel' },
        {
          text: t('ask.micDownloadConfirmConfirm'),
          onPress: async () => {
            setSttStatus('downloading');
            try {
              await downloadSttModel(setSttProgress);
            } catch {
              setSttStatus('idle');
              Alert.alert(t('ask.micError'));
              return;
            }
            await beginRecording();
          },
        },
      ]);
      return;
    }

    await beginRecording();
  }, [sttStatus, i18n.language, t]);

  const handleSend = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;
    setQuestion('');
    const attachedLabelForMessage = pendingAttachment;
    setPendingAttachment(null);
    const updatedMessages = [
      ...messages,
      { role: 'user' as const, content: trimmed, attachedLabel: attachedLabelForMessage },
    ];
    setMessages(updatedMessages);
    setIsAsking(true);
    try {
      let conversationId = activeConversationId;
      if (conversationId === null) {
        conversationId = await createConversation();
        setActiveConversationId(conversationId);
      }
      await saveConversationMessage(conversationId, 'user', trimmed, attachedLabelForMessage);
      await touchConversation(conversationId);

      const blocks: string[] = [];
      const usedLabels = new Set<string>();
      if (attachedLabelForMessage && !usedLabels.has(attachedLabelForMessage) && blocks.length < MAX_GROUNDING_BLOCKS) {
        blocks.push(formatTreatmentContext(attachedLabelForMessage, getTreatment(attachedLabelForMessage, i18n.language)));
        usedLabels.add(attachedLabelForMessage);
      }
      let matches: RetrievedTreatment[];
      try {
        matches = isIndexReady
          ? await retrieveTreatmentsSemantic(trimmed, i18n.language, MAX_RETRIEVED_MATCHES)
          : retrieveTreatments(trimmed, i18n.language, MAX_RETRIEVED_MATCHES);
      } catch {
        // Semantic path hit a native error (e.g. embedding() call failed) —
        // keyword overlap is always available and never throws.
        matches = retrieveTreatments(trimmed, i18n.language, MAX_RETRIEVED_MATCHES);
      }
      for (const match of matches) {
        if (usedLabels.has(match.label) || blocks.length >= MAX_GROUNDING_BLOCKS) continue;
        blocks.push(formatTreatmentContext(match.label, match.treatment));
        usedLabels.add(match.label);
      }
      const answer = await askLlm(updatedMessages, blocks);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      await saveConversationMessage(conversationId, 'assistant', answer, null);
      await touchConversation(conversationId);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('ask.errorAsk') }]);
    } finally {
      setIsAsking(false);
    }
  }, [question, isAsking, messages, pendingAttachment, activeConversationId, isIndexReady, i18n.language, t]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Pressable onPress={() => setHistoryOpen(true)} hitSlop={12} style={styles.iconButton}>
              <MaterialCommunityIcons name="menu" size={22} color={theme.text} />
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {t('ask.title')}
            </ThemedText>
          </View>
          <View style={styles.titleRight}>
            {status === 'ready' && (
              <>
                <Pressable onPress={handleNewChat} hitSlop={12} style={styles.iconButton}>
                  <MaterialCommunityIcons name="plus" size={22} color={theme.text} />
                </Pressable>
                <Pressable onPress={handleToggleAutoSpeak} hitSlop={12} style={styles.iconButton}>
                  <MaterialCommunityIcons
                    name={autoSpeak ? 'volume-high' : 'volume-off'}
                    size={22}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </>
            )}
            <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={styles.iconButton}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {status === 'not-downloaded' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{t('ask.downloadHeading')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('ask.downloadDesc', { size: APPROX_MB })}
            </ThemedText>
            <Pressable onPress={handleDownload} style={styles.primaryButton}>
              <ThemedText type="default" style={styles.primaryButtonText}>
                {t('ask.downloadButton')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {status === 'downloading' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{t('ask.downloading', { percent: Math.round(progress * 100) })}</ThemedText>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Pressable onPress={handleCancelDownload} style={styles.linkButton}>
              <ThemedText type="small" style={styles.dangerText}>
                {t('ask.cancelDownload')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {status === 'downloaded' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{t('ask.setupHeading')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('ask.setupDesc')}
            </ThemedText>
            <Pressable onPress={handleSetup} style={styles.primaryButton}>
              <ThemedText type="default" style={styles.primaryButtonText}>
                {t('ask.setupButton')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {status === 'setting-up' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{t('ask.settingUp', { percent: Math.round(progress * 100) })}</ThemedText>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </ThemedView>
        )}

        {status === 'ready' && isIndexing && (
          <View style={styles.indexingRow}>
            <ActivityIndicator size="small" color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('ask.indexing')}
            </ThemedText>
          </View>
        )}
      </SafeAreaView>

      {status === 'ready' && (
        <KeyboardAvoidingView style={styles.keyboardArea} behavior="padding">
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled">
            {messages.map((message, index) => {
              const attachment = message.attachedLabel
                ? getTreatment(message.attachedLabel, i18n.language).displayName
                : null;
              return (
                <View
                  key={index}
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: message.role === 'user' ? Tint : theme.backgroundElement,
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    },
                  ]}>
                  {attachment && (
                    <View style={[styles.attachmentChip, { backgroundColor: theme.backgroundSelected }]}>
                      <MaterialCommunityIcons name="leaf" size={12} color={theme.text} />
                      <ThemedText type="small">{attachment}</ThemedText>
                    </View>
                  )}
                  {message.role === 'assistant' ? (
                    <MarkdownText type="small" style={styles.bubbleText}>
                      {message.content}
                    </MarkdownText>
                  ) : (
                    <ThemedText type="small" style={[styles.userBubbleText, styles.bubbleText]}>
                      {message.content}
                    </ThemedText>
                  )}
                  {message.role === 'assistant' && (
                    <Pressable
                      onPress={() => handleToggleSpeak(index, message.content)}
                      hitSlop={8}
                      style={[styles.speakBadge, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
                      <MaterialCommunityIcons
                        name={speakingIndex === index ? 'volume-high' : 'volume-medium'}
                        size={14}
                        color={theme.textSecondary}
                      />
                    </Pressable>
                  )}
                </View>
              );
            })}
            {isAsking && (
              <View style={[styles.bubble, { backgroundColor: theme.backgroundElement, alignSelf: 'flex-start' }]}>
                <ActivityIndicator size="small" color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.thinkingText}>
                  {t('ask.thinking')}
                </ThemedText>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputBar}>
            {sttStatus === 'downloading' && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('ask.micDownloading', { percent: Math.round(sttProgress * 100) })}
              </ThemedText>
            )}
            {sttStatus === 'preparing' && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('ask.micPreparing')}
              </ThemedText>
            )}
            {sttStatus === 'recording' && (
              <ThemedText type="small" style={styles.dangerText}>
                {t('ask.micRecording')}
              </ThemedText>
            )}
            {sttStatus === 'transcribing' && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('ask.micTranscribing')}
              </ThemedText>
            )}
            {pendingAttachment && (
              <View style={[styles.pendingChip, { backgroundColor: theme.backgroundElement }]}>
                <MaterialCommunityIcons name="leaf" size={14} color={theme.text} />
                <ThemedText type="small" style={styles.pendingChipText}>
                  {getTreatment(pendingAttachment, i18n.language).displayName}
                </ThemedText>
                <Pressable onPress={() => setPendingAttachment(null)} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={14} color={theme.textSecondary} />
                </Pressable>
              </View>
            )}
            <View style={styles.inputRow}>
              <Pressable onPress={() => setAttachPickerOpen(true)} hitSlop={8} style={styles.attachButton}>
                <MaterialCommunityIcons name="leaf" size={20} color={theme.textSecondary} />
              </Pressable>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder={t('ask.placeholder')}
                placeholderTextColor={theme.textSecondary}
                selectionColor={Tint}
                multiline
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
              <Pressable
                onPress={handleMicPress}
                disabled={sttStatus === 'downloading' || sttStatus === 'preparing' || sttStatus === 'transcribing'}
                hitSlop={8}
                style={styles.micButton}>
                {sttStatus === 'downloading' || sttStatus === 'preparing' || sttStatus === 'transcribing' ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <MaterialCommunityIcons
                    name={sttStatus === 'recording' ? 'microphone' : 'microphone-outline'}
                    size={22}
                    color={sttStatus === 'recording' ? '#d1453b' : theme.textSecondary}
                  />
                )}
              </Pressable>
              <Pressable
                onPress={handleSend}
                disabled={!question.trim() || isAsking}
                style={[styles.sendButton, (!question.trim() || isAsking) && styles.rowDisabled]}>
                <MaterialCommunityIcons name="send" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <ChatHistorySidebar
        visible={historyOpen}
        activeConversationId={activeConversationId}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectConversation}
      />
      <DiagnosisAttachPicker
        visible={attachPickerOpen}
        onSelect={handleSelectAttachment}
        onClose={() => setAttachPickerOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafeArea: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconButton: {
    padding: Spacing.one,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  dangerText: {
    color: '#d1453b',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  progressTrack: {
    height: 8,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Tint,
  },
  indexingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  keyboardArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  messages: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubble: {
    position: 'relative',
    maxWidth: '85%',
    padding: Spacing.two,
    paddingTop: Spacing.three,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.half,
    paddingVertical: 2,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.four,
    marginBottom: Spacing.one,
  },
  userBubbleText: {
    color: '#ffffff',
  },
  bubbleText: {
    flexShrink: 1,
  },
  speakBadge: {
    position: 'absolute',
    top: -Spacing.two,
    right: -Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingText: {
    marginStart: Spacing.one,
  },
  inputBar: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.four,
  },
  pendingChipText: {
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  attachButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  micButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
