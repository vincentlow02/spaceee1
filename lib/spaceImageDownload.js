import { IMAGE_LIMIT, IMAGE_TYPES as ACCEPTED_IMAGE_TYPES, validImageSignature } from '../features/exploration/cloudContract.js';

const MAX_IMAGE_BYTES = IMAGE_LIMIT;
const IMAGE_TYPES = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const TRUSTED_DASHSCOPE_IMAGE_HOST = /^dashscope-[a-z0-9-]+\.oss(?:-[a-z0-9-]+)?\.aliyuncs\.com$/;

export function isTrustedDashscopeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      TRUSTED_DASHSCOPE_IMAGE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

function errorResponse(message,status) {
  return Response.json({error:message},{status});
}

export async function downloadGeneratedImage(imageUrl,{fetchImage=fetch}={}) {
  if (!isTrustedDashscopeImageUrl(imageUrl)) {
    throw Object.assign(new Error('Untrusted image URL.'),{code:'IMAGE_URL_UNTRUSTED'});
  }
  let response;
  try {
    response=await fetchImage(imageUrl,{redirect:'error',signal:AbortSignal.timeout(30_000),cache:'no-store'});
  } catch(error) {
    throw Object.assign(new Error('Image download failed.'),{code:error?.name==='TimeoutError'?'IMAGE_DOWNLOAD_TIMEOUT':'IMAGE_DOWNLOAD_FAILED'});
  }
  if (!response.ok) {
    throw Object.assign(new Error('Image URL unavailable.'),{code:[403,404,410].includes(response.status)?'IMAGE_URL_EXPIRED':'IMAGE_DOWNLOAD_FAILED'});
  }
  const type=response.headers.get('content-type')?.split(';')[0].trim();
  if (!ACCEPTED_IMAGE_TYPES.includes(type) || !response.body) {
    throw Object.assign(new Error('Invalid image response.'),{code:'IMAGE_TYPE_INVALID'});
  }
  const length=Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length>MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('Image too large.'),{code:'IMAGE_TOO_LARGE'});
  }
  const reader=response.body.getReader();
  const chunks=[];
  let size=0;
  try {
    for (;;) {
      const {done,value}=await reader.read();
      if (done) break;
      size+=value.byteLength;
      if (size>MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error('Image too large.'),{code:'IMAGE_TOO_LARGE'});
      }
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  if (!size) throw Object.assign(new Error('Empty image.'),{code:'IMAGE_EMPTY'});
  const bytes=new Uint8Array(size);
  let offset=0;
  for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
  if (!validImageSignature(bytes.slice(0,12),type)) {
    throw Object.assign(new Error('Invalid image signature.'),{code:'IMAGE_SIGNATURE_INVALID'});
  }
  return {bytes,type};
}

export async function createSpaceDownloadResponse(request,{fetchImage = fetch} = {}) {
  let url;
  try {
    const body = await request.json();
    url = new URL(body.imageUrl);
    if (!isTrustedDashscopeImageUrl(url.href)) throw new Error();
  } catch {
    return errorResponse('A valid generated image URL is required.',400);
  }
  try {
    const response = await fetchImage(url.href,{redirect:'error',signal:AbortSignal.timeout(30000),cache:'no-store'});
    if (!response.ok) return errorResponse('The temporary image link is unavailable or expired.',response.status === 403 || response.status === 404 ? 410 : 502);
    const type = response.headers.get('content-type')?.split(';')[0].trim();
    if (!IMAGE_TYPES[type] || !response.body) return errorResponse('The image could not be downloaded.',502);
    if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) return errorResponse('The image is too large to download.',413);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return errorResponse('The image is too large to download.',413);
      }
      chunks.push(value);
    }
    if (!size) return errorResponse('The image could not be downloaded.',502);
    return new Response(new Blob(chunks,{type}),{headers:{
      'Content-Type':type,
      'Content-Disposition':`attachment; filename="spacee-space.${IMAGE_TYPES[type]}"`,
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
    }});
  } catch (error) {
    return errorResponse(error.name === 'TimeoutError' ? 'Image download timed out.' : 'The image could not be downloaded.',error.name === 'TimeoutError' ? 504 : 502);
  }
}
