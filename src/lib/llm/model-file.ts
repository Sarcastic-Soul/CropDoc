import { Directory, File, Paths } from 'expo-file-system';

import { LLM_MODEL_FILENAME } from './config';

const modelsDir = new Directory(Paths.document, 'models');

export function getModelFile(): File {
  return new File(modelsDir, LLM_MODEL_FILENAME);
}

export function isModelDownloaded(): boolean {
  return getModelFile().exists;
}

export function ensureModelsDir(): void {
  if (!modelsDir.exists) {
    modelsDir.create({ intermediates: true });
  }
}

export function deleteModelFile(): void {
  const file = getModelFile();
  if (file.exists) {
    file.delete();
  }
}
