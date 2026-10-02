import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptTeachableMachinePredictions } from './teachableMachineAdapter.js';
import { createLiveRecognitionState } from './positionRecognition.js';

const predictions = [
  { className: 'coke can', probability: 0.92 },
  { className: 'black can', probability: 0.05 },
  { className: 'tissue', probability: 0.03 },
];

test('maps a confident class to the fixed Position 1 contract', () => {
  const result = adaptTeachableMachinePredictions(predictions, {
    position: 1,
    threshold: 0.75,
    observedAt: '2026-10-01T00:00:00.000Z',
  });

  assert.deepEqual(result, {
    position: 1,
    priority: 1,
    materialId: 'coke-can',
    className: 'coke can',
    confidence: 0.92,
    status: 'recognized',
    observedAt: '2026-10-01T00:00:00.000Z',
  });
});

test('returns unknown below the configured threshold', () => {
  const result = adaptTeachableMachinePredictions(
    predictions.map((prediction) => ({ ...prediction, probability: prediction.probability / 2 })),
    { threshold: 0.75 }
  );

  assert.equal(result.status, 'unknown');
  assert.equal(result.materialId, null);
  assert.equal(result.className, 'coke can');
});

test('does not reorder raw predictions and confidence never changes priority', () => {
  const raw = [
    { className: 'tissue', probability: 0.1 },
    { className: 'black can', probability: 0.99 },
    { className: 'coke can', probability: 0.2 },
  ];
  const originalOrder = raw.map((prediction) => prediction.className);
  const result = adaptTeachableMachinePredictions(raw, { position: 1 });

  assert.deepEqual(raw.map((prediction) => prediction.className), originalOrder);
  assert.equal(result.materialId, 'black-can');
  assert.equal(result.position, 1);
  assert.equal(result.priority, 1);
});

test('empty predictions produce an unknown Position 1 state', () => {
  const result = adaptTeachableMachinePredictions([]);
  assert.equal(result.position, 1);
  assert.equal(result.priority, 1);
  assert.equal(result.status, 'unknown');
  assert.equal(result.confidence, 0);
});

test('three independent predictions preserve fixed position and priority', () => {
  const classes = [
    { className: 'coke can', probability: 0.92 },
    { className: 'black can', probability: 0.89 },
    { className: 'tissue', probability: 0.95 },
  ];
  const liveState = createLiveRecognitionState(
    classes.map((prediction, index) =>
      adaptTeachableMachinePredictions([prediction], {
        position: index + 1,
        observedAt: '2026-10-01T00:00:00.000Z',
      })
    )
  );

  assert.deepEqual(
    liveState.positions.map(({ position, priority, materialId }) => ({ position, priority, materialId })),
    [
      { position: 1, priority: 1, materialId: 'coke-can' },
      { position: 2, priority: 2, materialId: 'black-can' },
      { position: 3, priority: 3, materialId: 'tissue' },
    ]
  );
});
