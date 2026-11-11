import { isGenerationCandidateMaterial } from '../../lib/materials/materials.js';
import { validateMaterialSnapshot } from './generationDataContract.js';
import { getSpaceType } from './spaceTypes.js';

const SNAPSHOT_ISSUE_MESSAGES = Object.freeze({
  INVALID_POSITION:'Snapshot positions must be exactly 1, 2, and 3.',
  INVALID_PRIORITY:'Each material priority must match its physical position.',
  DUPLICATE_MATERIAL_ID:'Snapshot material IDs must be unique.',
  UNKNOWN_MATERIAL_ID:'Every selected material must exist in the canonical Material Registry.',
});

export class GenerationRequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GenerationRequestValidationError';
    this.code = 'INVALID_GENERATION_REQUEST';
  }
}

function invalid(message) {
  throw new GenerationRequestValidationError(message);
}

/**
 * Validate and copy the untrusted browser payload into the exact Snapshot shape
 * accepted by the server-side Prompt Builder. Extra client fields are ignored.
 */
export function validateGenerationSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    invalid('A valid Exploration Snapshot is required.');
  }
  if (snapshot.status !== 'captured') {
    invalid('The Exploration Snapshot must have captured status.');
  }
  if (!Array.isArray(snapshot.materials) || snapshot.materials.length !== 3) {
    invalid('The Exploration Snapshot must contain exactly three materials.');
  }
  const validation = validateMaterialSnapshot(snapshot);
  if (!validation.ok) {
    const issue = validation.issues[0];
    invalid(SNAPSHOT_ISSUE_MESSAGES[issue?.code] ||
      (issue?.path?.at(-1) === 'materialId'
        ? 'Every snapshot material must include a valid materialId.'
        : 'The Exploration Snapshot is invalid.'));
  }
  const { snapshot: normalized } = validation;
  if (normalized.materials.some(material => !isGenerationCandidateMaterial(material.materialId))) {
    invalid('Retired materials are not candidates for new generation.');
  }
  return normalized;
}

/**
 * Normalize the three selected slots before any provider or job work.
 * Accept empty legacy description fields so older material-only jobs can finish.
 */
export function prepareGenerationRequest(body, {requireSpaceType = false} = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    invalid('A JSON request body is required.');
  }
  if ((requireSpaceType || body.snapshot?.spaceType != null) && !getSpaceType(body.snapshot?.spaceType)) {
    invalid('A valid spaceType is required.');
  }
  if ((body.userRequest != null && (typeof body.userRequest !== 'string' || body.userRequest.trim())) ||
      body.refinementImageUrl != null) {
    const error = new GenerationRequestValidationError('This version only supports generation from three materials.');
    error.code = 'LEGACY_GENERATION_UNSUPPORTED';
    throw error;
  }

  return { snapshot: validateGenerationSnapshot(body.snapshot) };
}
