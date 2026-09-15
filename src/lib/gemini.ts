import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Treatment } from './model/treatments';

// gemini-3.6-flash: "balancing speed and multimodal capabilities across general
// agentic and everyday tasks" per ai.google.dev/gemini-api/docs/models — fast/cheap
// enough for a single on-demand vision call, free-tier eligible.
const MODEL = 'gemini-3.6-flash';
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const GEMINI_IMAGE_MAX_DIMENSION = 768;

export function isGeminiConfigured() {
  return Boolean(API_KEY);
}

async function toGeminiJpegBase64(photoUri: string) {
  const resized = await ImageManipulator.manipulate(photoUri)
    .resize({ width: GEMINI_IMAGE_MAX_DIMENSION })
    .renderAsync();
  const result = await resized.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: 0.8 });
  if (!result.base64) {
    throw new Error('Image manipulation did not return base64 data');
  }
  return result.base64;
}

/**
 * Asks Gemini for a richer, plain-language explanation layered on top of the
 * on-device diagnosis. Online-only, optional — never on the critical path.
 */
export async function getSecondOpinion(photoUri: string, treatment: Treatment): Promise<string> {
  if (!API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const imageBase64 = await toGeminiJpegBase64(photoUri);

  const prompt = `You are helping a farmer understand a crop leaf diagnosis made by an offline, on-device model. The on-device model diagnosed: "${treatment.displayName}" (${treatment.description}).

Look at the attached photo and, in plain, non-technical language a farmer without formal training would understand:
1. Confirm whether what you see in the photo is consistent with that diagnosis, or note if something looks different.
2. Explain briefly why this happens (cause, conditions that favor it).
3. Add any practical tips beyond the standard treatment steps that seem relevant to this specific photo.

Keep it to 3-4 short sentences. Do not repeat the treatment steps verbatim — the app already shows those separately.`;

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('Gemini returned no explanation');
  }
  return text.trim();
}
