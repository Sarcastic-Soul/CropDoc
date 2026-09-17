import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing, Tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getScanHistoryPage } from '@/lib/db';
import { LLM_MODEL_APPROX_BYTES } from '@/lib/llm/config';
import { cancelModelDownload, downloadModel } from '@/lib/llm/download';
import { askLlm, isLlmReady, releaseLlm, setupLlm } from '@/lib/llm/engine';
import { deleteModelFile, isModelDownloaded } from '@/lib/llm/model-file';
import { retrieveTreatments } from '@/lib/llm/retrieval';
import { formatTreatmentContext, getTreatment } from '@/lib/model/treatments';

type Status = 'not-downloaded' | 'downloading' | 'downloaded' | 'setting-up' | 'ready';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ScanOption = {
  label: string;
  displayName: string;
};

// Selected scan + up to 2 keyword-retrieved matches — keeps the grounding
// budget small for a model this size. See lib/llm/engine.ts for why.
const MAX_GROUNDING_BLOCKS = 3;
const MAX_RETRIEVED_MATCHES = 2;

const APPROX_MB = Math.round(LLM_MODEL_APPROX_BYTES / 1_000_000);

export default function AskScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const scrollRef = useRef<KeyboardAwareScrollView>(null);

  const [status, setStatus] = useState<Status>(() =>
    isLlmReady() ? 'ready' : isModelDownloaded() ? 'downloaded' : 'not-downloaded'
  );
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [scanOptions, setScanOptions] = useState<ScanOption[]>([]);
  const [scanOptionsLoaded, setScanOptionsLoaded] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || scanOptionsLoaded) return;
    getScanHistoryPage({ limit: 50, offset: 0 }).then((scans) => {
      const seen = new Set<string>();
      const distinct: ScanOption[] = [];
      for (const scan of scans) {
        if (seen.has(scan.label)) continue;
        seen.add(scan.label);
        distinct.push({ label: scan.label, displayName: getTreatment(scan.label, i18n.language).displayName });
        if (distinct.length >= 8) break;
      }
      setScanOptions(distinct);
      setSelectedLabel(distinct[0]?.label ?? null);
      setScanOptionsLoaded(true);
    });
  }, [status, scanOptionsLoaded, i18n.language]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.();
  }, [messages, isAsking]);

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

  const handleRemoveModel = useCallback(() => {
    Alert.alert(t('ask.removeModelAlertTitle'), t('ask.removeModelAlertMessage'), [
      { text: t('ask.removeModelAlertCancel'), style: 'cancel' },
      {
        text: t('ask.removeModelAlertConfirm'),
        style: 'destructive',
        onPress: async () => {
          await releaseLlm();
          deleteModelFile();
          setMessages([]);
          setScanOptions([]);
          setScanOptionsLoaded(false);
          setSelectedLabel(null);
          setStatus('not-downloaded');
        },
      },
    ]);
  }, [t]);

  const handleSend = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;
    setQuestion('');
    const updatedMessages = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(updatedMessages);
    setIsAsking(true);
    try {
      const blocks: string[] = [];
      const usedLabels = new Set<string>();
      if (selectedLabel) {
        blocks.push(formatTreatmentContext(selectedLabel, getTreatment(selectedLabel, i18n.language)));
        usedLabels.add(selectedLabel);
      }
      for (const match of retrieveTreatments(trimmed, i18n.language, MAX_RETRIEVED_MATCHES)) {
        if (usedLabels.has(match.label) || blocks.length >= MAX_GROUNDING_BLOCKS) continue;
        blocks.push(formatTreatmentContext(match.label, match.treatment));
        usedLabels.add(match.label);
      }
      const answer = await askLlm(updatedMessages, blocks);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('ask.errorAsk') }]);
    } finally {
      setIsAsking(false);
    }
  }, [question, isAsking, messages, selectedLabel, i18n.language, t]);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        enableOnAndroid
        extraScrollHeight={Spacing.four}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            {t('ask.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t('ask.subtitle')}
          </ThemedText>

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
              <Pressable onPress={handleRemoveModel} style={styles.linkButton}>
                <ThemedText type="small" style={styles.dangerText}>
                  {t('ask.removeModel')}
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

          {status === 'ready' && (
            <>
              {scanOptions.length > 0 && (
                <>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                    {t('ask.contextLabel')}
                  </ThemedText>
                  <View style={styles.chipRow}>
                    <Pressable
                      onPress={() => setSelectedLabel(null)}
                      style={[
                        styles.chip,
                        { backgroundColor: selectedLabel === null ? theme.backgroundSelected : theme.backgroundElement },
                      ]}>
                      <ThemedText type="small" themeColor={selectedLabel === null ? 'text' : 'textSecondary'}>
                        {t('ask.generalChip')}
                      </ThemedText>
                    </Pressable>
                    {scanOptions.map((option) => {
                      const isSelected = option.label === selectedLabel;
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => setSelectedLabel(option.label)}
                          style={[
                            styles.chip,
                            { backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement },
                          ]}>
                          <ThemedText type="small" themeColor={isSelected ? 'text' : 'textSecondary'}>
                            {option.displayName}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={styles.messages}>
                {messages.map((message, index) => (
                  <View
                    key={index}
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: message.role === 'user' ? Tint : theme.backgroundElement,
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                      },
                    ]}>
                    <ThemedText type="small" style={message.role === 'user' ? styles.userBubbleText : undefined}>
                      {message.content}
                    </ThemedText>
                  </View>
                ))}
                {isAsking && (
                  <View style={[styles.bubble, { backgroundColor: theme.backgroundElement, alignSelf: 'flex-start' }]}>
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary" style={styles.thinkingText}>
                      {t('ask.thinking')}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder={t('ask.placeholder')}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                />
                <Pressable
                  onPress={handleSend}
                  disabled={!question.trim() || isAsking}
                  style={[styles.sendButton, (!question.trim() || isAsking) && styles.rowDisabled]}>
                  <ThemedText type="default" style={styles.primaryButtonText}>
                    {t('ask.send')}
                  </ThemedText>
                </Pressable>
              </View>

              <Pressable onPress={handleRemoveModel} style={styles.linkButton}>
                <ThemedText type="small" style={styles.dangerText}>
                  {t('ask.removeModel')}
                </ThemedText>
              </Pressable>
            </>
          )}
        </SafeAreaView>
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  safeArea: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    marginBottom: Spacing.two,
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
  sectionLabel: {
    marginTop: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  messages: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  userBubbleText: {
    color: '#ffffff',
  },
  thinkingText: {
    marginLeft: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end',
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
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Tint,
  },
});
