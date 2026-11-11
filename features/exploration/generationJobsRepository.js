import {
  GenerationTraceEventSchema,
  isGenerationId,
  safeTraceErrorCode,
  safeTraceMetadata,
} from './generationTrace.js';

export const GENERATION_JOB_STATUSES = Object.freeze([
  'running',
  'image_generated',
  'save_failed',
  'saved',
  'failed',
  'needs_review',
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  running: new Set(['image_generated', 'failed', 'needs_review']),
  image_generated: new Set(['save_failed', 'saved']),
  save_failed: new Set(['save_failed', 'saved']),
  saved: new Set(),
  failed: new Set(),
  needs_review: new Set(),
});

export function persistentGenerationJobsEnabled(env = process.env) {
  return env.SPACEEE_PERSISTENT_GENERATION_JOBS === '1';
}

function assertGenerationJobInput({generationId, ownerId, plannerMode}) {
  if (!isGenerationId(generationId)) throw new Error('INVALID_GENERATION_ID');
  if (typeof ownerId !== 'string' || !ownerId) throw new Error('INVALID_GENERATION_OWNER');
  if (plannerMode!=='direct') throw new Error('INVALID_PLANNER_MODE');
}

function toStoredEvent(event, ownerId, generationId) {
  const parsed = GenerationTraceEventSchema.safeParse(event);
  if (!parsed.success || parsed.data.generation_id !== generationId) {
    throw new Error('INVALID_GENERATION_EVENT');
  }
  const value = parsed.data;
  return {
    event_id: value.event_id,
    generation_id: value.generation_id,
    owner_id: ownerId,
    attempt_id: value.attempt_id,
    scope: value.scope,
    stage: value.stage,
    event_type: value.event_type,
    status: value.status,
    duration_ms: value.duration_ms,
    error_code: value.status === 'failed' ? safeTraceErrorCode(value.error_code) : null,
    safe_metadata: safeTraceMetadata(value.metadata),
    timestamp: value.timestamp,
  };
}

