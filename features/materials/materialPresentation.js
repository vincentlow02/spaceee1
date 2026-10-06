/** UI-only product photography. These test classes are not a material database.
 * Set imageSrc to a local /materials/... URL after the cutout photo is provided.
 */
const PRODUCT_PHOTOS = Object.freeze({
  'coke-can': Object.freeze({ imageSrc: null }),
  blackcan: Object.freeze({ imageSrc: null }),
  tissue: Object.freeze({ imageSrc: null }),
});

export function getMaterialPresentation(materialId) {
  return PRODUCT_PHOTOS[materialId] || { imageSrc: null };
}
