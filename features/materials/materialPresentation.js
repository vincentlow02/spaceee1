/** UI-only product photography. These test classes are not a material database.
 * Set imageSrc to a local /materials/... URL after the cutout photo is provided.
 */
import { resolveMaterial } from '../../lib/materials/materials.js';

export function getMaterialPresentation(materialId) {
  return { imageSrc: resolveMaterial(materialId)?.imageSrc ?? null };
}
