import { Directory, File, Paths } from 'expo-file-system';

import { STT_MODEL_FILENAME } from './config';

const modelsDir = new Directory(Paths.document, 'stt-models');

export function getModelFile(): File {
  return new File(modelsDir, STT_MODEL_FILENAME);
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
