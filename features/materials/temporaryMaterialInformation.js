/**
 * Temporary Phase 5A material information resolver.
 *
 * These records only support the current recognition test classes. They are
 * intentionally factual and sparse, and are not the final Material Database.
 */
const UNKNOWN_PROPERTIES = Object.freeze({
  material: 'unknown',
  texture: 'unknown',
  color: 'unknown',
  form: 'unknown',
});

const TEMPORARY_MATERIALS = Object.freeze({
  'coke-can': Object.freeze({ id: 'coke-can', name: 'Coke Can' }),
  blackcan: Object.freeze({ id: 'blackcan', name: 'Black Can' }),
  tissue: Object.freeze({ id: 'tissue', name: 'Tissue' }),
});

function nameFromId(materialId) {
  return materialId
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function resolveTemporaryMaterialInformation(materialId) {
  if (typeof materialId !== 'string' || materialId.trim().length === 0) {
    throw new Error('A materialId is required to resolve material information.');
  }

  const normalizedId = materialId.trim();
  const known = TEMPORARY_MATERIALS[normalizedId];

  return {
    id: normalizedId,
    name: known?.name || nameFromId(normalizedId),
    category: null,
    properties: { ...UNKNOWN_PROPERTIES },
  };
}
