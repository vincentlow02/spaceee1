import { resolveMaterial } from '../../lib/materials/materials.js';

/** Source-independent UI data; existing factual and photography resolvers remain canonical. */
export function createMaterialSlots(entries) {
  return entries.map(({position,materialId,source}) => ({
    position,
    source,
    material: resolveMaterial(materialId),
  }));
}
