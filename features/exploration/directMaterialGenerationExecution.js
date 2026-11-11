import { GENERATION_TRACE_HEADER, createBackendTrace, createGenerationTrace, isGenerationId, resolveGenerationId } from './generationTrace.js';
import { executeDirectMaterialGenerationPipeline } from './directMaterialGenerationPipeline.js';
import { JsonRequestError, MAX_GENERATION_REQUEST_BYTES, readJsonRequest } from './readJsonRequest.js';
import { captureAppFailure } from '../../lib/monitoring/captureAppFailure.js';

function safeGenerationError(error) {
  switch (error?.code) {
    case 'MISSING_API_KEY': return { status: 500, message: 'Qwen API is not configured.' };
    case 'QWEN_AUTH_FAILED': return { status: 502, message: 'The Qwen API key is invalid or expired.' };
    case 'QWEN_ACCESS_DENIED': return { status: 502, message: 'The Qwen API key does not have access to image editing.' };
    case 'QWEN_MODEL_UNAVAILABLE': return { status: 502, message: 'Qwen image editing is unavailable for this API key or region.' };
    case 'BASE_IMAGE_UNAVAILABLE': return { status: 500, message: 'The fixed space base image is unavailable.' };
    case 'DIRECT_MATERIAL_GENERATION_REQUIRED': return { status: 503, message: 'Direct material generation is unavailable.' };
    case 'INVALID_IMAGE_EDIT_MODEL':
    case 'INVALID_IMAGE_EDIT_INPUT': return { status: 500, message: 'Space image editing is not configured correctly.' };
    case 'QWEN_TIMEOUT': return { status: 504, message: 'Image generation timed out.' };
    case 'QWEN_MALFORMED_RESPONSE':
    case 'QWEN_MISSING_IMAGE': return { status: 502, message: 'The image service returned an invalid response.' };
    case 'QWEN_REQUEST_FAILED': return { status: 502, message: 'Image generation failed. Please try again.' };
    default: return { status: 500, message: 'Space generation failed.' };
  }
}

