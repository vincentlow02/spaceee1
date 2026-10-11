import { SPACE_BASE_IMAGE } from '../features/exploration/spatialTemplate.js';

export const DEFAULT_IMAGE_EDIT_MODEL = 'qwen-image-3.0';

/** Only Qwen models that support image-to-image editing may be used. */
export function buildQwenImageEditRequest(prompt, baseImage, model = DEFAULT_IMAGE_EDIT_MODEL) {
  if (!/^qwen-image-(?:3\.0(?:-pro)?|2\.0(?:-pro)?)(?:-\d{4}-\d{2}-\d{2})?$/.test(model)) {
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
      enable_thinking: false,
      watermark: false,
      negative_prompt: 'different room geometry, changed camera angle, changed perspective, moved window, missing window, blocked window, cropped composition, empty room, floor plan, product advertisement, infographic, presentation board, material board, mood board, specification sheet, captions, text labels, tables, charts, user interface, document, poster, watermark',
    },
  };
}
