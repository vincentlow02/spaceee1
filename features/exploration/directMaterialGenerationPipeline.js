import { createHash } from 'node:crypto';

export async function executeDirectMaterialGenerationPipeline({
  prepared,
  trace,
  dependencies,
  beforeImageRequest = async () => {},
}) {
  const promptSpan = trace.span('prompt', 'prompt.compile');
  let promptResult;
  try {
    const direct=prepared.directMaterialGeneration;
    if (!direct?.prompt || !direct.request || direct.status!=='ready') {
      throw Object.assign(new Error('Direct material generation is unavailable.'),{code:'DIRECT_MATERIAL_GENERATION_REQUIRED'});
    }
    promptResult={
      prompt:direct.prompt,promptVersion:direct.version,
      materialPromptVersion:direct.materialPromptVersion,
      selectedMaterialIds:direct.imageManifest.slice(1).map(image=>image.materialId),
    };
    promptSpan.complete({metadata:{
      prompt_hash:createHash('sha256').update(promptResult.prompt).digest('hex'),
      prompt_length:promptResult.prompt.length,
      prompt_version:promptResult.promptVersion,
      ...(promptResult.materialPromptVersion?{material_prompt_version:promptResult.materialPromptVersion}:{}),
    }});
  } catch (error) {
    promptSpan.fail(error?.code || 'PROMPT_COMPILE_FAILED');
    throw error;
  }

  await beforeImageRequest();
  trace.record('image','image.requested','started',{metadata:{request_count:1}});
  const imageSpan=trace.span('image','image.generate');
  let qwenResult;
  try {
    qwenResult=await dependencies.generateQwenImage(promptResult.prompt,trace,prepared.snapshot.spaceType,
      undefined,{request:prepared.directMaterialGeneration.request,baseImageMetadata:{
        path:prepared.directMaterialGeneration.imageManifest[0].path,sha256:prepared.directMaterialGeneration.imageManifest[0].sha256,
        spaceType:prepared.snapshot.spaceType,
      }});
    imageSpan.complete({metadata:{provider_request_id:qwenResult.requestId || null}});
    trace.record('image','image.generated','completed',{metadata:{provider_request_id:qwenResult.requestId || null}});
  } catch(error) {
    imageSpan.fail(error?.code || 'IMAGE_GENERATION_FAILED');
    if (['QWEN_TIMEOUT','QWEN_REQUEST_FAILED','QWEN_MALFORMED_RESPONSE','QWEN_MISSING_IMAGE'].includes(error?.code)) {
      trace.record('image','image.needs_review','failed',{errorCode:'IMAGE_RESULT_UNKNOWN'});
    }
    throw error;
  }

  const payload = dependencies.buildGenerationResponsePayload({
    ...promptResult,
    imageUrl: qwenResult.imageUrl,
    requestId: qwenResult.requestId || null,
    sessionId: prepared.snapshot.sessionId,
  });
  return { payload, baseImageMetadata:qwenResult.baseImageMetadata || null };
}
