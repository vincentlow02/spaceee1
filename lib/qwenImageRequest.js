import { SPACE_BASE_IMAGE } from '../features/exploration/spatialTemplate.js';

export const DEFAULT_IMAGE_EDIT_MODEL = 'qwen-image-edit-plus';

/** Only supported image-edit model families may override the default. */
export function buildQwenImageEditRequest(prompt, baseImage, model = DEFAULT_IMAGE_EDIT_MODEL) {
  if (!/^qwen-image-edit-(plus|max)(-\d{4}-\d{2}-\d{2})?$/.test(model)) {
    const error = new Error('The image-edit model is not configured correctly.');
    error.code = 'INVALID_IMAGE_EDIT_MODEL';
    throw error;
  }
  if (typeof prompt !== 'string' || !prompt.trim() || typeof baseImage !== 'string' || !baseImage.startsWith('data:image/png;base64,')) {
    const error = new Error('The spatial image-edit request could not be prepared.');
    error.code = 'INVALID_IMAGE_EDIT_INPUT';
    throw error;
  }
  return {
    model,
    input: {messages: [{role:'user',content:[{image:baseImage},{text:prompt}]}]},
    parameters: {
      n: 1,
      size: SPACE_BASE_IMAGE.outputSize,
      // Preserve the server's explicit geometry instructions without rewriting.
      prompt_extend: false,
      watermark: false,
      negative_prompt: 'different room geometry, changed camera angle, changed perspective, moved window, missing window, blocked window, cropped composition, floor plan, product advertisement, text labels, watermark',
    },
  };
}
