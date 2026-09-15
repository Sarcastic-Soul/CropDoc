import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';

export const MODEL_INPUT_SIZE = 224;

// MobileNetV2 preprocessing used by the HF checkpoint's image processor: scale
// pixel values from [0, 255] to [-1, 1] via (x / 127.5) - 1, per channel.
const MEAN = 127.5;
const STD = 127.5;

/**
 * Center-crops the photo to a square (avoids the aspect-ratio squish a
 * non-square resize would introduce) then resizes to the model's input size.
 * Returns a flat, normalized NHWC Float32Array ready for the tflite model.
 */
export async function preprocessForModel(photoUri: string, photoWidth: number, photoHeight: number) {
  const side = Math.min(photoWidth, photoHeight);
  const originX = Math.round((photoWidth - side) / 2);
  const originY = Math.round((photoHeight - side) / 2);

  const cropped = await ImageManipulator.manipulate(photoUri)
    .crop({ originX, originY, width: side, height: side })
    .resize({ width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE })
    .renderAsync();

  const result = await cropped.saveAsync({
    base64: true,
    format: SaveFormat.JPEG,
    compress: 1,
  });

  if (!result.base64) {
    throw new Error('Image manipulation did not return base64 data');
  }

  const jpegBytes = toByteArray(result.base64);
  const decoded = jpeg.decode(jpegBytes, { useTArray: true });

  const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const input = new Float32Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    const srcOffset = i * 4; // decoded data is RGBA
    const dstOffset = i * 3;
    input[dstOffset] = (decoded.data[srcOffset] - MEAN) / STD;
    input[dstOffset + 1] = (decoded.data[srcOffset + 1] - MEAN) / STD;
    input[dstOffset + 2] = (decoded.data[srcOffset + 2] - MEAN) / STD;
  }

  return { input, previewUri: result.uri };
}
