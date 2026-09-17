import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DOSAGE_DISCLAIMER, getDosageTreatments, type Treatment } from '@/lib/model/treatments';

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
  const diseases = useMemo(() => getDosageTreatments(), []);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(diseases[0]?.[0] ?? null);
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          DISEASE
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
              Typical rate: {selected.dosage.rateMin}–{selected.dosage.rateMax} {selected.dosage.unit}
            </ThemedText>
          </ThemedView>
        )}

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          MEASURE BY
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.segmented}>
          <Pressable
            onPress={() => setMode('area')}
            style={[styles.segment, mode === 'area' && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor={mode === 'area' ? 'text' : 'textSecondary'}>
              Plot area
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setMode('plants')}
            style={[styles.segment, mode === 'plants' && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor={mode === 'plants' ? 'text' : 'textSecondary'}>
              Plant count
            </ThemedText>
          </Pressable>
        </ThemedView>

        {mode === 'area' ? (
          <>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              PLOT SIZE
            </ThemedText>
            <View style={styles.row}>
              <TextInput
                value={areaValue}
                onChangeText={setAreaValue}
                keyboardType="decimal-pad"
                placeholder="e.g. 2"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, styles.flexInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
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
              SPRAY WATER PER HECTARE (L)
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
              NUMBER OF PLANTS
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
              SPRAY WATER PER PLANT (mL)
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
              RESULT
            </ThemedText>
            <ThemedText type="title" style={styles.resultValue}>
              {productRange.min.toFixed(1)}–{productRange.max.toFixed(1)} {productRange.unit.split('/')[0]}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              of {selected.dosage.product} in {totalWaterLiters?.toFixed(1)} L of water
            </ThemedText>
          </ThemedView>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
          {DOSAGE_DISCLAIMER}
        </ThemedText>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.six,
  },
  safeArea: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
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
