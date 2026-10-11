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
  assert.ok(first.prompt.indexOf('first material is Coke Can') < first.prompt.indexOf('second material is Black Can'));
  assert.ok(first.prompt.indexOf('second material is Black Can') < first.prompt.indexOf('third material is Tissue'));
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
  assert.ok(result.prompt.indexOf('first material is Material B') < result.prompt.indexOf('second material is Material A'));
});

test('uses unknown for missing properties without inventing information', () => {
  const result = buildSpatialPrompt(snapshot([
    { materialId: 'coke-can' },
    { materialId: 'blackcan' },
    { materialId: 'tissue' },
  ]));

  assert.doesNotMatch(result.prompt, /Texture: unknown|Material: unknown/);
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

test('uses the fixed base as structural input, not just as a style reference', () => {
  const {prompt} = buildSpatialPrompt(snapshot([
    {materialId:'coke-can'}, {materialId:'blackcan'}, {materialId:'tissue'},
  ]));
  assert.match(prompt, /fixed spatial template rather than using it as a style reference/);
  assert.match(prompt, /Preserve its room geometry, camera angle, perspective/);
  assert.match(prompt, /central floor-to-ceiling window/);
  assert.match(prompt, /one photorealistic interior view of this same base space/);
  assert.doesNotMatch(prompt, /not a photorealistic 3D interior rendering/);
});

test('requests a furnished interior without rendering prompt metadata as a board', () => {
  const {prompt} = buildSpatialPrompt(snapshot([
    {materialId:'coke-can'}, {materialId:'blackcan'}, {materialId:'tissue'},
  ]));
  assert.match(prompt, /believable, complete interior/);
  assert.match(prompt, /must contain only the interior scene/);
  assert.doesNotMatch(prompt, /OBSERVED FACTS|AI INTERPRETATION|Priority \d|Material ID:/);
});

test('passes distinct White PVC and Aluminum profiles into the existing spatial prompt', () => {
  const result = buildSpatialPrompt(snapshot([
    {materialId:'koeido-eb-02'}, {materialId:'koeido-al-03'}, {materialId:'jute'},
  ]));
  assert.match(result.prompt, /smooth, opaque white PVC plastic material/);
  assert.match(result.prompt, /realistic natural silver aluminum/);
  assert.match(result.prompt, /Avoid exaggerated mirror reflections, heavy brushed patterns/);
  assert.deepEqual(result.materials.slice(0,2).map(material => material.materialId), ['koeido-eb-02','koeido-al-03']);
});
