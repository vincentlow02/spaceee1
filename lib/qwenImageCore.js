import { loadSpaceBaseImageWithMetadata } from './spaceBaseImageCore.js';
import { buildQwenImageEditRequest, DEFAULT_IMAGE_EDIT_MODEL } from './qwenImageRequest.js';
import { providerUsageMetadata } from '../features/exploration/generationTrace.js';

const QWEN_IMAGE_API_URL=
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

function getImageUrl(payload) {
  return payload?.output?.choices?.[0]?.message?.content?.find(
    item=>typeof item?.image==='string',
  )?.image;
}

export async function generateQwenImageCore(prompt,trace=null,spaceType,materialReferenceImages,preparedRequest) {
  const apiKey=process.env.QWEN_API_KEY;
  if (!apiKey) {
    const error=new Error('Qwen API is not configured.');
    error.code='MISSING_API_KEY';
    throw error;
  }

  const base=preparedRequest?.baseImageMetadata || await loadSpaceBaseImageWithMetadata(spaceType);
  trace?.record?.('image','image.base_selected','completed',{metadata:{
    base_image_path:base.path,base_image_sha256:base.sha256,space_type:base.spaceType,
  }});
  const requestBody=preparedRequest?.request || buildQwenImageEditRequest(prompt,base.data,DEFAULT_IMAGE_EDIT_MODEL,spaceType,materialReferenceImages);
  let providerSpan=null;
  try {
    providerSpan=trace?.span('image','image.provider',{
      provider:'qwen',model:requestBody.model,request_count:1,
      requested_size:requestBody.parameters.size.replace('*','x'),
    });
  } catch {}
  const finishProvider=(method,...details)=>{try {providerSpan?.[method](...details);} catch {}};

  let response;
  try {
    response=await fetch(QWEN_IMAGE_API_URL,{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify(requestBody),
      cache:'no-store',
      signal:AbortSignal.timeout(120_000),
    });
  } catch(cause) {
    const timedOut=cause?.name==='TimeoutError' || cause?.name==='AbortError';
    const error=new Error(timedOut?'Qwen image generation timed out.':'Qwen image request failed.');
    error.code=timedOut?'QWEN_TIMEOUT':'QWEN_REQUEST_FAILED';
    finishProvider('fail',error.code,{metadata:{provider:'qwen',model:requestBody.model,usage_status:'unknown'}});
    throw error;
  }

  let payload;
  try {
    payload=await response.json();
  } catch {
    const error=new Error('Qwen returned an unreadable response.');
    error.code='QWEN_MALFORMED_RESPONSE';
    finishProvider('fail',error.code,{metadata:{provider:'qwen',model:requestBody.model,http_status:response.status,usage_status:'unknown'}});
    throw error;
  }

  if (!response.ok) {
    const error=new Error('Qwen image request failed.');
    if (response.status===401) error.code='QWEN_AUTH_FAILED';
    else if (response.status===403) error.code='QWEN_ACCESS_DENIED';
    else if (response.status===404) error.code='QWEN_MODEL_UNAVAILABLE';
    else error.code='QWEN_REQUEST_FAILED';
    error.status=response.status;
    error.providerCode=typeof payload?.code==='string'?payload.code:null;
    error.requestId=typeof payload?.request_id==='string'?payload.request_id:null;
    finishProvider('fail',error.code,{metadata:{
      provider:'qwen',model:requestBody.model,http_status:response.status,
      provider_request_id:error.requestId,usage_status:'unknown',
    }});
    throw error;
  }

  const imageUrl=getImageUrl(payload);
  if (!imageUrl) {
    const error=new Error('Qwen completed without returning an image URL.');
    error.code='QWEN_MISSING_IMAGE';
    finishProvider('fail',error.code,{metadata:{
      provider:'qwen',model:requestBody.model,http_status:response.status,
      provider_request_id:payload?.request_id,usage_status:'unknown',
    }});
    throw error;
  }

  const imageCount=payload?.output?.choices?.[0]?.message?.content?.filter(
    item=>typeof item?.image==='string',
  ).length;
  finishProvider('complete',{metadata:{
    provider:'qwen',model:requestBody.model,http_status:response.status,
    provider_request_id:payload?.request_id,image_count:imageCount,
    ...providerUsageMetadata(payload),
  }});
  return {imageUrl,requestId:payload.request_id,baseImageMetadata:{path:base.path,sha256:base.sha256,spaceType:base.spaceType}};
}
