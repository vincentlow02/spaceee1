import assert from 'node:assert/strict';
import test from 'node:test';
import { MATERIALS, getMaterialById, getMaterialPrompt } from './materials.js';
import { adaptTeachableMachinePredictions } from '../../features/recognition/teachableMachineAdapter.js';

const identities = [
  ['japanese-igusa', 'Japanese Igusa'],
  ['jute', 'Jute'],
  ['split-marble-gray', 'Split Marble Gray'],
  ['oak-knotty-e190', 'Oak Knotty E190'],
  ['cement-02-ea6652k', 'Cement 02 / EA6652K'],
];

test('registry contains exactly the five requested canonical identities', () => {
  assert.deepEqual(Object.keys(MATERIALS), identities.map(([id]) => id));
  for (const [id, name] of identities) {
    const material = getMaterialById(id);
    assert.equal(material.id, id);
    assert.equal(material.name, name);
    for (const field of ['visualProperties', 'texture', 'color', 'lighting',
      'recommendedUsage', 'avoid', 'materialPrompt']) {
      assert.ok(Object.hasOwn(material, field));
    }
    assert.equal(getMaterialPrompt(id), material.materialPrompt);
  }
});

test('lookups trim whitespace but do not silently alias unknown recognition IDs', () => {
  assert.equal(getMaterialById(' jute '), MATERIALS.jute);
  for (const id of [null, undefined, 1, {}, '', 'Jute', 'unknown',
    'coke-can', 'blackcan', 'tissue', '__proto__', 'constructor', 'toString']) {
    assert.equal(getMaterialById(id), null);
    assert.equal(getMaterialPrompt(id), null);
  }
});

test('canonical records and nested data cannot be mutated by consumers', () => {
  const material = getMaterialById('jute');
  assert.ok(Object.isFrozen(MATERIALS));
  assert.ok(Object.isFrozen(material));
  assert.ok(Object.isFrozen(material.visualProperties));
  assert.ok(Object.isFrozen(material.recommendedUsage));
  assert.ok(Object.isFrozen(material.avoid));
  assert.throws(() => { material.name = 'Changed'; }, TypeError);
  assert.throws(() => { material.visualProperties.finish = 'Changed'; }, TypeError);
  assert.throws(() => { material.recommendedUsage.push('Changed'); }, TypeError);
});

test('unverified sample qualities stay explicit rather than invented', () => {
  for (const material of Object.values(MATERIALS)) {
    assert.equal(material.dataStatus, 'needs-sample-verification');
    assert.ok(Object.values(material.visualProperties).every(value => value === null));
    assert.equal(material.texture, null);
    assert.equal(material.color, null);
    assert.equal(material.lighting, null);
    assert.deepEqual(material.recommendedUsage, []);
    assert.deepEqual(material.avoid, []);
    assert.equal(material.materialPrompt, `Material: ${material.name}.`);
  }
});

test('exact supplied names normalize to canonical IDs through the unchanged adapter', () => {
  for (const [id, name] of identities) {
    const result = adaptTeachableMachinePredictions([
      { className: name, probability: 0.95 },
    ], { position: 2 });
    assert.equal(result.materialId, id);
    assert.equal(result.position, 2);
    assert.equal(result.priority, 2);
    assert.equal(getMaterialById(result.materialId).name, name);
  }
});
