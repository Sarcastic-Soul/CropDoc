import bn from '@/assets/model/treatments/bn.json';
import en from '@/assets/model/treatments/en.json';
import es from '@/assets/model/treatments/es.json';
import fr from '@/assets/model/treatments/fr.json';
import hi from '@/assets/model/treatments/hi.json';
import id from '@/assets/model/treatments/id.json';
import pt from '@/assets/model/treatments/pt.json';
import sw from '@/assets/model/treatments/sw.json';
import ur from '@/assets/model/treatments/ur.json';
import vi from '@/assets/model/treatments/vi.json';
import zh from '@/assets/model/treatments/zh.json';

import i18n, { type LanguageCode } from '@/lib/i18n';

import type { Label } from './labels';

export type Dosage = {
  product: string;
  rateMin: number;
  rateMax: number;
  unit: 'mL/L' | 'g/L';
};

export type Treatment = {
  displayName: string;
  severity: 'none' | 'moderate' | 'severe' | 'unknown';
  description: string;
  treatment: string[];
  dosage?: Dosage;
};

type TreatmentTable = Record<string, Treatment> & { _default: Treatment };

const TABLES: Record<LanguageCode, TreatmentTable> = {
  en: en as unknown as TreatmentTable,
  hi: hi as unknown as TreatmentTable,
  es: es as unknown as TreatmentTable,
  zh: zh as unknown as TreatmentTable,
  pt: pt as unknown as TreatmentTable,
  bn: bn as unknown as TreatmentTable,
  id: id as unknown as TreatmentTable,
  sw: sw as unknown as TreatmentTable,
  vi: vi as unknown as TreatmentTable,
  fr: fr as unknown as TreatmentTable,
  ur: ur as unknown as TreatmentTable,
};

function getTable(language?: string): TreatmentTable {
  return TABLES[language as LanguageCode] ?? TABLES.en;
}

export function getTreatment(label: Label | string, language?: string): Treatment {
  const table = getTable(language ?? i18n.language);
  return table[label] ?? table._default;
}

export function getDosageTreatments(language?: string): [string, Treatment][] {
  const table = getTable(language ?? i18n.language);
  return Object.entries(table).filter(
    (entry): entry is [string, Treatment] => !entry[0].startsWith('_') && Boolean(entry[1].dosage)
  );
}

export function getAllTreatments(language?: string): [string, Treatment][] {
  const table = getTable(language ?? i18n.language);
  return Object.entries(table).filter((entry): entry is [string, Treatment] => !entry[0].startsWith('_'));
}

export function formatTreatmentContext(label: string, treatment: Treatment): string {
  return [
    `Diagnosis: ${treatment.displayName} (severity: ${treatment.severity})`,
    treatment.description,
    treatment.treatment.length ? `Treatment steps: ${treatment.treatment.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export const SEVERITY_COLOR: Record<Treatment['severity'], string> = {
  none: '#2e9e4f',
  moderate: '#d9932a',
  severe: '#d1453b',
  unknown: '#60646c',
};

export const SEVERITY_RANK: Record<Treatment['severity'], number> = {
  none: 0,
  moderate: 1,
  severe: 2,
  unknown: -1,
};
