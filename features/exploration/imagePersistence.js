import { createHash } from 'node:crypto';
import { downloadGeneratedImage } from '../../lib/spaceImageDownload.js';
import {
  historyVersionMatches,IMAGE_LIMIT,IMAGE_TYPES,isUuid,validImageSignature,validateCloudRecord,
} from './cloudContract.js';
import { isGenerationId } from './generationTrace.js';

const bucketName='space-images';
const code=error=>/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '')?error.code:'IMAGE_SAVE_FAILED';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const stableUrl=generationId=>`/api/spaces/image?version=${generationId}`;

export function serverImagePersistenceEnabled(env=process.env) {
  return env.SPACEEE_SERVER_IMAGE_PERSISTENCE==='1';
}

/** Only copy the small client-supplied identity/context; owner is always server-derived. */
export function prepareImagePersistenceContext(value) {
  if (!value || !isUuid(value.spaceId) || !Number.isInteger(value.version) ||
      value.version<1 || value.version>1000 || typeof value.title!=='string' ||
      !value.title.trim() || value.title.length>80 ||
      typeof value.initialRequest!=='string' || value.initialRequest.length>1000) return null;
  return {
    spaceId:value.spaceId,version:value.version,
    title:value.title.trim(),initialRequest:value.initialRequest,
  };
}

function persistenceError(code,message) {
  return Object.assign(new Error(message),{code});
}

async function readStoredImage(bucket,path) {
  const {data,error}=await bucket.download(path);
  if (error) {
    if (error.status===404 || String(error.statusCode)==='404') return null;
    throw error;
  }
  if (!data) return null;
  if (!data.size || data.size>IMAGE_LIMIT || !IMAGE_TYPES.includes(data.type)) {
    throw persistenceError('STORAGE_VERIFY_FAILED','Stored image metadata is invalid.');
  }
  const bytes=new Uint8Array(await data.arrayBuffer());
  if (!validImageSignature(bytes,data.type)) {
    throw persistenceError('STORAGE_VERIFY_FAILED','Stored image signature is invalid.');
  }
  return {bytes,type:data.type};
}

