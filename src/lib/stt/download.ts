import { File, type DownloadTask } from 'expo-file-system';

import { STT_MODEL_URL } from './config';
import { deleteModelFile, ensureModelsDir, getModelFile } from './model-file';

let activeTask: DownloadTask | null = null;

export function cancelModelDownload(): void {
  activeTask?.cancel();
  activeTask = null;
  deleteModelFile();
}

export async function downloadModel(onProgress: (fraction: number) => void): Promise<void> {
  ensureModelsDir();
  // Clear out any partial file from a previous cancelled/failed attempt —
  // createDownloadTask has no `idempotent` option and throws if the
  // destination already exists.
  deleteModelFile();

  const task = File.createDownloadTask(STT_MODEL_URL, getModelFile(), {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress(bytesWritten / totalBytes);
    },
  });
  activeTask = task;

  try {
    const file = await task.downloadAsync();
    if (!file) {
      // downloadAsync() resolves null only when paused; we never pause, so
      // reaching this means cancelModelDownload() ran mid-flight.
      throw new Error('Download was cancelled');
    }
  } finally {
    activeTask = null;
  }
}
