import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECOGNITION_STATUSES,
  createExplorationSnapshot,
  createLiveRecognitionState,
  getDiscoverEligibility,
} from './positionRecognition.js';

const recognized = (position, materialId, confidence = 0.8) => ({
  position,
  materialId,
  confidence,
  status: RECOGNITION_STATUSES.RECOGNIZED,
  observedAt: '2026-10-01T00:00:00.000Z',
});

test('valid A/B/C state enables Discover', () => {
  const state = createLiveRecognitionState([
    recognized(1, 'mock-material-a'),
    recognized(2, 'mock-material-b'),
    recognized(3, 'mock-material-c'),
  ]);
  assert.equal(getDiscoverEligibility(state).eligible, true);
});

test('unknown position disables Discover', () => {
  const state = createLiveRecognitionState([
    recognized(1, 'mock-material-a'),
    { position: 2, materialId: null, confidence: 0.2, status: RECOGNITION_STATUSES.UNKNOWN },
    recognized(3, 'mock-material-c'),
  ]);
  assert.equal(getDiscoverEligibility(state).reason, 'unrecognized-position');
});

test('duplicate material disables Discover', () => {
  const state = createLiveRecognitionState([
    recognized(1, 'mock-material-a'),
    recognized(2, 'mock-material-a'),
    recognized(3, 'mock-material-c'),
  ]);
  assert.equal(getDiscoverEligibility(state).reason, 'duplicate-material');
});

test('position swap makes position, not confidence, the priority', () => {
  const state = createLiveRecognitionState([
    recognized(1, 'mock-material-b', 0.4),
    recognized(2, 'mock-material-a', 0.99),
    recognized(3, 'mock-material-c', 0.8),
  ]);
  const snapshot = createExplorationSnapshot(state, {
    sessionId: 'test-swap',
    createdAt: '2026-10-01T00:00:00.000Z',
  });
  assert.deepEqual(snapshot.materials.map(({ priority, materialId }) => ({ priority, materialId })), [
    { priority: 1, materialId: 'mock-material-b' },
    { priority: 2, materialId: 'mock-material-a' },
    { priority: 3, materialId: 'mock-material-c' },
  ]);
});

test('snapshot remains immutable after live recognition changes', () => {
  const liveState = createLiveRecognitionState([
    recognized(1, 'mock-material-a'),
    recognized(2, 'mock-material-b'),
    recognized(3, 'mock-material-c'),
  ]);
  const snapshot = createExplorationSnapshot(liveState, {
    sessionId: 'test-immutable',
    createdAt: '2026-10-01T00:00:00.000Z',
  });

  liveState.positions[0].materialId = 'mock-material-c';
  liveState.positions[2].materialId = 'mock-material-a';

  assert.deepEqual(snapshot.materials.map((entry) => entry.materialId), [
    'mock-material-a',
    'mock-material-b',
    'mock-material-c',
  ]);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.materials), true);
  assert.equal(Object.isFrozen(snapshot.materials[0]), true);
});
