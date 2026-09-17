import { Directory, File, Paths } from 'expo-file-system';
import { PermissionsAndroid, Platform } from 'react-native';
// Resolves fine at runtime via whisper.rn's package.json exports map; the
// lint resolver doesn't follow it, see src/types/whisper-rn.d.ts for the
// ambient type shim.
// eslint-disable-next-line import/no-unresolved
import { AudioPcmStreamAdapter, type AudioStreamData } from 'whisper.rn/realtime-transcription/adapters';

import { STT_BITS_PER_SAMPLE, STT_CHANNELS, STT_SAMPLE_RATE } from './config';

// Android's MediaRecorder (what expo-audio/expo-av use) can't produce raw
// WAV/PCM output at all — compressed codecs only. whisper.cpp's file loader
// only reads WAV. So recording goes through whisper.rn's own PCM stream
// adapter (raw AudioRecord capture, no MediaRecorder involved) and gets
// wrapped in a WAV header by hand here — recordings are a few seconds of
// voice input, short enough that buffering the whole thing in memory and
// writing it in one shot beats reaching for a streaming/append file writer.
const recordingsDir = new Directory(Paths.cache, 'stt-recordings');

function buildWavHeader(dataSize: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const byteRate = STT_SAMPLE_RATE * STT_CHANNELS * (STT_BITS_PER_SAMPLE / 8);
  const blockAlign = STT_CHANNELS * (STT_BITS_PER_SAMPLE / 8);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, STT_CHANNELS, true);
  view.setUint32(24, STT_SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, STT_BITS_PER_SAMPLE, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  return new Uint8Array(header);
}

export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

let adapter: AudioPcmStreamAdapter | null = null;
let chunks: Uint8Array[] = [];

export function isRecording(): boolean {
  return adapter !== null;
}

export async function startRecording(): Promise<void> {
  if (adapter) return;
  chunks = [];
  const stream = new AudioPcmStreamAdapter();
  await stream.initialize({
    sampleRate: STT_SAMPLE_RATE,
    channels: STT_CHANNELS,
    bitsPerSample: STT_BITS_PER_SAMPLE,
  });
  stream.onData((data: AudioStreamData) => {
    chunks.push(data.data);
  });
  adapter = stream;
  await stream.start();
}

// Resolves to the recorded clip's file:// uri, ready to hand straight to
// transcribeAudio().
export async function stopRecording(): Promise<string> {
  const stream = adapter;
  if (!stream) {
    throw new Error('Not recording');
  }
  adapter = null;
  await stream.stop();
  await stream.release();

  const dataSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const header = buildWavHeader(dataSize);
  const wav = new Uint8Array(header.length + dataSize);
  wav.set(header, 0);
  let offset = header.length;
  for (const chunk of chunks) {
    wav.set(chunk, offset);
    offset += chunk.length;
  }
  chunks = [];

  if (!recordingsDir.exists) {
    recordingsDir.create({ intermediates: true });
  }
  // A fresh filename per recording, not a fixed one — so a still-in-flight
  // transcription from a previous recording can't be clobbered if the user
  // starts another one before it finishes.
  const file = new File(recordingsDir, `${Date.now()}.wav`);
  file.create();
  file.write(wav);
  return file.uri;
}

export async function cancelRecording(): Promise<void> {
  const stream = adapter;
  adapter = null;
  chunks = [];
  if (!stream) return;
  await stream.stop();
  await stream.release();
}
