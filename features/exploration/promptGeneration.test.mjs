import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpatialPrompt } from './promptGeneration.js';

function snapshot(materials, overrides = {}) {
  return {
    sessionId: 'prompt-test',
    createdAt: '2026-10-02T00:00:00.000Z',
    status: 'captured',
    materials: materials.map((material, index) => ({
      position: index + 1,
      priority: index + 1,
      confidence: 0.9,
      ...material,
    })),
    ...overrides,
  };
}

test('builds a deterministic prompt containing all materials in snapshot priority order', () => {
  const input = snapshot([
    { materialId: 'coke-can' },
    { materialId: 'blackcan' },
    { materialId: 'tissue' },
  ]);

  const first = buildSpatialPrompt(input);
  const second = buildSpatialPrompt(input);

  assert.equal(first.prompt, second.prompt);
  assert.ok(first.prompt.indexOf('Priority 1 (Position 1):') < first.prompt.indexOf('Priority 2 (Position 2):'));
  assert.ok(first.prompt.indexOf('Priority 2 (Position 2):') < first.prompt.indexOf('Priority 3 (Position 3):'));
  assert.match(first.prompt, /Name: Coke Can/);
  assert.match(first.prompt, /Name: Black Can/);
  assert.match(first.prompt, /Name: Tissue/);
});

test('preserves physical position order instead of sorting by material identity', () => {
  const result = buildSpatialPrompt(
    snapshot([
      { materialId: 'material-b' },
      { materialId: 'material-a' },
      { materialId: 'material-c' },
    ])
  );

  assert.deepEqual(result.materials.map((material) => material.materialId), [
    'material-b',
    'material-a',
    'material-c',
  ]);
  assert.ok(result.prompt.indexOf('Material ID: material-b') < result.prompt.indexOf('Material ID: material-a'));
});

test('uses unknown for missing properties without inventing information', () => {
  const result = buildSpatialPrompt(snapshot([
    { materialId: 'coke-can' },
    { materialId: 'blackcan' },
    { materialId: 'tissue' },
  ]));

  assert.match(result.prompt, /- Texture: unknown/);
  assert.match(result.prompt, /- Material: unknown/);
  assert.equal(result.materials[0].properties.texture, 'unknown');
});

test('does not mutate the source snapshot', () => {
  const input = snapshot([
    { materialId: 'coke-can' },
    { materialId: 'blackcan' },
    { materialId: 'tissue' },
  ]);
  const before = structuredClone(input);

  buildSpatialPrompt(input);

  assert.deepEqual(input, before);
});

test('does not inject a hard-coded spatial style', () => {
  const prompt = buildSpatialPrompt(snapshot([
    { materialId: 'coke-can' },
    { materialId: 'blackcan' },
    { materialId: 'tissue' },
  ])).prompt.toLowerCase();

  for (const forbidden of ['industrial', 'minimalist', 'japanese', 'scandinavian', 'modern', 'traditional']) {
    assert.equal(prompt.includes(forbidden), false, `prompt unexpectedly contains ${forbidden}`);
  }
});

test('createdAt metadata does not influence the creative prompt', () => {
  const materials = [
    { materialId: 'coke-can' },
    { materialId: 'blackcan' },
    { materialId: 'tissue' },
  ];
  const first = buildSpatialPrompt(snapshot(materials, { createdAt: '2026-01-01T00:00:00.000Z' }));
  const second = buildSpatialPrompt(snapshot(materials, { createdAt: '2030-12-31T23:59:59.000Z' }));

  assert.equal(first.prompt, second.prompt);
});
