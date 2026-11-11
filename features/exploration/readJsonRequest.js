export const MAX_GENERATION_REQUEST_BYTES = 20_000_000;

export class JsonRequestError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = 'JsonRequestError';
    this.code = code;
    this.status = status;
  }
}

function assertDeclaredSize(request, maxBytes) {
  const value = request.headers.get('content-length');
  if (value !== null && /^\d+$/.test(value) && Number(value) > maxBytes) {
    throw new JsonRequestError('REQUEST_TOO_LARGE', 413, 'Request body is too large.');
  }
}

export async function readJsonRequest(request, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError('A positive safe request body limit is required.');
  }
  assertDeclaredSize(request, maxBytes);
  if (!request.body) {
    throw new JsonRequestError('INVALID_JSON', 400, 'A valid JSON request body is required.');
  }

  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new JsonRequestError('REQUEST_TOO_LARGE', 413, 'Request body is too large.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof JsonRequestError) throw error;
    throw new JsonRequestError('REQUEST_BODY_READ_FAILED', 400, 'The request body could not be read.');
  } finally {
    reader.releaseLock();
  }

  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
  } catch {
    throw new JsonRequestError('INVALID_JSON', 400, 'A valid JSON request body is required.');
  }
}
