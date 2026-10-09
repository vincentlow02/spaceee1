import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyMaterialSelection, selectLibraryMaterial, removeLibraryMaterial, resolveMaterialSelection, getMaterialSelectionEligibility, createMaterialSelectionSnapshot } from './materialSelectionState.js';
import { createMaterialSlots } from './materialViewModel.js';
import { getMaterialById, resolveMaterial, getLibraryMaterials, materialIdFromRecognitionLabel } from '../../lib/materials/materials.js';
import { prepareGenerationRequest } from '../exploration/generationRequest.js';

const ids = ['japanese-igusa', 'jute', 'split-marble-gray'];
function frame(materialIds = ids) {
  return {positions: materialIds.map((materialId,index) => ({position:index+1, priority:index+1, materialId, confidence:0.9-index/10, status:materialId ? 'recognized' : 'unknown'}))};
}
function libraryOnly() {
  return ids.reduce((state,id,index) => selectLibraryMaterial(state,index+1,id), emptyMaterialSelection());
}

test('Camera-only selection keeps fixed positions and updates when objects swap', () => {
  const state = emptyMaterialSelection();
  assert.deepEqual(resolveMaterialSelection(state,frame()).map(slot => slot.materialId),ids);
  const swapped = resolveMaterialSelection(state,frame([ids[1],ids[0],ids[2]]));
  assert.deepEqual(swapped.map(slot => slot.materialId),[ids[1],ids[0],ids[2]]);
  assert.equal(getMaterialSelectionEligibility(swapped,frame()).eligible,true);
});

test('Library-only selection is valid without any camera and uses the same generation request', () => {
  const selected = resolveMaterialSelection(libraryOnly(),null,false);
  assert.equal(getMaterialSelectionEligibility(selected,null).eligible,true);
  const snapshot = createMaterialSelectionSnapshot(selected,null);
  assert.ok(snapshot.materials.every(material => material.confidence === null));
  const prepared = prepareGenerationRequest({snapshot});
  assert.deepEqual(prepared.snapshot.materials.map(material => material.materialId),ids);
  assert.ok(prepared.promptResult.prompt.includes('Material profile: Material: Japanese Igusa.'));
  assert.equal(createMaterialSlots([{position:1,...selected[0]}])[0].material,getMaterialById(ids[0]));
});

test('Library overrides only its slot; removing it immediately reads latest Camera observation', () => {
  const manual = selectLibraryMaterial(emptyMaterialSelection(),2,'oak-knotty-e190');
  const movedFrame = frame(['jute','cement-02-ea6652k','split-marble-gray']);
  const mixed = resolveMaterialSelection(manual,movedFrame);
  assert.deepEqual(mixed.map(slot => slot.materialId),['jute','oak-knotty-e190','split-marble-gray']);
  assert.deepEqual(mixed.map(slot => slot.source),['camera','library','camera']);
  assert.equal(getMaterialSelectionEligibility(mixed,movedFrame).eligible,true);
  const released = resolveMaterialSelection(removeLibraryMaterial(manual,2),movedFrame);
  assert.equal(released[1].materialId,'cement-02-ea6652k');
  assert.equal(released[1].source,'camera');
});

test('Camera errors and Unknown never clear Library slots or retain stale Camera materials', () => {
  const manual = selectLibraryMaterial(emptyMaterialSelection(),1,ids[0]);
  assert.deepEqual(resolveMaterialSelection(manual,frame(),false).map(slot => slot.materialId),[ids[0],null,null]);
  const unknown = resolveMaterialSelection(manual,frame([null,null,'jute']));
  assert.deepEqual(unknown.map(slot => slot.materialId),[ids[0],null,'jute']);
  assert.equal(getMaterialSelectionEligibility(unknown,frame()).eligible,false);
});

test('duplicates and incomplete selections block generation regardless of source', () => {
  const duplicate = selectLibraryMaterial(emptyMaterialSelection(),1,'jute');
  const selected = resolveMaterialSelection(duplicate,frame());
  assert.equal(getMaterialSelectionEligibility(selected,frame()).reason,'duplicate-material');
  assert.throws(() => createMaterialSelectionSnapshot(selected,frame()),/Cannot create/);
  assert.equal(getMaterialSelectionEligibility(resolveMaterialSelection(emptyMaterialSelection(),null,false),null).eligible,false);
});

test('Snapshot is frozen and independent of later Library/Camera changes', () => {
  const overrides = libraryOnly();
  const snapshot = createMaterialSelectionSnapshot(resolveMaterialSelection(overrides,null,false),null);
  selectLibraryMaterial(overrides,1,'oak-knotty-e190');
  assert.deepEqual(snapshot.materials.map(material => material.materialId),ids);
  assert.ok(Object.isFrozen(snapshot.materials[0]));
  assert.deepEqual(snapshot.materials.map(material => material.priority),[1,2,3]);
});

test('test model compatibility remains technical-only; unsupported drops are rejected', () => {
  const state = emptyMaterialSelection();
  for (const id of ['coke-can','blackcan','tissue','__proto__','unregistered']) {
    assert.equal(selectLibraryMaterial(state,1,id),state);
  }
  const tests = resolveMaterialSelection(state,frame(['coke-can','blackcan','tissue']));
  assert.equal(getMaterialSelectionEligibility(tests,frame()).eligible,true);
  assert.equal(resolveMaterial('black-can').id,'blackcan');
  assert.equal(resolveMaterial('coke-can').dataStatus,'technical-test');
  assert.equal(getLibraryMaterials().length,5);
  assert.ok(getLibraryMaterials().every(material => material.dataStatus !== 'technical-test'));
  const unsupported = resolveMaterialSelection(state,frame(['unregistered','jute','tissue']));
  assert.equal(unsupported[0].materialId,null);
  assert.equal(selectLibraryMaterial(state,4,'jute'),state);
});

test('real labels and canonical IDs resolve consistently; test labels keep existing output', () => {
  for (const material of getLibraryMaterials()) {
    assert.equal(materialIdFromRecognitionLabel(material.name),material.id);
    assert.equal(materialIdFromRecognitionLabel(material.id),material.id);
  }
  assert.equal(materialIdFromRecognitionLabel('blackcan'),'blackcan');
  assert.equal(materialIdFromRecognitionLabel('Black Can'),'black-can');
  assert.equal(materialIdFromRecognitionLabel('unregistered'),'unregistered');
});

test('all three sources use identical profiles and server prompts for identical IDs', () => {
  const camera = frame();
  const cameraSelection = resolveMaterialSelection(emptyMaterialSelection(),camera);
  const librarySelection = resolveMaterialSelection(libraryOnly(),null,false);
  const mixedSelection = resolveMaterialSelection(selectLibraryMaterial(emptyMaterialSelection(),2,'jute'),camera);
  const results = [cameraSelection,librarySelection,mixedSelection].map(selection =>
    prepareGenerationRequest({snapshot:createMaterialSelectionSnapshot(selection,camera)}).promptResult.prompt);
  assert.equal(results[0],results[1]);
  assert.equal(results[1],results[2]);
});