/** Execute the direct material generation flow with injectable I/O boundaries. */
export async function executeDirectMaterialGeneration(request, dependencies) {
  const requestedId = request.headers.get(GENERATION_TRACE_HEADER);
  const generationId = resolveGenerationId(requestedId);
  const strict = dependencies.requireImagePersistence;
  const requestStartedAt = performance.now();
  let trace;
  try { trace = (dependencies.createTrace || createBackendTrace)(generationId); }
  catch { trace = createGenerationTrace({generationId,scope:'backend'}); }
  const record = (...args) => {try {trace.record(...args);} catch {}};
  let jobRepository = null;
  let jobOwnerId = null;
  let jobStatus = null;
  let jobErrorCode = null;
  let jobHistoryVersionId = null;
  const persistJobTrace = async () => {
    if (!jobRepository || !jobOwnerId) return;
    if (jobStatus) {
      try {
        if (jobStatus==='saved' && jobHistoryVersionId) {
          await jobRepository.markSaved({generationId,ownerId:jobOwnerId,historyVersionId:jobHistoryVersionId});
        } else {
          await jobRepository.transition({
            generationId,ownerId:jobOwnerId,status:jobStatus,
            errorCode:['failed','save_failed','needs_review'].includes(jobStatus)
              ? jobErrorCode || 'GENERATION_FAILED'
              : null,
          });
        }
      } catch(error) {
        captureAppFailure(error,{area:'persistence',operation:'job_status',code:error?.code});
        console.error('Generation job status update failed.',{
          generationId,
          errorCode:/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : 'JOB_STATUS_UPDATE_FAILED',
        });
      }
    }
    if (!dependencies.isPersistentJobsEnabled?.()) return;
    try {
      await jobRepository.appendEvents({
        generationId,ownerId:jobOwnerId,events:dependencies.getTraceEvents?.() || [],
      });
    } catch(error) {
      captureAppFailure(error,{area:'persistence',operation:'job_events',code:error?.code});
      console.error('Generation job persistence failed.',{
        generationId,
        errorCode:/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : 'JOB_PERSISTENCE_FAILED',
      });
    }
  };
  const response = async (data, status = 200, extraHeaders = {}) => {
    record('response','response.sent','completed',{
      durationMs:performance.now()-requestStartedAt,
      metadata:{response_status:status},
    });
    if (jobRepository && jobOwnerId) await persistJobTrace();
    return Response.json(data,{status,headers:{
      ...extraHeaders,
      ...(jobRepository && jobOwnerId ? {'X-Spaceee-Persistent-Jobs':'enabled'} : {}),
      [GENERATION_TRACE_HEADER]:generationId,
    }});
  };
  const generationSpan = trace.span('generation','generation.api');
  const failure = (error, errorCode, status, headers) => response({error,errorCode,status:'failed'},status,headers);
  if (strict && !isGenerationId(requestedId)) {
    generationSpan.fail('INVALID_GENERATION_ID');
    return failure('A valid generation ID is required.','INVALID_GENERATION_ID',400);
  }
  const requestSpan = trace.span('request','request.validate');
  let body;
  try { body = await readJsonRequest(request, MAX_GENERATION_REQUEST_BYTES); }
  catch (error) {
    const code = error instanceof JsonRequestError ? error.code : 'INVALID_JSON';
    const status = error instanceof JsonRequestError ? error.status : 400;
    requestSpan.fail(code);
    generationSpan.fail(code);
    return await failure(status === 413 ? 'Generation request is too large.' : 'A valid JSON request body is required.',code,status);
  }

  let prepared;
  try { prepared = dependencies.prepareGenerationRequest(body); }
  catch (error) {
    const invalid = error instanceof dependencies.GenerationRequestValidationError;
    requestSpan.fail(invalid ? 'INVALID_GENERATION_REQUEST' : 'REQUEST_PREPARATION_FAILED');
    generationSpan.fail(invalid ? 'INVALID_GENERATION_REQUEST' : 'REQUEST_PREPARATION_FAILED');
    return await failure(invalid ? error.message : 'The generation request could not be prepared.',
      invalid ? 'INVALID_GENERATION_REQUEST' : 'REQUEST_PREPARATION_FAILED',invalid ? 400 : 500);
  }
  requestSpan.complete({metadata:{material_count:prepared.snapshot.materials.length,refinement:false}});

  let activeSpan = null;
  let providerStarted = false;
  let persistenceContext = body.persistence;
  try {
    activeSpan = trace.span('authentication','authentication.verify');
    let guest;
    try {guest = await dependencies.verifiedGuest();}
    catch {
      activeSpan.fail('SESSION_UNAVAILABLE');
      activeSpan = null;
      generationSpan.fail('SESSION_UNAVAILABLE');
      return await failure('Your guest session is unavailable. Please retry.','SESSION_UNAVAILABLE',401);
    }
    activeSpan.complete();
    activeSpan = null;

    if (strict) {
      persistenceContext = dependencies.prepareImagePersistenceContext(body.persistence);
      if (!persistenceContext || !dependencies.persistImageResult) {
        const code = persistenceContext ? 'IMAGE_PERSISTENCE_UNAVAILABLE' : 'IMAGE_PERSISTENCE_INPUT_INVALID';
        generationSpan.fail(code);
        return await failure('Cloud image saving is required.',code,persistenceContext ? 503 : 400);
      }
    }

    if(typeof dependencies.prepareDirectMaterialGeneration!=='function') {
      throw Object.assign(new Error('Direct material generation is not configured.'),{code:'DIRECT_MATERIAL_GENERATION_REQUIRED'});
    }
    const direct=await dependencies.prepareDirectMaterialGeneration(prepared.snapshot);
    if(direct.status!=='ready' || !direct.prompt || direct.request?.input?.messages?.[0]?.content?.length!==5) {
      generationSpan.fail('DIRECT_MATERIAL_GENERATION_REVIEW_REQUIRED');
      return await response({status:'failed',errorCode:'DIRECT_MATERIAL_GENERATION_REVIEW_REQUIRED',
          error:'The selected materials require review before generation.',
          blockers:direct.blockers || []},422);
    }
    prepared.directMaterialGeneration=direct;

    if (dependencies.requireGenerationLifecycle || dependencies.isPersistentJobsEnabled?.()) {
      const plannerMode = 'direct';
      try {
        jobRepository = await dependencies.createGenerationJobsRepository(guest.user.id);
        const reservation = await jobRepository.reserve({
          generationId,ownerId:guest.user.id,plannerMode,
        });
        if (!reservation.reserved) {
          record('generation','generation.duplicate_request','failed',{errorCode:'DUPLICATE_GENERATION'});
          const existing=await jobRepository.getForOwner(generationId,guest.user.id);
          jobRepository = null;
          if (existing) {
            return await response({generationId,status:existing.status,reused:true},202,{
              'X-Spaceee-Persistent-Jobs':'enabled',
            });
          }
          return await response({error:'This generation request has already been started.'},409);
        }
        jobOwnerId = guest.user.id;
        jobStatus = 'running';
        record('generation','generation.job_reserved','completed',{metadata:{mode:plannerMode}});
        if (dependencies.isPersistentJobsEnabled?.()) {
          await jobRepository.appendEvents({
            generationId,ownerId:jobOwnerId,events:dependencies.getTraceEvents?.() || [],
          });
        }
      } catch(error) {
        captureAppFailure(error,{area:'persistence',operation:'job_reservation',code:error?.code});
        if (jobRepository && jobOwnerId) {
          jobStatus = 'failed';
          jobErrorCode = 'JOB_EVENT_PERSIST_FAILED';
        } else {
          jobStatus = null;
          jobOwnerId = null;
        }
        console.error('Generation job reservation failed.',{
          generationId,
          errorCode:/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : 'JOB_RESERVATION_FAILED',
        });
        return await failure('Generation is temporarily unavailable.','JOB_RESERVATION_FAILED',503);
      }
    }

    activeSpan = trace.span('quota','quota.claim');
    const budget = await guest.supabase.rpc('claim_space_generation');
    if (budget.error) {
      captureAppFailure(budget.error,{area:'generation',operation:'quota_claim',code:'QUOTA_UNAVAILABLE'});
      activeSpan.fail('QUOTA_UNAVAILABLE');
      activeSpan = null;
      generationSpan.fail('QUOTA_UNAVAILABLE');
      jobStatus = jobRepository ? 'failed' : null;
      jobErrorCode = 'QUOTA_UNAVAILABLE';
      return await failure('Generation is temporarily unavailable.','QUOTA_UNAVAILABLE',503);
    }
    if (!budget.data) {
      activeSpan.fail('QUOTA_LIMIT_REACHED');
      activeSpan = null;
      generationSpan.fail('QUOTA_LIMIT_REACHED');
      jobStatus = jobRepository ? 'failed' : null;
      jobErrorCode = 'QUOTA_LIMIT_REACHED';
      return await failure('The generation limit has been reached. Please try again tomorrow.','QUOTA_LIMIT_REACHED',429,{'Retry-After':'3600'});
    }
    activeSpan.complete({metadata:{quota_claimed:true}});
    activeSpan = null;

    const {payload,baseImageMetadata}=await executeDirectMaterialGenerationPipeline({prepared,trace,dependencies,
      beforeImageRequest:()=>{providerStarted=true;},
    });
    generationSpan.complete({metadata:{result_state:'provider_image_ready'}});
    jobStatus = jobRepository ? 'image_generated' : null;
    if (dependencies.persistImageResult && persistenceContext) {
      if (jobRepository) {
        try {await jobRepository.transition({generationId,ownerId:jobOwnerId,status:'image_generated'});}
        catch(error) {
          captureAppFailure(error,{area:'persistence',operation:'job_status',code:error?.code});
          console.error('Generation image status update failed.',{generationId,errorCode:error?.code || 'JOB_STATUS_UPDATE_FAILED'});
        }
      }
      try {
        const saved=await dependencies.persistImageResult({
          supabase:guest.supabase,ownerId:guest.user.id,generationId,payload,
          snapshot:{...prepared.snapshot,generationStrategy:{
            id:prepared.directMaterialGeneration.version,
            strategyVersion:prepared.directMaterialGeneration.version,
            promptVersion:prepared.directMaterialGeneration.version,
            materialPromptVersion:prepared.directMaterialGeneration.materialPromptVersion,
            spacePromptVersion:prepared.directMaterialGeneration.spacePromptVersion,
            promptSha256:prepared.directMaterialGeneration.promptSha256,
            referenceIds:prepared.directMaterialGeneration.imageManifest.slice(1).map(image=>({
              materialId:image.materialId,referenceId:image.materialId,sha256:image.sha256,
            })),
            qwenModel:prepared.directMaterialGeneration.request.model,
            qwenParameters:prepared.directMaterialGeneration.request.parameters,
          }},
          baseImageMetadata,context:persistenceContext,
          trace,
        });
        if (strict && (saved?.saved!==true || saved.historyVersionId!==generationId || !saved.imageUrl)) {
          throw new Error('Cloud persistence did not return a saved image.');
        }
        jobStatus=jobRepository ? 'saved' : null;
        jobHistoryVersionId=saved.historyVersionId;
        return await response({...payload,imageUrl:saved.imageUrl,serverPersisted:true});
      } catch(error) {
        captureAppFailure(error,{area:'persistence',operation:'image_save',code:error?.code});
        jobStatus=jobRepository ? 'save_failed' : null;
        jobErrorCode=/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '')?error.code:'IMAGE_SAVE_FAILED';
        if (strict) return await response({status:'save_failed',errorCode:jobErrorCode},503);
        // The browser's existing local/cloud save remains a storage-only fallback.
        return await response({...payload,serverPersisted:false,saveFailed:true});
      }
    }
    return await response(payload);
  } catch (error) {
    captureAppFailure(error,{area:'generation',operation:'image_generation',code:error?.code});
    const safe = safeGenerationError(error);
    const knownProviderFailure=['MISSING_API_KEY','BASE_IMAGE_UNAVAILABLE','INVALID_IMAGE_EDIT_MODEL',
      'INVALID_IMAGE_EDIT_INPUT','QWEN_AUTH_FAILED','QWEN_ACCESS_DENIED','QWEN_MODEL_UNAVAILABLE'];
    const uncertain=providerStarted && !knownProviderFailure.includes(error?.code);
    try {activeSpan?.fail(error?.code || 'UNKNOWN');} catch {}
    generationSpan.fail(error?.code || 'UNKNOWN');
    jobStatus = jobRepository ? uncertain ? 'needs_review' : 'failed' : null;
    jobErrorCode = /^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : 'GENERATION_FAILED';
    record('generation','generation.failed','failed',{errorCode:error?.code || 'UNKNOWN'});
    if (uncertain) record('generation','generation.needs_review','failed',{errorCode:'IMAGE_RESULT_UNKNOWN'});
    // Keep the original safe classification log; never print payloads, prompts or credentials.
    console.error('Space generation failed.', {
      code: error?.code || 'UNKNOWN',
      status: error?.status || null,
      providerCode: error?.providerCode || null,
      requestId: error?.requestId || null,
    });
    return await response(uncertain
      ? {error:'The image request result is uncertain. It was not retried; contact support before starting another generation.',needsReview:true}
      : {error:safe.message,errorCode:jobErrorCode,status:'failed'},safe.status);
  }
}