/** No provider call occurs here. Reentry with the same generation ID only checks or retries Storage/History. */
export async function persistGeneratedImage({
  supabase,ownerId,generationId,payload,snapshot,baseImageMetadata=null,context,userRequest='',trace=null,
  downloadImage=downloadGeneratedImage,
}) {
  const preparedContext=prepareImagePersistenceContext(context);
  if (!supabase?.from || !supabase?.storage || !isGenerationId(generationId) ||
      !isUuid(ownerId) || !preparedContext || !payload || typeof payload!=='object') {
    throw Object.assign(new Error('Invalid image persistence input.'),{code:'IMAGE_PERSISTENCE_INPUT_INVALID'});
  }
  const {spaceId,version,title,initialRequest}=preparedContext;
  const path=`${ownerId}/${spaceId}/${generationId}`;
  const bucket=supabase.storage.from(bucketName);
  const record={
    id:generationId,spaceId,version,snapshot,initialRequest,userRequest,
  };
  const materials=validateCloudRecord({id:spaceId,title},record);
  const {data:existing,error:existingError}=await supabase.from('space_generations')
    .select('id,space_id,generation_index,storage_path,snapshot,spatial_plan,refinement_instruction')
    .eq('id',generationId).maybeSingle();
  if (existingError) throw existingError;
  const storedBase=baseImageMetadata || existing?.snapshot?.generationBaseImage;
  const storedSnapshot=storedBase ? {...snapshot,generationBaseImage:storedBase} : snapshot;
  const expectedVersion={
    id:generationId,spaceId,version,path,snapshot:storedSnapshot,spatialPlan:payload.spatialPlan || null,userRequest,
  };
  if (existing && !historyVersionMatches(existing,expectedVersion)) {
    throw persistenceError('HISTORY_VERSION_CONFLICT','History identity conflict.');
  }
  const {data:space,error:spaceError}=await supabase.from('spaces')
    .select('id,owner_id').eq('id',spaceId).maybeSingle();
  if (spaceError) throw spaceError;
  if (space && space.owner_id!==ownerId) {
    throw Object.assign(new Error('Space owner mismatch.'),{code:'IMAGE_OWNER_MISMATCH'});
  }
  const alreadyStored=await readStoredImage(bucket,path);
  if (alreadyStored && !existing && typeof payload.imageUrl==='string' && payload.imageUrl.trim()) {
    try {
      const currentResult=await downloadImage(payload.imageUrl);
      if (currentResult.type!==alreadyStored.type || digest(currentResult.bytes)!==digest(alreadyStored.bytes)) {
        throw persistenceError('HISTORY_VERSION_CONFLICT','Stored image does not match this generation.');
      }
    } catch(error) {
      if (error?.code==='HISTORY_VERSION_CONFLICT') throw error;
      trace?.record('persistence','persistence.storage_recovery','skipped',{
        errorCode:code(error),metadata:{skip_reason:'provider_image_unavailable'},
      });
    }
  }
  if (existing && alreadyStored) {
    trace?.record('persistence','persistence.saved','completed',{metadata:{result_state:'already_saved'}});
    return {saved:true,imageUrl:stableUrl(generationId),historyVersionId:generationId,reused:true};
  }

  const span=trace?.span('persistence','persistence.persisting',{save_scope:'cloud'});
  try {
    // Reuse a completed upload after a crash; temporary provider URLs may already have expired.
    const storedImage=alreadyStored || await (async()=>{
      if (typeof payload.imageUrl!=='string' || !payload.imageUrl.trim()) {
        throw persistenceError('IMAGE_RESULT_UNAVAILABLE','Generated image is unavailable for persistence.');
      }
      return downloadImage(payload.imageUrl);
    })();
    const {bytes,type}=storedImage;
    if (!space) {
      const created=await supabase.from('spaces').insert({
        id:spaceId,owner_id:ownerId,title,description:initialRequest,selected_materials:materials,
      });
      if (created.error && created.error.code!=='23505') throw created.error;
      const {data:owned,error:ownedError}=await supabase.from('spaces')
        .select('owner_id').eq('id',spaceId).maybeSingle();
      if (ownedError || owned?.owner_id!==ownerId) {
        throw Object.assign(new Error('Space owner mismatch.'),{code:'IMAGE_OWNER_MISMATCH'});
      }
    }
    let uploadError=null;
    if (!alreadyStored) {
      const upload=await bucket.upload(path,bytes,{contentType:type,cacheControl:'0',upsert:false});
      uploadError=upload.error;
    }
    // Verify the private object before committing a visible History row.
    const verified=await readStoredImage(bucket,path);
    if (!verified || verified.type!==type || digest(verified.bytes)!==digest(bytes)) {
      if (uploadError) throw uploadError;
      throw persistenceError('STORAGE_VERIFY_FAILED','Storage verification failed.');
    }
    if (!existing) {
      const saved=await supabase.from('space_generations').insert({
        id:generationId,space_id:spaceId,generation_index:version,storage_path:path,
        snapshot:storedSnapshot,spatial_plan:payload.spatialPlan || null,refinement_instruction:userRequest,
      });
      if (saved.error && saved.error.code!=='23505') throw saved.error;
      const {data:linked,error:linkedError}=await supabase.from('space_generations')
        .select('id,space_id,generation_index,storage_path,snapshot,spatial_plan,refinement_instruction')
        .eq('id',generationId).maybeSingle();
      if (linkedError || !historyVersionMatches(linked,expectedVersion)) {
        throw persistenceError('HISTORY_VERSION_CONFLICT','History identity conflict.');
      }
    }
    const updated=await supabase.from('spaces').update({updated_at:new Date().toISOString()})
      .eq('id',spaceId).eq('owner_id',ownerId);
    if (updated.error) throw updated.error;
    span?.complete({metadata:{image_bytes:bytes.byteLength,cloud_saved:true}});
    trace?.record('persistence','persistence.saved','completed',{metadata:{cloud_saved:true}});
    return {saved:true,imageUrl:stableUrl(generationId),historyVersionId:generationId,reused:false};
  } catch(error) {
    span?.fail(code(error));
    trace?.record('persistence','persistence.save_failed','failed',{errorCode:code(error)});
    throw error;
  }
}
