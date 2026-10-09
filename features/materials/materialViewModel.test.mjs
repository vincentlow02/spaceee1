import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaterialSlots } from './materialViewModel.js';

test('material UI receives names and photographs without recognition evidence', () => {
  const entries = [{position:1,materialId:'coke-can'},{position:2,materialId:'blackcan'},{position:3,materialId:'tissue'}];
  const before = structuredClone(entries);
  const slots = createMaterialSlots(entries);
  assert.deepEqual(slots.map(slot => slot.material.name),['Coke Can','Black Can','Tissue']);
  assert.equal(slots[0].material.imageSrc,null);
  assert.equal('confidence' in slots[0].material,false);
  assert.deepEqual(entries,before);
});

test('empty slots and duplicate materials are preserved for the workflow to validate', () => {
  const slots = createMaterialSlots([{position:1,materialId:'tissue'},{position:2,materialId:null},{position:3,materialId:'tissue'}]);
  assert.equal(slots[1].material,null);
  assert.deepEqual(slots.map(slot => slot.position),[1,2,3]);
  assert.equal(slots[0].material.id,slots[2].material.id);
});
