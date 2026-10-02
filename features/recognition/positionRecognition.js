/**
 * Phase 4A domain contract for the three fixed positions on the material disk.
 * Position is priority. Confidence is recognition evidence only.
 */

export const DISK_POSITIONS = Object.freeze([1, 2, 3]);

export const RECOGNITION_STATUSES = Object.freeze({
  RECOGNIZED: 'recognized',
  UNKNOWN: 'unknown',
});

function hasAllDiskPositions(positions) {
  if (!Array.isArray(positions) || positions.length !== DISK_POSITIONS.length) {
    return false;
  }

  const uniquePositions = new Set(positions.map((entry) => entry?.position));
  return DISK_POSITIONS.every((position) => uniquePositions.has(position));
}

/** Create a normalized live recognition state ordered by physical position. */
export function createLiveRecognitionState(positions) {
  if (!hasAllDiskPositions(positions)) {
    throw new Error('Live recognition state must contain positions 1, 2, and 3 exactly once.');
  }

  return {
    positions: positions
      .map((entry) => ({ ...entry }))
      .sort((left, right) => left.position - right.position),
  };
}

/**
 * Validate whether the current physical arrangement can be discovered.
 * Confidence never participates in priority or eligibility thresholds.
 */
export function getDiscoverEligibility(liveState) {
  const positions = liveState?.positions;

  if (!hasAllDiskPositions(positions)) {
    return {
      eligible: false,
      reason: 'incomplete-positions',
      message: 'All three disk positions are required.',
    };
  }

  const unrecognizedPositions = positions
    .filter(
      (entry) =>
        entry.status !== RECOGNITION_STATUSES.RECOGNIZED ||
        typeof entry.materialId !== 'string' ||
        entry.materialId.length === 0
    )
    .map((entry) => entry.position);

  if (unrecognizedPositions.length > 0) {
    return {
      eligible: false,
      reason: 'unrecognized-position',
      message: `Waiting for recognition at position${unrecognizedPositions.length > 1 ? 's' : ''} ${unrecognizedPositions.join(', ')}.`,
      positions: unrecognizedPositions,
    };
  }

  const materialIds = positions.map((entry) => entry.materialId);
  const duplicateMaterialIds = materialIds.filter(
    (materialId, index) => materialIds.indexOf(materialId) !== index
  );

  if (duplicateMaterialIds.length > 0) {
    return {
      eligible: false,
      reason: 'duplicate-material',
      message: 'Each physical position must contain a different material.',
      materialIds: [...new Set(duplicateMaterialIds)],
    };
  }

  return {
    eligible: true,
    reason: 'ready',
    message: 'Three different materials are recognized. Ready to discover.',
  };
}

/**
 * Capture an immutable exploration snapshot from the current live state.
 * Later recognition updates cannot mutate this object.
 */
export function createExplorationSnapshot(liveState, options = {}) {
  const eligibility = getDiscoverEligibility(liveState);

  if (!eligibility.eligible) {
    throw new Error(`Cannot create exploration snapshot: ${eligibility.message}`);
  }

  const createdAt = options.createdAt || new Date().toISOString();
  const sessionId = options.sessionId || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const materials = liveState.positions.map((entry) =>
    Object.freeze({
      position: entry.position,
      priority: entry.position,
      materialId: entry.materialId,
      confidence: entry.confidence,
    })
  );

  return Object.freeze({
    sessionId,
    createdAt,
    materials: Object.freeze(materials),
    status: 'captured',
  });
}
