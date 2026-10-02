import { buildSpatialPrompt } from './promptGeneration.js';

const REQUIRED_POSITIONS = Object.freeze([1, 2, 3]);
const MATERIAL_ID_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

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

  const positions = snapshot.materials.map((material) => material?.position);
  const priorities = snapshot.materials.map((material) => material?.priority);

  if (!REQUIRED_POSITIONS.every((position) => positions.includes(position))) {
    invalid('Snapshot positions must be exactly 1, 2, and 3.');
  }

  if (!REQUIRED_POSITIONS.every((priority) => priorities.includes(priority))) {
    invalid('Snapshot priorities must be exactly 1, 2, and 3.');
  }

  const materials = snapshot.materials.map((material) => {
    if (material.position !== material.priority) {
      invalid('Each material priority must match its physical position.');
    }

    if (
      typeof material.materialId !== 'string' ||
      material.materialId.length > 80 ||
      !MATERIAL_ID_PATTERN.test(material.materialId)
    ) {
      invalid('Every snapshot material must include a valid materialId.');
    }

    return Object.freeze({
      position: material.position,
      priority: material.priority,
      materialId: material.materialId,
      confidence: Number.isFinite(material.confidence) ? material.confidence : 0,
    });
  });

  const materialIds = materials.map((material) => material.materialId);
  if (new Set(materialIds).size !== materialIds.length) {
    invalid('Snapshot material IDs must be unique.');
  }

  const sessionId =
    typeof snapshot.sessionId === 'string' && snapshot.sessionId.trim().length > 0
      ? snapshot.sessionId.trim().slice(0, 120)
      : 'unspecified-session';

  return Object.freeze({
    sessionId,
    createdAt: typeof snapshot.createdAt === 'string' ? snapshot.createdAt : null,
    materials: Object.freeze(materials),
    status: 'captured',
  });
}

/**
 * Prepare the trusted server input. A client-supplied prompt is never read;
 * buildSpatialPrompt remains the only source of prompt construction.
 */
export function prepareGenerationRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    invalid('A JSON request body is required.');
  }

  const snapshot = validateGenerationSnapshot(body.snapshot);
  const promptResult = buildSpatialPrompt(snapshot);

  return { snapshot, promptResult };
}
