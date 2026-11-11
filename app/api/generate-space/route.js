import {
  GenerationRequestValidationError,
  prepareGenerationRequest,
} from '@/features/exploration/generationRequest';
import { buildGenerationResponsePayload } from '@/features/exploration/generationResponse';
import { executeDirectMaterialGeneration } from '@/features/exploration/directMaterialGenerationExecution';
import { generateQwenImage } from '@/lib/qwenImage';
import { createGenerationTrace, GENERATION_TRACE_HEADER, isGenerationId } from '@/features/exploration/generationTrace';
import { persistentGenerationJobsEnabled } from '@/features/exploration/generationJobsRepository';
import {
  createVerifiedGenerationJobsRepository,
} from '@/lib/supabase/generationJobs';
import { verifiedGuest } from '@/lib/supabase/server';
import { persistGeneratedImage, prepareImagePersistenceContext, serverImagePersistenceEnabled } from '@/features/exploration/imagePersistence';
import { captureAppFailure } from '@/lib/monitoring/captureAppFailure';
import { prepareDirectMaterialGeneration } from '@/features/exploration/directMaterialGenerationV1.mjs';

export const runtime = 'nodejs';
export const maxDuration = 240;

export async function POST(request) {
  const requestId = request.headers.get(GENERATION_TRACE_HEADER);
  const headers = isGenerationId(requestId) ? { [GENERATION_TRACE_HEADER]: requestId } : {};

  // Public generation always uses the direct material prompt and inline persistence flow.
  const prepareNewRequest = body => {
    const prepared = prepareGenerationRequest(body, { requireSpaceType: true });
    const snapshot = { ...prepared.snapshot };
    delete snapshot.referenceMode;
    snapshot.referenceMode = 'B';
    return { ...prepared, snapshot };
  };

  const traceEvents = [];
  return executeDirectMaterialGeneration(request, {
    GenerationRequestValidationError,
    prepareGenerationRequest: prepareNewRequest,
    verifiedGuest,
    createTrace: generationId => createGenerationTrace({
      generationId,
      scope: 'backend',
      sink: event => {
        traceEvents.push(event);
        console.info('spaceee.trace', JSON.stringify(event));
      },
    }),
    getTraceEvents: () => traceEvents,
    isPersistentJobsEnabled: persistentGenerationJobsEnabled,
    requireGenerationLifecycle: true,
    requireImagePersistence: true,
    prepareImagePersistenceContext,
    prepareDirectMaterialGeneration: async snapshot => {
      return prepareDirectMaterialGeneration({
        spaceType: snapshot.spaceType,
        materialIds: snapshot.materials.map(material => material.materialId),
      });
    },
    createGenerationJobsRepository: createVerifiedGenerationJobsRepository,
    generateQwenImage,
    buildGenerationResponsePayload,
    persistImageResult: serverImagePersistenceEnabled() ? persistGeneratedImage : null,
  });
}
