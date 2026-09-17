import { initWhisper, type WhisperContext } from 'whisper.rn';

import { getModelFile } from './model-file';

let contextPromise: Promise<WhisperContext> | null = null;

export function isSttReady(): boolean {
  return contextPromise !== null;
}

export async function setupStt(): Promise<void> {
  if (contextPromise) {
    await contextPromise;
    return;
  }
  const modelFile = getModelFile();
  if (!modelFile.exists) {
    throw new Error('Speech model file not downloaded yet');
  }

  const promise = initWhisper({ filePath: modelFile.uri });
  contextPromise = promise;

  try {
    await promise;
  } catch (error) {
    contextPromise = null;
    throw error;
  }
}

export async function releaseStt(): Promise<void> {
  const promise = contextPromise;
  contextPromise = null;
  if (!promise) return;
  const context = await promise;
  await context.release();
}

export async function transcribeAudio(wavFilePath: string, language: string): Promise<string> {
  if (!contextPromise) {
    throw new Error('Speech model is not set up yet');
  }
  const context = await contextPromise;
  const { promise } = context.transcribe(wavFilePath, { language });
  const { result } = await promise;
  return result.trim();
}