export function createGenerationJobsRepository(supabase, authorizedOwnerId) {
  if (!supabase?.from) throw new Error('SUPABASE_CLIENT_REQUIRED');
  if (typeof authorizedOwnerId !== 'string' || !authorizedOwnerId) {
    throw new Error('GENERATION_JOB_OWNER_REQUIRED');
  }
  const assertAuthorizedOwner = ownerId => {
    if (ownerId !== authorizedOwnerId) throw new Error('GENERATION_JOB_OWNER_MISMATCH');
  };

  return Object.freeze({
    async getForOwner(generationId,ownerId) {
      assertAuthorizedOwner(ownerId);
      if (!isGenerationId(generationId)) throw new Error('INVALID_GENERATION_ID');
      const {data,error}=await supabase.from('generation_jobs')
        .select('generation_id,owner_id,status,error_code,history_version_id,updated_at')
        .eq('generation_id',generationId).eq('owner_id',ownerId).maybeSingle();
      if (error) throw error;
      return data;
    },

    async reserve({generationId, ownerId, plannerMode}) {
      assertAuthorizedOwner(ownerId);
      assertGenerationJobInput({generationId, ownerId, plannerMode});
      const {error} = await supabase.from('generation_jobs').insert({
        generation_id:generationId,
        owner_id:ownerId,
        planner_mode:plannerMode,
        status:'running',
      });
      if (!error) return {reserved:true};
      if (error.code === '23505') return {reserved:false};
      throw error;
    },

    async appendEvents({generationId, ownerId, events}) {
      assertAuthorizedOwner(ownerId);
      if (!isGenerationId(generationId)) throw new Error('INVALID_GENERATION_ID');
      if (!Array.isArray(events) || events.length > 300) throw new Error('INVALID_GENERATION_EVENTS');
      if (!events.length) return {appended:0};
      const rows = events.map(event => toStoredEvent(event,ownerId,generationId));
      const {data:job,error:jobError} = await supabase.from('generation_jobs')
        .select('generation_id').eq('generation_id',generationId).eq('owner_id',ownerId).maybeSingle();
      if (jobError) throw jobError;
      if (!job) throw new Error('GENERATION_JOB_NOT_OWNED');
      const {error} = await supabase.from('generation_events')
        .upsert(rows,{onConflict:'event_id',ignoreDuplicates:true});
      if (error) throw error;
      return {appended:rows.length};
    },

    async transition({generationId, ownerId, status, errorCode = null}) {
      assertAuthorizedOwner(ownerId);
      if (!isGenerationId(generationId)) throw new Error('INVALID_GENERATION_ID');
      if (!GENERATION_JOB_STATUSES.includes(status)) throw new Error('INVALID_GENERATION_JOB_STATUS');
      if (errorCode !== null && !/^[A-Z][A-Z0-9_]{0,63}$/.test(errorCode)) {
        throw new Error('INVALID_GENERATION_JOB_ERROR');
      }
      const table = supabase.from('generation_jobs');
      const {data:current, error:readError} = await table.select('status')
        .eq('generation_id',generationId).eq('owner_id',ownerId).maybeSingle();
      if (readError) throw readError;
      if (!current) return {updated:false};
      if (current.status === status && status !== 'save_failed') return {updated:true};
      if (current.status !== status && !ALLOWED_TRANSITIONS[current.status]?.has(status)) {
        throw new Error('INVALID_GENERATION_JOB_TRANSITION');
      }

      const completedAt = ['saved','failed','needs_review'].includes(status) ? new Date().toISOString() : null;
      const {data, error} = await supabase.from('generation_jobs').update({
        status,
        error_code:errorCode,
        completed_at:completedAt,
        updated_at:new Date().toISOString(),
      }).eq('generation_id',generationId).eq('owner_id',ownerId).eq('status',current.status)
        .select('generation_id').maybeSingle();
      if (error) throw error;
      if (data) return {updated:true};

      const {data:latest, error:latestError} = await supabase.from('generation_jobs').select('status')
        .eq('generation_id',generationId).eq('owner_id',ownerId).maybeSingle();
      if (latestError) throw latestError;
      if (latest?.status === status) return {updated:true};
      throw new Error('GENERATION_JOB_STATE_CONFLICT');
    },

    async linkHistoryVersion({generationId, ownerId, historyVersionId}) {
      assertAuthorizedOwner(ownerId);
      if (!isGenerationId(generationId) || !isGenerationId(historyVersionId)) {
        throw new Error('INVALID_HISTORY_VERSION_ID');
      }
      const {data:current,error:readError}=await supabase.from('generation_jobs')
        .select('history_version_id')
        .eq('generation_id',generationId).eq('owner_id',ownerId).maybeSingle();
      if (readError) throw readError;
      if (!current) return {linked:false};
      if (current.history_version_id===historyVersionId) return {linked:true};
      if (current.history_version_id) throw new Error('HISTORY_VERSION_ALREADY_LINKED');
      const {data,error}=await supabase.from('generation_jobs')
        .update({history_version_id:historyVersionId})
        .eq('generation_id',generationId).eq('owner_id',ownerId).is('history_version_id',null)
        .select('generation_id').maybeSingle();
      if (error) throw error;
      if (data) return {linked:true};
      const {data:latest,error:latestError}=await supabase.from('generation_jobs')
        .select('history_version_id')
        .eq('generation_id',generationId).eq('owner_id',ownerId).maybeSingle();
      if (latestError) throw latestError;
      if (latest?.history_version_id===historyVersionId) return {linked:true};
      throw new Error('HISTORY_VERSION_LINK_CONFLICT');
    },

    async markSaved({generationId, ownerId, historyVersionId}) {
      const {data:current,error}=await supabase.from('generation_jobs').select('status')
        .eq('generation_id',generationId).eq('owner_id',ownerId).maybeSingle();
      if (error) throw error;
      if (!current) return {saved:false};
      if (['failed','needs_review'].includes(current.status)) {
        throw new Error('UNRESOLVED_GENERATION_CANNOT_BE_SAVED');
      }
      if (current.status==='running') {
        await this.transition({generationId,ownerId,status:'image_generated'});
      }
      await this.linkHistoryVersion({generationId,ownerId,historyVersionId});
      await this.transition({generationId,ownerId,status:'saved'});
      return {saved:true};
    },
  });
}
