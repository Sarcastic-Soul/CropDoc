import treatmentsData from '@/assets/model/treatments.json';

import type { Label } from './labels';

export type Treatment = {
  displayName: string;
  severity: 'none' | 'moderate' | 'severe' | 'unknown';
  description: string;
  treatment: string[];
};

const DATA = treatmentsData as unknown as Record<string, Treatment> & { _default: Treatment };

export function getTreatment(label: Label | string): Treatment {
  return DATA[label] ?? DATA._default;
}
