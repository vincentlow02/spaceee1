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

test('accepts trusted DashScope buckets in newly returned Alibaba OSS regions',async () => {
  const newRegionUrl = 'https://dashscope-result-hz.oss-cn-hangzhou.aliyuncs.com/result.webp?signature=temporary';
  const result = await createSpaceDownloadResponse(request(newRegionUrl),{fetchImage:async url => {
    assert.equal(url,newRegionUrl);
    return new Response(new Uint8Array([1]),{headers:{'content-type':'image/webp'}});
  }});
  assert.equal(result.status,200);
});

for (const url of ['http://localhost:3000/private','https://example.com/image.png','https://dashscope-463f.oss-ap-southeast-1.aliyuncs.com.evil.test/a','https://user:pass@dashscope-463f.oss-ap-southeast-1.aliyuncs.com/a']) {
  test(`rejects untrusted URL ${url}`,async () => {
    const result = await createSpaceDownloadResponse(request(url),{fetchImage:()=>{throw new Error('Must not fetch');}});
    assert.equal(result.status,400);
  });
}

test('returns a clear safe error for an expired link',async () => {
  const result = await createSpaceDownloadResponse(request(),{fetchImage:async()=>new Response('private error',{status:403})});
  assert.equal(result.status,410);
  assert.ok(!(await result.text()).includes('private error'));
});

test('rejects non-image upstream responses',async () => {
  const result = await createSpaceDownloadResponse(request(),{fetchImage:async()=>new Response('html',{headers:{'content-type':'text/html'}})});
  assert.equal(result.status,502);
});

test('rejects oversized images and handles timeout without exposing the signed URL',async () => {
  const oversized = await createSpaceDownloadResponse(request(),{fetchImage:async()=>new Response('x',{headers:{'content-type':'image/png','content-length':String(21*1024*1024)}})});
  assert.equal(oversized.status,413);
  const timeout = await createSpaceDownloadResponse(request(),{fetchImage:async()=>{throw new DOMException(imageUrl,'TimeoutError');}});
  assert.equal(timeout.status,504);
  assert.ok(!(await timeout.text()).includes('signature'));
});
