import { RECOGNITION_STATUSES } from './positionRecognition.js';
import { RECOGNITION_THRESHOLD } from './recognitionConfig.js';

function toTemporaryMaterialId(className) {
  return className
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Adapt one-region Teachable Machine output to a Spacee position record.
 * The highest prediction is found without reordering the raw prediction list.
 */
export function adaptTeachableMachinePredictions(
  predictions,
  { position = 1, threshold = RECOGNITION_THRESHOLD, observedAt } = {}
) {
  const validPredictions = Array.isArray(predictions)
    ? predictions.filter(
        (prediction) =>
          typeof prediction?.className === 'string' &&
          Number.isFinite(prediction?.probability)
      )
    : [];

  let highest = null;
  for (const prediction of validPredictions) {
    if (!highest || prediction.probability > highest.probability) {
      highest = prediction;
    }
  }

  const confidence = highest?.probability ?? 0;
  const recognized = Boolean(highest) && confidence >= threshold;

  return {
    position,
    priority: position,
    materialId: recognized ? toTemporaryMaterialId(highest.className) : null,
    className: highest?.className ?? null,
    confidence,
    status: recognized
      ? RECOGNITION_STATUSES.RECOGNIZED
      : RECOGNITION_STATUSES.UNKNOWN,
    observedAt: observedAt || new Date().toISOString(),
  };
}
