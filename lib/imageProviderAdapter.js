import { generateQwenImageCore } from './qwenImageCore.js';

/** The image provider boundary used by direct material generation. */
export async function generateImage(prompt, trace = null, spaceType, materialReferenceImages, preparedRequest) {
  return generateQwenImageCore(prompt, trace, spaceType, materialReferenceImages, preparedRequest);
}
