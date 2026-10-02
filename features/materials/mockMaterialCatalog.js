/**
 * Temporary Phase 4A material resolver.
 * These generic records prove that identity, display name, and category are
 * separate fields. They are not the final Spacee material database.
 */
const MOCK_MATERIALS = Object.freeze({
  'mock-material-a': Object.freeze({ id: 'mock-material-a', name: 'Mock Material A', category: null }),
  'mock-material-b': Object.freeze({ id: 'mock-material-b', name: 'Mock Material B', category: null }),
  'mock-material-c': Object.freeze({ id: 'mock-material-c', name: 'Mock Material C', category: null }),
});

export function getMockMaterial(materialId) {
  return MOCK_MATERIALS[materialId] || null;
}
