import 'server-only';

const DEFAULT_API_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const DEFAULT_MODEL = 'qwen-image-plus';

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

  let response;
  try {
    response = await fetch(process.env.QWEN_API_URL || DEFAULT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL || DEFAULT_MODEL,
        input: {
          messages: [{ role: 'user', content: [{ text: prompt }] }],
        },
        parameters: {
          n: 1,
          size: '1664*928',
          prompt_extend: true,
          watermark: false,
        },
      }),
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
