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
  ['koeido-eb-02', 'White PVC'],
  ['koeido-al-03', 'Aluminum'],
];

test('registry contains all requested canonical identities', () => {
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
  for (const material of Object.values(MATERIALS).filter(item => item.dataStatus === 'needs-sample-verification')) {
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

test('Koeido EB-02 and AL-03 keep verified product data, separate image prompts, and generation prompts', () => {
  const pvc = getMaterialById('koeido-eb-02');
  assert.equal(pvc.name, 'White PVC');
  assert.equal(pvc.japaneseName, 'ホワイトエンビ板');
  assert.equal(pvc.productCode, 'EB-02');
  assert.equal(pvc.materialType, 'PVC');
  assert.equal(pvc.physicalSize, '115 × 160mm');
  assert.equal(pvc.thickness, '0.5mm');
  assert.equal(pvc.sourceName, 'Sekaido');
  assert.equal(pvc.sourceUrl, 'https://webshop.sekaido.co.jp/product/A005258');
  assert.deepEqual(pvc.supplier, {name:'光栄堂',mark:'光'});
  assert.equal(pvc.imageSrc, '/materials/koeido-eb-02.png');
  assert.equal(pvc.plannedImageSrc, null);
  assert.match(pvc.libraryImagePrompt, /single flat rectangular white PVC sheet/);
  assert.match(pvc.materialPrompt, /smooth, opaque white PVC/);

  const aluminum = getMaterialById('koeido-al-03');
  assert.equal(aluminum.name, 'Aluminum');
  assert.equal(aluminum.japaneseName, 'アルミ板');
  assert.equal(aluminum.productCode, 'AL-03');
  assert.equal(aluminum.materialType, 'Aluminum');
  assert.equal(aluminum.physicalSize, '100 × 150mm');
  assert.equal(aluminum.thickness, '0.3mm');
  assert.equal(aluminum.sourceName, 'Sekaido');
  assert.equal(aluminum.sourceUrl, 'https://webshop.sekaido.co.jp/product/A005263');
  assert.deepEqual(aluminum.supplier, {name:'光栄堂',mark:'光'});
  assert.equal(aluminum.imageSrc, '/materials/koeido-al-03.png');
  assert.equal(aluminum.plannedImageSrc, null);
  assert.match(aluminum.libraryImagePrompt, /natural silver metallic surface/);
  assert.match(aluminum.materialPrompt, /natural silver aluminum/);
  assert.doesNotMatch(aluminum.materialPrompt, /heavy brushed patterns as the default/i);
});

test('Oak Knotty E190 has official product presentation metadata without replacing AI profile fields', () => {
  const oak = getMaterialById('oak-knotty-e190');
  assert.equal(oak.japaneseName, 'オークノッティE190');
  assert.equal(oak.category, 'Wood');
  assert.equal(oak.imageSrc, '/materials/oak-knotty-e190.jpg');
  assert.deepEqual(oak.supplier, {name: 'Tokyo Koei', logoSrc: '/suppliers/tokyo-koei.svg'});
  assert.equal(oak.sourceUrl, 'https://www.tokyokoei.com/itemlist/oakne190/');
  assert.equal(oak.materialPrompt, 'Material: Oak Knotty E190.');
  assert.equal(oak.texture, null);
  assert.ok(Object.isFrozen(oak.supplier));
  for (const id of identities.map(([id]) => id).filter(id => !['japanese-igusa', 'jute', 'oak-knotty-e190', 'cement-02-ea6652k', 'koeido-eb-02', 'koeido-al-03'].includes(id))) {
    const other = getMaterialById(id);
    assert.equal(other.imageSrc, null);
    assert.equal(other.supplier, null);
    assert.equal(other.sourceUrl, null);
  }
});

test('Japanese Igusa uses Kouhin domestic Igusa sample presentation without replacing material profile fields', () => {
  const igusa = getMaterialById('japanese-igusa');
  assert.equal(igusa.japaneseName, '国産い草');
  assert.equal(igusa.category, 'Natural Fiber');
  assert.equal(igusa.imageSrc, '/materials/japanese-igusa-texture.jpg');
  assert.equal(igusa.imageScale, 1);
  assert.deepEqual(igusa.supplier, {name: 'Kouhin', logoSrc: '/suppliers/kouhin-original.png'});
  assert.equal(igusa.sourceUrl, 'https://www.kouhin.com/c/sample/sample10');
  assert.equal(igusa.materialPrompt, 'Material: Japanese Igusa.');
  assert.equal(igusa.texture, null);
  assert.ok(Object.isFrozen(igusa.supplier));
});

test('Jute LMT15107 uses the linked Lilycolor product image and keeps its canonical profile', () => {
  const jute = getMaterialById('jute');
  assert.equal(jute.japaneseName, '黄麻');
  assert.equal(jute.category, 'Fabric');
  assert.equal(jute.imageSrc, '/materials/jute.jpg');
  assert.equal(jute.imageScale, 1.25);
  assert.deepEqual(jute.supplier, {name: 'Lilicolor', logoSrc: '/suppliers/lilycolor-original.png'});
  assert.equal(jute.sourceUrl, 'https://www.wako-dou-store.com/view/item/000000013531');
  assert.equal(jute.materialPrompt, 'Material: Jute.');
  assert.equal(jute.texture, null);
  assert.ok(Object.isFrozen(jute.supplier));
});

test('Cement 02 EA6652K has the official product sample and keeps its canonical profile', () => {
  const cement = getMaterialById('cement-02-ea6652k');
  assert.equal(cement.japaneseName, 'セメント02');
  assert.equal(cement.category, 'Stone');
  assert.equal(cement.imageSrc, '/materials/cement-02-ea6652k.jpg');
  assert.deepEqual(cement.supplier, {name: 'KMEW', logoSrc: '/suppliers/kmew-solido.svg'});
  assert.equal(cement.imageScale, 1);
  assert.equal(cement.sourceUrl, 'https://www.kmew.co.jp/shouhin/solido/typeF_facade/spec/');
  assert.equal(cement.materialPrompt, 'Material: Cement 02 / EA6652K.');
  assert.equal(cement.texture, null);
  assert.ok(Object.isFrozen(cement.supplier));
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
