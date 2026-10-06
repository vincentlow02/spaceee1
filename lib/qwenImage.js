import 'server-only';
import { loadSpaceBaseImage } from './spaceBaseImage.js';
import { buildQwenImageEditRequest, DEFAULT_IMAGE_EDIT_MODEL } from './qwenImageRequest.js';

const DEFAULT_API_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

function getImageUrl(payload) {
  return payload?.output?.choices?.[0]?.message?.content?.find(
    (item) => typeof item?.image === 'string'
  )?.image;
}

export async function generateQwenImage(prompt) {
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiKey) {
    const error = new Error('Qwen API is not configured.');
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const baseImage = await loadSpaceBaseImage();
  const requestBody = buildQwenImageEditRequest(
    prompt, baseImage, process.env.QWEN_IMAGE_EDIT_MODEL || DEFAULT_IMAGE_EDIT_MODEL
  );

  let response;
  try {
    response = await fetch(process.env.QWEN_API_URL || DEFAULT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });
  } catch (cause) {
    const timedOut = cause?.name === 'TimeoutError' || cause?.name === 'AbortError';
    const error = new Error(timedOut ? 'Qwen image generation timed out.' : 'Qwen image request failed.');
    error.code = timedOut ? 'QWEN_TIMEOUT' : 'QWEN_REQUEST_FAILED';
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error('Qwen returned an unreadable response.');
    error.code = 'QWEN_MALFORMED_RESPONSE';
    throw error;
  }

  if (!response.ok) {
    const error = new Error('Qwen image request failed.');
    error.code = 'QWEN_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }

  const imageUrl = getImageUrl(payload);
  if (!imageUrl) {
    const error = new Error('Qwen completed without returning an image URL.');
    error.code = 'QWEN_MISSING_IMAGE';
    throw error;
  }

  return { imageUrl, requestId: payload.request_id };
}
