import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropdownField } from '@/components/dropdown-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractRateFromText, formatRate, recognizeLabelText, type ParsedLabelRate } from '@/lib/dosage/label-ocr';
import { CROPS, LABEL_TO_CROP, type Label } from '@/lib/model/labels';
import { getAllTreatments, SEVERITY_COLOR, type Treatment } from '@/lib/model/treatments';

type LabelResult =
  | { status: 'no-rate' }
  | { status: 'error' }
  | { status: 'unit-mismatch'; parsed: ParsedLabelRate }
  | { status: 'match'; parsed: ParsedLabelRate }
  | { status: 'mismatch'; parsed: ParsedLabelRate };

type AreaUnit = 'm2' | 'hectare' | 'acre';
type Mode = 'area' | 'plants';

const AREA_TO_HECTARES: Record<AreaUnit, number> = {
  m2: 1 / 10000,
  hectare: 1,
  acre: 0.404686,
};

const AREA_UNIT_LABEL: Record<AreaUnit, string> = {
  m2: 'm²',
  hectare: 'ha',
  acre: 'acre',
};

function parseNumber(value: string): number | null {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

export default function DosageCalculatorScreen() {
  const { label: preselectLabel, labelScanUri } = useLocalSearchParams<{ label?: string; labelScanUri?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lastProcessedScanUriRef = useRef<string | null>(null);
  const allTreatments = useMemo(() => getAllTreatments(i18n.language), [i18n.language]);
  const preselectCrop =
    preselectLabel && LABEL_TO_CROP[preselectLabel as Label] ? LABEL_TO_CROP[preselectLabel as Label] : null;
  const [selectedCrop, setSelectedCrop] = useState<string | null>(preselectCrop ?? CROPS[0] ?? null);
  const diseases = useMemo(
    () => allTreatments.filter(([label]) => LABEL_TO_CROP[label as Label] === selectedCrop),
    [allTreatments, selectedCrop]
  );
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    diseases.some(([label]) => label === preselectLabel) ? (preselectLabel as string) : diseases[0]?.[0] ?? null
  );

  function handleSelectCrop(crop: string) {
    setSelectedCrop(crop);
    const first = allTreatments.find(([label]) => LABEL_TO_CROP[label as Label] === crop);
    setSelectedLabel(first?.[0] ?? null);
    setLabelResult(null);
  }

  const [mode, setMode] = useState<Mode>('area');
  const [areaValue, setAreaValue] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('hectare');
  const [waterPerHectare, setWaterPerHectare] = useState('500');
  const [plantCount, setPlantCount] = useState('');
  const [waterPerPlantMl, setWaterPerPlantMl] = useState('300');
  const [isScanningLabel, setIsScanningLabel] = useState(false);
  const [labelResult, setLabelResult] = useState<LabelResult | null>(null);
  const theme = useTheme();

  const selected: Treatment | undefined = diseases.find(([label]) => label === selectedLabel)?.[1];

  function handleSelectDisease(label: string) {
    setSelectedLabel(label);
    setLabelResult(null);
  }

  function handleScanLabel() {
    if (!selected?.dosage) return;
    router.push({ pathname: '/camera', params: { mode: 'label-scan' } });
  }

  useEffect(() => {
    if (!labelScanUri || labelScanUri === lastProcessedScanUriRef.current || !selected?.dosage) return;
    lastProcessedScanUriRef.current = labelScanUri;
    const dosage = selected.dosage;

    (async () => {
      setIsScanningLabel(true);
      setLabelResult(null);
      try {
        const text = await recognizeLabelText(labelScanUri, i18n.language);
        const parsed = extractRateFromText(text);
        if (!parsed) {
          setLabelResult({ status: 'no-rate' });
          return;
        }
        if (parsed.unit !== dosage.unit) {
          setLabelResult({ status: 'unit-mismatch', parsed });
          return;
        }
        const overlaps = parsed.min <= dosage.rateMax && parsed.max >= dosage.rateMin;
        setLabelResult({ status: overlaps ? 'match' : 'mismatch', parsed });
      } catch {
        setLabelResult({ status: 'error' });
      } finally {
        setIsScanningLabel(false);
        router.setParams({ labelScanUri: undefined });
      }
    })();
  }, [labelScanUri, selected, i18n.language, router]);

  const totalWaterLiters = useMemo(() => {
    if (mode === 'area') {
      const area = parseNumber(areaValue);
      const perHectare = parseNumber(waterPerHectare);
      if (area === null || perHectare === null) return null;
      return area * AREA_TO_HECTARES[areaUnit] * perHectare;
    }
    const plants = parseNumber(plantCount);
    const perPlantMl = parseNumber(waterPerPlantMl);
    if (plants === null || perPlantMl === null) return null;
    return (plants * perPlantMl) / 1000;
  }, [mode, areaValue, areaUnit, waterPerHectare, plantCount, waterPerPlantMl]);

  const productRange = useMemo(() => {
    if (!selected?.dosage || totalWaterLiters === null) return null;
    const { rateMin, rateMax, unit } = selected.dosage;
    return { min: totalWaterLiters * rateMin, max: totalWaterLiters * rateMax, unit };
  }, [selected, totalWaterLiters]);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        enableOnAndroid
        extraScrollHeight={Spacing.four}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.title}>
              {t('nav.dosageCalculator')}
            </ThemedText>
            <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={styles.settingsButton}>
              <MaterialCommunityIcons name="cog-outline" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            {t('dosage.cropLabel')}
          </ThemedText>
          <DropdownField
            title={t('dosage.cropLabel')}
            value={selectedCrop}
            onChange={handleSelectCrop}
            placeholder={t('dosage.selectCrop')}
            options={CROPS.map((crop) => ({ value: crop, label: crop }))}
          />

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            {t('dosage.diseaseLabel')}
          </ThemedText>
          <DropdownField
            title={t('dosage.diseaseLabel')}
            value={selectedLabel}
            onChange={handleSelectDisease}
            placeholder={t('dosage.selectDisease')}
            options={diseases.map(([label, treatment]) => ({ value: label, label: treatment.displayName }))}
          />

          {selected && !selected.dosage && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              {t('dosage.noDosageGuidance')}
            </ThemedText>
          )}

          {selected?.dosage && (
            <ThemedView type="backgroundElement" style={styles.productBox}>
              <ThemedText type="smallBold">{selected.dosage.product}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('dosage.typicalRate', {
                  min: selected.dosage.rateMin,
                  max: selected.dosage.rateMax,
                  unit: selected.dosage.unit,
                })}
              </ThemedText>

              <Pressable
                onPress={handleScanLabel}
                disabled={isScanningLabel}
                style={[styles.scanLabelButton, { borderColor: theme.backgroundSelected }, isScanningLabel && styles.rowDisabled]}>
                <MaterialCommunityIcons name="text-recognition" size={16} color={theme.text} />
                <ThemedText type="small">{isScanningLabel ? t('dosage.scanningLabel') : t('dosage.scanLabel')}</ThemedText>
              </Pressable>

              {labelResult && (
                <View style={styles.labelResultBox}>
                  {labelResult.status === 'no-rate' && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('dosage.labelNoRateFound')}
                    </ThemedText>
                  )}
                  {labelResult.status === 'error' && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('dosage.labelReadError')}
                    </ThemedText>
                  )}
                  {labelResult.status === 'unit-mismatch' && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('dosage.labelUnitMismatch', {
                        rate: formatRate(labelResult.parsed.min, labelResult.parsed.max, labelResult.parsed.unit),
                      })}
                    </ThemedText>
                  )}
                  {labelResult.status === 'match' && (
                    <ThemedText type="small" style={{ color: SEVERITY_COLOR.none }}>
                      {t('dosage.labelWithinRange', {
                        rate: formatRate(labelResult.parsed.min, labelResult.parsed.max, labelResult.parsed.unit),
                      })}
                    </ThemedText>
                  )}
                  {labelResult.status === 'mismatch' && (
                    <ThemedText type="small" style={{ color: SEVERITY_COLOR.moderate }}>
                      {t('dosage.labelOutsideRange', {
                        rate: formatRate(labelResult.parsed.min, labelResult.parsed.max, labelResult.parsed.unit),
                        typicalRate: formatRate(selected.dosage.rateMin, selected.dosage.rateMax, selected.dosage.unit),
                      })}
                    </ThemedText>
                  )}
                </View>
              )}
            </ThemedView>
          )}

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            {t('dosage.measureByLabel')}
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.segmented}>
            <Pressable
              onPress={() => setMode('area')}
              style={[styles.segment, mode === 'area' && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor={mode === 'area' ? 'text' : 'textSecondary'}>
                {t('dosage.byArea')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setMode('plants')}
              style={[styles.segment, mode === 'plants' && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor={mode === 'plants' ? 'text' : 'textSecondary'}>
                {t('dosage.byPlants')}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {mode === 'area' ? (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('dosage.plotSizeLabel')}
              </ThemedText>
              <View style={styles.row}>
                <TextInput
                  value={areaValue}
                  onChangeText={setAreaValue}
                  keyboardType="decimal-pad"
                  placeholder={t('dosage.plotSizePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  selectionColor={Tint}
                  style={[
                    styles.input,
                    styles.flexInput,
                    { color: theme.text, borderColor: theme.backgroundSelected },
                  ]}
                />
                <View style={styles.unitRow}>
                  {(['m2', 'hectare', 'acre'] as AreaUnit[]).map((unit) => (
                    <Pressable
                      key={unit}
                      onPress={() => setAreaUnit(unit)}
                      style={[
                        styles.unitChip,
                        { backgroundColor: areaUnit === unit ? theme.backgroundSelected : theme.backgroundElement },
                      ]}>
                      <ThemedText type="small" themeColor={areaUnit === unit ? 'text' : 'textSecondary'}>
                        {AREA_UNIT_LABEL[unit]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('dosage.waterPerHectareLabel')}
              </ThemedText>
              <TextInput
                value={waterPerHectare}
                onChangeText={setWaterPerHectare}
                keyboardType="decimal-pad"
                placeholder={t('dosage.waterPerHectarePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                selectionColor={Tint}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
            </>
          ) : (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('dosage.plantCountLabel')}
              </ThemedText>
              <TextInput
                value={plantCount}
                onChangeText={setPlantCount}
                keyboardType="number-pad"
                placeholder={t('dosage.plantCountPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                selectionColor={Tint}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('dosage.waterPerPlantLabel')}
              </ThemedText>
              <TextInput
                value={waterPerPlantMl}
                onChangeText={setWaterPerPlantMl}
                keyboardType="decimal-pad"
                placeholder={t('dosage.waterPerPlantPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                selectionColor={Tint}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
            </>
          )}

          {productRange && selected?.dosage && (
            <ThemedView type="backgroundElement" style={styles.resultBox}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('dosage.resultLabel')}
              </ThemedText>
              <ThemedText type="title" style={styles.resultValue}>
                {productRange.min.toFixed(1)}–{productRange.max.toFixed(1)} {productRange.unit.split('/')[0]}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('dosage.resultOf', {
                  product: selected.dosage.product,
                  liters: totalWaterLiters?.toFixed(1),
                })}
              </ThemedText>
            </ThemedView>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            {t('dosage.disclaimer')}
          </ThemedText>
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
    paddingBottom: Spacing.four,
  },
  safeArea: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  settingsButton: {
    padding: Spacing.one,
  },
  sectionLabel: {
    marginTop: Spacing.two,
  },
  productBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  scanLabelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    marginTop: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  labelResultBox: {
    marginTop: Spacing.one,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
  },
  unitRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  unitChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  resultBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
    marginTop: Spacing.two,
  },
  resultValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  disclaimer: {
    marginTop: Spacing.three,
  },
});
