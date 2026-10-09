/**
 * Canonical material records, independent of recognition, UI and generation.
 *
 * Only identities have been supplied/confirmed so far. null means unverified;
 * empty lists mean no verified entries, not that a material has no qualities.
 * Populate descriptions from approved sample observations or specifications.
 * Never encode a fixed atmosphere, emotional meaning or architectural style.
 */
function createMaterial(id, name, dataStatus = 'needs-sample-verification') {
  return Object.freeze({
    id,
    name,
    dataStatus,
    imageSrc: null,
    category: null,
    properties: Object.freeze({ material: 'unknown', texture: 'unknown', color: 'unknown', form: 'unknown' }),
    visualProperties: Object.freeze({
      surface: null,
      pattern: null,
      finish: null,
      opacity: null,
    }),
    texture: null,
    color: null,
    // Observed response to light, not a prescribed room lighting scheme.
    lighting: null,
    // Verified application constraints only; not fixed spatial meanings.
    recommendedUsage: Object.freeze([]),
    avoid: Object.freeze([]),
    // Identity-only fragment until sample qualities are verified.
    // This is material data, not a spatial prompt or a Prompt Builder.
    materialPrompt: dataStatus === 'technical-test' ? null : `Material: ${name}.`,
  });
}

export const MATERIALS = Object.freeze({
  'japanese-igusa': createMaterial('japanese-igusa', 'Japanese Igusa'),
  jute: createMaterial('jute', 'Jute'),
  'split-marble-gray': createMaterial('split-marble-gray', 'Split Marble Gray'),
  'oak-knotty-e190': createMaterial('oak-knotty-e190', 'Oak Knotty E190'),
  'cement-02-ea6652k': createMaterial('cement-02-ea6652k', 'Cement 02 / EA6652K'),
});

/** Return an immutable canonical record, or null for an unknown/invalid ID. */
export function getMaterialById(id) {
  if (typeof id !== 'string') return null;
  const canonicalId = id.trim();
  return Object.hasOwn(MATERIALS, canonicalId) ? MATERIALS[canonicalId] : null;
}

/** Return the material-level prompt fragment, or null for an unknown ID. */
export function getMaterialPrompt(id) {
  return getMaterialById(id)?.materialPrompt ?? null;
}

// Explicit compatibility records: never offered as real Library materials.
const TEST_MATERIALS = Object.freeze({
  'coke-can': createMaterial('coke-can', 'Coke Can', 'technical-test'),
  blackcan: createMaterial('blackcan', 'Black Can', 'technical-test'),
  tissue: createMaterial('tissue', 'Tissue', 'technical-test'),
});

export function getLibraryMaterials() {
  return Object.values(MATERIALS);
}

/** Shared lookup for real profiles and the existing technical test pipeline. */
export function resolveMaterial(id) {
  const material = getMaterialById(id);
  if (material) return material;
  if (typeof id !== 'string') return null;
  const key = id.trim();
  if (key === 'black-can') return TEST_MATERIALS.blackcan;
  return Object.hasOwn(TEST_MATERIALS, key) ? TEST_MATERIALS[key] : null;
}

/** Canonical IDs and exact display names both work as model labels. */
export function materialIdFromRecognitionLabel(label) {
  if (typeof label !== 'string') return null;
  const value = label.trim().toLowerCase();
  const named = Object.values(MATERIALS)
    .find(material => material.name.toLowerCase() === value);
  if (named) return named.id;
  // Keep unknown class identity for debugging; selection checks support separately.
  return value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
}
