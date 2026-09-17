import treatmentsData from '@/assets/model/treatments.json';

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

export const DOSAGE_DISCLAIMER =
  "Typical label rate for the product named — always check and follow your specific product's instructions, since brands and formulations vary.";

const DATA = treatmentsData as unknown as Record<string, Treatment> & { _default: Treatment };

export function getTreatment(label: Label | string): Treatment {
  return DATA[label] ?? DATA._default;
}

export function getDosageTreatments(): [string, Treatment][] {
  return Object.entries(DATA).filter(
    (entry): entry is [string, Treatment] => !entry[0].startsWith('_') && Boolean(entry[1].dosage)
  );
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
