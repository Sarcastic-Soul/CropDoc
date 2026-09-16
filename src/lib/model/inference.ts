import { Asset } from 'expo-asset';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import type { TfliteModel } from 'react-native-fast-tflite';

import { LABELS } from './labels';

let modelPromise: Promise<TfliteModel> | null = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      // On a production Android build, bundled non-image assets are packaged as
      // Android resources and `require(..)`'s resolved URI has no scheme (e.g.
      // "assets_model_model"), which fast-tflite's URL loader rejects. Asset.downloadAsync
      // resolves it to a real `file://` URI in both dev and production.
      // Metro's static analysis for bundling `.tflite` as an asset needs a literal require(..).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asset = Asset.fromModule(require('@/assets/model/model.tflite'));
      await asset.downloadAsync();
      if (!asset.localUri) {
        throw new Error('Failed to resolve local URI for bundled model.tflite');
      }
      return loadTensorflowModel({ url: asset.localUri }, []);
    })();
  }
  return modelPromise;
}

export type Prediction = {
  label: string;
  confidence: number;
};

function softmax(logits: Float32Array) {
  const max = Math.max(...logits);
  const exps = Array.from(logits, (v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

export async function classifyLeaf(input: Float32Array): Promise<Prediction> {
  const model = await getModel();
  const outputs = model.runSync([input.buffer as ArrayBuffer]);
  const raw = new Float32Array(outputs[0] as ArrayBuffer);

  // Models exported with a built-in softmax head already sum to ~1; a plain
  // logit head does not. Normalize defensively either way.
  const total = raw.reduce((a, b) => a + b, 0);
  const probs = total > 0.99 && total < 1.01 ? Array.from(raw) : softmax(raw);

  let bestIndex = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIndex]) bestIndex = i;
  }

  return { label: LABELS[bestIndex] ?? `unknown_${bestIndex}`, confidence: probs[bestIndex] };
}
