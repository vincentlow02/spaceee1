import 'server-only';
import { generateImage } from './imageProviderAdapter.js';

export async function generateQwenImage(prompt,trace=null,spaceType,materialReferenceImages,preparedRequest) {
  return generateImage(prompt,trace,spaceType,materialReferenceImages,preparedRequest);
}
