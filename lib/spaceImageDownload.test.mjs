import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpaceDownloadResponse } from './spaceImageDownload.js';

const imageUrl = 'https://dashscope-463f.oss-ap-southeast-1.aliyuncs.com/result.png?signature=temporary';
const request = (url = imageUrl) => new Request('http://localhost/api/download-space',{method:'POST',body:JSON.stringify({imageUrl:url})});

test('downloads a trusted temporary Qwen image without authentication headers or redirects',async () => {
  const result = await createSpaceDownloadResponse(request(),{fetchImage:async (url,options) => {
    assert.equal(url,imageUrl);
    assert.equal(options.redirect,'error');
    assert.equal(options.headers,undefined);
    return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/png'}});
  }});
  assert.equal(result.status,200);
  assert.equal(result.headers.get('content-disposition'),'attachment; filename="spacee-space.png"');
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal((await result.arrayBuffer()).byteLength,3);
});

for (const url of ['http://localhost:3000/private','https://example.com/image.png','https://dashscope-463f.oss-ap-southeast-1.aliyuncs.com.evil.test/a','https://user:pass@dashscope-463f.oss-ap-southeast-1.aliyuncs.com/a']) {
  test(`rejects untrusted URL ${url}`,async () => {
    const result = await createSpaceDownloadResponse(request(url),{fetchImage:()=>{throw new Error('Must not fetch');}});
    assert.equal(result.status,400);
  });
}

test('returns safe errors for expired links and non-image responses',async () => {
  for (const upstream of [new Response('private error',{status:403}),new Response('html',{headers:{'content-type':'text/html'}})]) {
    const result = await createSpaceDownloadResponse(request(),{fetchImage:async()=>upstream});
    assert.equal(result.status,502);
    assert.ok(!(await result.text()).includes('private error'));
  }
});

test('rejects oversized images and handles timeout without exposing the signed URL',async () => {
  const oversized = await createSpaceDownloadResponse(request(),{fetchImage:async()=>new Response('x',{headers:{'content-type':'image/png','content-length':String(21*1024*1024)}})});
  assert.equal(oversized.status,413);
  const timeout = await createSpaceDownloadResponse(request(),{fetchImage:async()=>{throw new DOMException(imageUrl,'TimeoutError');}});
  assert.equal(timeout.status,504);
  assert.ok(!(await timeout.text()).includes('signature'));
});
