import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

export type ParsedLabelRate = { min: number; max: number; unit: 'mL/L' | 'g/L' };

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`(ml|milliliters?|millilitres?|g|gm|grams?)`;
const DENOM = String.raw`(?:\/|per)\s*(l|lit|litre|liter)`;
const RANGE_RE = new RegExp(`${NUM}\\s*(?:-|to|–)\\s*${NUM}\\s*${UNIT}\\s*${DENOM}`, 'i');
const SINGLE_RE = new RegExp(`${NUM}\\s*${UNIT}\\s*${DENOM}`, 'i');

function toUnit(raw: string): 'mL/L' | 'g/L' {
  return raw.toLowerCase().startsWith('m') ? 'mL/L' : 'g/L';
}

// Requires an explicit "/L" or "per litre" denominator so this doesn't match
// a bottle's net volume (e.g. "Net contents: 500 ml") printed elsewhere on
// the same label — only the application-rate figure has a per-liter unit.
export function extractRateFromText(text: string): ParsedLabelRate | null {
  const range = text.match(RANGE_RE);
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    return { min: Math.min(a, b), max: Math.max(a, b), unit: toUnit(range[3]) };
  }
  const single = text.match(SINGLE_RE);
  if (single) {
    const value = parseFloat(single[1]);
    return { min: value, max: value, unit: toUnit(single[2]) };
  }
  return null;
}

export function formatRate(min: number, max: number, unit: string): string {
  return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
}

// Only these 5 scripts are supported by this OCR library at all — Bengali
// and Urdu (two of our 11 UI languages) fall back to Latin and will read
// poorly on labels actually printed in those scripts. Nothing to do about
// that at the app level; it's a library limitation, not a bug.
function scriptForLanguage(language: string): TextRecognitionScript {
  if (language === 'hi') return TextRecognitionScript.DEVANAGARI;
  if (language === 'zh') return TextRecognitionScript.CHINESE;
  return TextRecognitionScript.LATIN;
}

export async function recognizeLabelText(photoUri: string, language: string): Promise<string> {
  const result = await TextRecognition.recognize(photoUri, scriptForLanguage(language));
  return result.text;
}
