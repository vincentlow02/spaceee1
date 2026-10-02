import {
  RECOGNITION_STATUSES,
  createLiveRecognitionState,
} from './positionRecognition';

export const MOCK_POSITION_SCENARIOS = Object.freeze({
  valid: Object.freeze({
    label: 'Valid A / B / C',
    positions: Object.freeze([
      Object.freeze({ position: 1, materialId: 'mock-material-a', confidence: 0.91, status: RECOGNITION_STATUSES.RECOGNIZED }),
      Object.freeze({ position: 2, materialId: 'mock-material-b', confidence: 0.87, status: RECOGNITION_STATUSES.RECOGNIZED }),
      Object.freeze({ position: 3, materialId: 'mock-material-c', confidence: 0.76, status: RECOGNITION_STATUSES.RECOGNIZED }),
    ]),
  }),
  swapped: Object.freeze({
    label: 'Swap A / B',
    positions: Object.freeze([
      Object.freeze({ position: 1, materialId: 'mock-material-b', confidence: 0.88, status: RECOGNITION_STATUSES.RECOGNIZED }),
      Object.freeze({ position: 2, materialId: 'mock-material-a', confidence: 0.9, status: RECOGNITION_STATUSES.RECOGNIZED }),
      Object.freeze({ position: 3, materialId: 'mock-material-c', confidence: 0.78, status: RECOGNITION_STATUSES.RECOGNIZED }),
    ]),
  }),
  unknown: Object.freeze({
    label: 'Unknown at position 2',
    positions: Object.freeze([
      Object.freeze({ position: 1, materialId: 'mock-material-a', confidence: 0.91, status: RECOGNITION_STATUSES.RECOGNIZED }),
      Object.freeze({ position: 2, materialId: null, confidence: 0.31, status: RECOGNITION_STATUSES.UNKNOWN }),
      Object.freeze({ position: 3, materialId: 'mock-material-c', confidence: 0.76, status: RECOGNITION_STATUSES.RECOGNIZED }),
    ]),
  }),
  duplicate: Object.freeze({
    label: 'Duplicate A at position 2',
    positions: Object.freeze([
      Object.freeze({ position: 1, materialId: 'mock-material-a', confidence: 0.91, status: RECOGNITION_STATUSES.RECOGNIZED }),
      Object.freeze({ position: 2, materialId: 'mock-material-a', confidence: 0.84, status: RECOGNITION_STATUSES.RECOGNIZED }),
      Object.freeze({ position: 3, materialId: 'mock-material-c', confidence: 0.76, status: RECOGNITION_STATUSES.RECOGNIZED }),
    ]),
  }),
});

/** Simulate one future frame of position-aware recognition output. */
export function createMockPositionRecognition(scenarioName = 'valid') {
  const scenario = MOCK_POSITION_SCENARIOS[scenarioName];
  if (!scenario) throw new Error(`Unknown mock recognition scenario: ${scenarioName}`);

  const observedAt = new Date().toISOString();
  return createLiveRecognitionState(
    scenario.positions.map((entry) => ({ ...entry, observedAt }))
  );
}
