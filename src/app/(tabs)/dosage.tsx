import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDosageTreatments, type Treatment } from '@/lib/model/treatments';

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
  const { label: preselectLabel } = useLocalSearchParams<{ label?: string }>();
  const { t, i18n } = useTranslation();
  const diseases = useMemo(() => getDosageTreatments(i18n.language), [i18n.language]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    diseases.some(([label]) => label === preselectLabel) ? (preselectLabel as string) : diseases[0]?.[0] ?? null
  );
  const [mode, setMode] = useState<Mode>('area');
  const [areaValue, setAreaValue] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('hectare');
  const [waterPerHectare, setWaterPerHectare] = useState('500');
  const [plantCount, setPlantCount] = useState('');
  const [waterPerPlantMl, setWaterPerPlantMl] = useState('300');
  const theme = useTheme();

  const selected: Treatment | undefined = diseases.find(([label]) => label === selectedLabel)?.[1];

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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            {t('nav.dosageCalculator')}
          </ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            {t('dosage.diseaseLabel')}
          </ThemedText>
          <View style={styles.chipRow}>
            {diseases.map(([label, treatment]) => {
              const isSelected = label === selectedLabel;
              return (
                <Pressable
                  key={label}
                  onPress={() => setSelectedLabel(label)}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement },
                  ]}>
                  <ThemedText type="small" themeColor={isSelected ? 'text' : 'textSecondary'}>
                    {treatment.displayName}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

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
                  placeholder="e.g. 2"
                  placeholderTextColor={theme.textSecondary}
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
                placeholder="e.g. 500"
                placeholderTextColor={theme.textSecondary}
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
                placeholder="e.g. 40"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('dosage.waterPerPlantLabel')}
              </ThemedText>
              <TextInput
                value={waterPerPlantMl}
                onChangeText={setWaterPerPlantMl}
                keyboardType="decimal-pad"
                placeholder="e.g. 300"
                placeholderTextColor={theme.textSecondary}
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
      </ScrollView>
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
    marginBottom: Spacing.two,
  },
  sectionLabel: {
    marginTop: Spacing.two,
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
  productBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
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
