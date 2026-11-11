import { SPACE_BASE_IMAGE } from '../features/exploration/spatialTemplate.js';
import { isTrustedDashscopeImageUrl } from './spaceImageDownload.js';

export const DEFAULT_IMAGE_EDIT_MODEL = 'qwen-image-2.1-turbo';

/** Only Qwen models that support image-to-image editing may be used. */
export function buildQwenImageEditRequest(prompt, baseImage, model = DEFAULT_IMAGE_EDIT_MODEL, spaceType, materialReferenceImages) {
  if (!/^qwen-image-(?:2\.1-(?:turbo|pro)|3\.0(?:-pro)?)(?:-\d{4}-\d{2}-\d{2})?$/.test(model)) {
    const error = new Error('The image-edit model is not configured correctly.');
    error.code = 'INVALID_IMAGE_EDIT_MODEL';
    throw error;
  }
  const validImage = typeof baseImage === 'string' &&
    (/^data:image\/(?:png|jpeg);base64,/.test(baseImage) || isTrustedDashscopeImageUrl(baseImage));
  if (typeof prompt !== 'string' || !prompt.trim() || !validImage) {
    const error = new Error('The spatial image-edit request could not be prepared.');
    error.code = 'INVALID_IMAGE_EDIT_INPUT';
    throw error;
  }
  if (materialReferenceImages !== undefined &&
      (!Array.isArray(materialReferenceImages) || materialReferenceImages.length!==3 ||
       materialReferenceImages.some(image=>typeof image!=='string' || !/^data:image\/(?:png|jpeg);base64,/.test(image)))) {
    const error=new Error('The material reference images could not be prepared.');
    error.code='INVALID_IMAGE_EDIT_INPUT';
    throw error;
  }
  return {
    model,
    input: {messages: [{role:'user',content:[{image:baseImage},...(materialReferenceImages || []).map(image=>({image})),{text:prompt}]}]},
    parameters: {
      n: 1,
      size: spaceType ? '1536*1024' : SPACE_BASE_IMAGE.outputSize,
      // The detailed server prompt already carries geometry and exclusion rules.
      prompt_extend: false,
      watermark: false,
    },
  };
}
