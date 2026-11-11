import { z } from 'zod';

export const GENERATION_TRACE_HEADER = 'X-Spaceee-Generation-Id';
export const GENERATION_ATTEMPT_HEADER = 'X-Spaceee-Attempt-Id';
export const GENERATION_TRACE_STORE = 'spaceee-generation-traces-v1';

const UUID = z.uuid();
const STAGES = [
  'selection', 'request', 'authentication', 'quota', 'planning', 'planning_model',
  'planning_fallback', 'prompt', 'image', 'response', 'frontend_result',
  'image_download', 'indexeddb', 'supabase_preflight', 'storage_upload',
  'supabase_finalize', 'history_refresh', 'persistence', 'persistence_retry',
  'generation',
  'agent', 'agent_model', 'agent_tool', 'agent_validation', 'agent_repair',
  'agent_budget', 'agent_fallback',
];

export const GenerationTraceEventSchema = z.strictObject({
  generation_id: UUID,
  event_id: UUID,
  attempt_id: UUID.nullable(),
  timestamp: z.iso.datetime({ offset: true }),
  scope: z.enum(['frontend', 'backend']),
  stage: z.enum(STAGES),
  event_type: z.string().max(128).regex(/^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*$/),
  status: z.enum(['started', 'completed', 'failed', 'skipped']),
  duration_ms: z.number().finite().nonnegative().nullable(),
  error_code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/).nullable(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

const STRING_FIELDS = new Set([
  'mode', 'planner_source', 'skip_reason', 'provider', 'model', 'provider_request_id',
  'usage_status', 'attempt_kind', 'save_scope', 'selection_hash', 'prompt_hash',
  'requested_size', 'result_state', 'source',
  'agent_run_id', 'tool_call_id', 'tool_name', 'fallback_reason',
  'budget_kind', 'validation_status', 'tool_args_shape', 'tool_result_summary',
  'model_call_kind', 'finish_reason', 'json_parse_error_category',
  'validation_issue_code', 'validation_path', 'thinking_mode',
  'evidence_link_status',
  'prompt_version', 'generation_strategy_version',
]);
const NUMBER_FIELDS = new Set([
  'material_count', 'request_count', 'http_status', 'input_tokens', 'output_tokens',
  'prompt_tokens', 'completion_tokens',
  'image_count', 'image_bytes', 'version', 'response_status', 'prompt_length',
  'issue_count', 'model_call_count', 'tool_call_count', 'repair_count',
  'plan_assignment_count',
  'signature_element_count', 'supporting_element_count', 'surface_element_count',
  'max_tokens', 'reasoning_tokens',
  'visible_evidence_count', 'linked_evidence_count', 'unlinked_evidence_count',
  'invalid_evidence_reference_count',
]);
const BOOLEAN_FIELDS = new Set([
  'local_saved', 'cloud_saved', 'refinement', 'quota_claimed', 'importance_metadata_supplied',
  'output_empty', 'json_parse_succeeded', 'structurally_incomplete', 'finish_reason_available',
]);

export function isGenerationId(value) {
  return UUID.safeParse(value).success;
}

export function createGenerationId() {
  return crypto.randomUUID();
}

export function resolveGenerationId(value) {
  return isGenerationId(value) ? value : createGenerationId();
}

/** Explicit allowlist: arbitrary prompt, URL, token, user and error objects never enter metadata. */
export function safeTraceMetadata(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const safe = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'base_image_path' && typeof value === 'string' && /^\/images\/space-bases\/[a-zA-Z0-9._-]+$/.test(value)) {
      safe[key] = value;
    } else if (key === 'base_image_sha256' && typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) {
      safe[key] = value;
    } else if (key === 'space_type' && typeof value === 'string' && /^[a-z0-9-]+$/.test(value)) {
      safe[key] = value;
    } else if (STRING_FIELDS.has(key) && typeof value === 'string' && value.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(value)) {
      safe[key] = value;
    } else if (NUMBER_FIELDS.has(key) && Number.isSafeInteger(value) && value >= 0) {
      safe[key] = value;
    } else if (key === 'surface_proportion' && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1) {
      safe[key] = value;
    } else if (BOOLEAN_FIELDS.has(key) && typeof value === 'boolean') {
      safe[key] = value;
    } else if (key === 'usage_status' && value === null) {
      safe[key] = null;
    }
  }
  return safe;
}

