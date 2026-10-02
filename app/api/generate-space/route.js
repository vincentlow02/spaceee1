import {
  GenerationRequestValidationError,
  prepareGenerationRequest,
} from '@/features/exploration/generationRequest';
import { generateQwenImage } from '@/lib/qwenImage';

function safeGenerationError(error) {
  switch (error?.code) {
    case 'MISSING_API_KEY':
      return { status: 500, message: 'Qwen API is not configured.' };
    case 'QWEN_TIMEOUT':
      return { status: 504, message: 'Image generation timed out. Please try again.' };
    case 'QWEN_MALFORMED_RESPONSE':
    case 'QWEN_MISSING_IMAGE':
      return { status: 502, message: 'The image service returned an invalid response.' };
    case 'QWEN_REQUEST_FAILED':
      return { status: 502, message: 'Image generation failed. Please try again.' };
    default:
      return { status: 500, message: 'Space generation failed.' };
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
  }

  let prepared;
  try {
    prepared = prepareGenerationRequest(body);
  } catch (error) {
    if (error instanceof GenerationRequestValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: 'The generation request could not be prepared.' }, { status: 500 });
  }

  try {
    const qwenResult = await generateQwenImage(prepared.promptResult.prompt);

    return Response.json({
      imageUrl: qwenResult.imageUrl,
      requestId: qwenResult.requestId || null,
      sessionId: prepared.snapshot.sessionId,
      prompt: prepared.promptResult.prompt,
    });
  } catch (error) {
    const safe = safeGenerationError(error);
    // Log only non-sensitive classification data; never log credentials or payloads.
    console.error('Space generation failed.', {
      code: error?.code || 'UNKNOWN',
      status: error?.status || null,
    });
    return Response.json({ error: safe.message }, { status: safe.status });
  }
}
