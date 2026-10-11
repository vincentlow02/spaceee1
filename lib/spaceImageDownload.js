const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const TRUSTED_DASHSCOPE_IMAGE_HOST = /^dashscope-[a-z0-9-]+\.oss(?:-[a-z0-9-]+)?\.aliyuncs\.com$/;

function errorResponse(message,status) {
  return Response.json({error:message},{status});
}

export async function createSpaceDownloadResponse(request,{fetchImage = fetch} = {}) {
  let url;
  try {
    const body = await request.json();
    url = new URL(body.imageUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !TRUSTED_DASHSCOPE_IMAGE_HOST.test(url.hostname)) throw new Error();
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