export function safeTraceErrorCode(value) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(value) ? value : 'UNKNOWN';
}

export function providerUsageMetadata(payload) {
  const usage = payload?.usage;
  const input = usage?.input_tokens ?? usage?.prompt_tokens;
  const output = usage?.output_tokens ?? usage?.completion_tokens;
  const reasoning = usage?.output_token_details?.reasoning ??
    usage?.completion_tokens_details?.reasoning_tokens ??
    usage?.reasoning_tokens;
  const inputTokens = Number.isSafeInteger(input) && input >= 0 ? input : undefined;
  const outputTokens = Number.isSafeInteger(output) && output >= 0 ? output : undefined;
  const reasoningTokens = Number.isSafeInteger(reasoning) && reasoning >= 0 ? reasoning : undefined;
  return {
    ...(inputTokens === undefined ? {} : {input_tokens:inputTokens}),
    ...(outputTokens === undefined ? {} : {output_tokens:outputTokens}),
    ...(reasoningTokens === undefined ? {} : {reasoning_tokens:reasoningTokens}),
    usage_status:inputTokens === undefined && outputTokens === undefined ? 'unknown' : 'reported',
  };
}

/** Every recorder operation is best effort; a broken logger must not break generation. */
export function createGenerationTrace({ generationId, scope, sink = () => {}, clock = () => performance.now(), timestamp = () => new Date().toISOString(), idFactory = createGenerationId, attemptId = null }) {
  const id = resolveGenerationId(generationId);
  function record(stage, eventType, status, details = {}) {
    try {
      const event = GenerationTraceEventSchema.parse({
        generation_id: id,
        event_id: idFactory(),
        attempt_id: isGenerationId(details.attemptId) ? details.attemptId : attemptId,
        timestamp: timestamp(),
        scope,
        stage,
        event_type: eventType,
        status,
        duration_ms: Number.isFinite(details.durationMs) ? Math.max(0, Math.round(details.durationMs)) : null,
        error_code: status === 'failed' ? safeTraceErrorCode(details.errorCode) : null,
        metadata: safeTraceMetadata(details.metadata),
      });
      try { sink(event); } catch {}
      return event;
    } catch { return null; }
  }
  function span(stage, eventType, metadata = {}, details = {}) {
    const startedAt = clock();
    record(stage, eventType, 'started', { ...details, metadata });
    return {
      complete(extra = {}) { return record(stage, eventType, 'completed', { ...details, ...extra, durationMs: clock() - startedAt }); },
      fail(errorCode, extra = {}) { return record(stage, eventType, 'failed', { ...details, ...extra, errorCode, durationMs: clock() - startedAt }); },
      skip(reason, extra = {}) { return record(stage, eventType, 'skipped', { ...details, ...extra, durationMs: clock() - startedAt, metadata: { ...extra.metadata, skip_reason: reason } }); },
    };
  }
  return { generationId: id, record, span };
}

export function createBackendTrace(generationId, options = {}) {
  return createGenerationTrace({
    generationId, scope: 'backend',
    sink: event => console.info('spaceee.trace', JSON.stringify(event)),
    ...options,
  });
}

export function createFrontendTrace(generationId, options = {}) {
  return createGenerationTrace({
    generationId, scope: 'frontend',
    sink: event => {
      if (process.env.NODE_ENV !== 'production') console.info('spaceee.trace', JSON.stringify(event));
      if (typeof sessionStorage === 'undefined') return;
      try {
        const events = JSON.parse(sessionStorage.getItem(GENERATION_TRACE_STORE) || '[]');
        const next = Array.isArray(events) ? [...events.slice(-299), event] : [event];
        sessionStorage.setItem(GENERATION_TRACE_STORE, JSON.stringify(next));
      } catch {}
    },
    ...options,
  });
}

export function readFrontendTrace(generationId) {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const events = JSON.parse(sessionStorage.getItem(GENERATION_TRACE_STORE) || '[]');
    return Array.isArray(events) ? events.filter(event => event.generation_id === generationId && GenerationTraceEventSchema.safeParse(event).success) : [];
  } catch { return []; }
}
