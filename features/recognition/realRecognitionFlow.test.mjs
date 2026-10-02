import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptTeachableMachinePredictions } from './teachableMachineAdapter.js';
import {
  createExplorationSnapshot,
  createLiveRecognitionState,
  getDiscoverEligibility,
} from './positionRecognition.js';

function recognizedPosition(position, className, probability = 0.9) {
  return adaptTeachableMachinePredictions(
    [{ className, probability }],
    { position, observedAt: '2026-10-01T00:00:00.000Z' }
  );
}

test('real three-position state becomes eligible and creates an immutable snapshot', () => {
  const liveState = createLiveRecognitionState([
    recognizedPosition(1, 'coke can', 0.92),
    recognizedPosition(2, 'blackcan', 0.89),
    recognizedPosition(3, 'tissue', 0.95),
  ]);

  assert.equal(getDiscoverEligibility(liveState).eligible, true);

  const snapshot = createExplorationSnapshot(liveState, {
    sessionId: 'real-recognition-test',
    createdAt: '2026-10-01T00:00:00.000Z',
  });

  liveState.positions[0] = recognizedPosition(1, 'blackcan');
  liveState.positions[1] = recognizedPosition(2, 'coke can');

  assert.deepEqual(snapshot.materials.map((material) => material.materialId), [
    'coke-can',
    'blackcan',
    'tissue',
  ]);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.materials), true);
});

test('unknown real position keeps Discover disabled', () => {
  const liveState = createLiveRecognitionState([
    recognizedPosition(1, 'coke can'),
    adaptTeachableMachinePredictions([{ className: 'blackcan', probability: 0.42 }], { position: 2 }),
    recognizedPosition(3, 'tissue'),
  ]);

  const eligibility = getDiscoverEligibility(liveState);
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.reason, 'unrecognized-position');
  assert.deepEqual(eligibility.positions, [2]);
});

test('duplicate real recognition stays intact while Discover is disabled', () => {
  const liveState = createLiveRecognitionState([
    recognizedPosition(1, 'coke can'),
    recognizedPosition(2, 'coke can'),
    recognizedPosition(3, 'tissue'),
  ]);

  assert.equal(liveState.positions[0].materialId, 'coke-can');
  assert.equal(liveState.positions[1].materialId, 'coke-can');
  assert.equal(getDiscoverEligibility(liveState).reason, 'duplicate-material');
});
