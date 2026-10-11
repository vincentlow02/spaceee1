/**
 * Canonical material records, independent of recognition, UI and generation.
 *
 * Only identities have been supplied/confirmed so far. null means unverified;
 * empty lists mean no verified entries, not that a material has no qualities.
 * Populate descriptions from approved sample observations or specifications.
 * Never encode a fixed atmosphere, emotional meaning or architectural style.
 */
function createMaterial(id, name, dataStatus = 'needs-sample-verification', presentation = {}) {
  const properties = presentation.properties ?? {};
  const visualProperties = presentation.visualProperties ?? {};
  return Object.freeze({
    id,
    name,
    dataStatus,
    japaneseName: presentation.japaneseName ?? null,
    imageSrc: presentation.imageSrc ?? null,
    imageScale: presentation.imageScale ?? 1,
    category: presentation.category ?? null,
    supplier: presentation.supplier ? Object.freeze({...presentation.supplier}) : null,
    sourceUrl: presentation.sourceUrl ?? null,
    sourceName: presentation.sourceName ?? null,
    productCode: presentation.productCode ?? null,
    physicalSize: presentation.physicalSize ?? null,
    thickness: presentation.thickness ?? null,
    materialType: presentation.materialType ?? null,
    plannedImageSrc: presentation.plannedImageSrc ?? null,
    libraryImagePrompt: presentation.libraryImagePrompt ?? null,
    properties: Object.freeze({
      material: properties.material ?? 'unknown',
      texture: properties.texture ?? 'unknown',
      color: properties.color ?? 'unknown',
      form: properties.form ?? 'unknown',
    }),
    visualProperties: Object.freeze({
      surface: visualProperties.surface ?? null,
      pattern: visualProperties.pattern ?? null,
      finish: visualProperties.finish ?? null,
      opacity: visualProperties.opacity ?? null,
    }),
    texture: presentation.texture ?? null,
    color: presentation.color ?? null,
    // Observed response to light, not a prescribed room lighting scheme.
    lighting: null,
    // Verified application constraints only; not fixed spatial meanings.
    recommendedUsage: Object.freeze([]),
    avoid: Object.freeze([]),
    // Identity-only fragment until sample qualities are verified.
    // This is material data, not a spatial prompt or a Prompt Builder.
    materialPrompt: presentation.materialPrompt ?? (dataStatus === 'technical-test' ? null : `Material: ${name}.`),
  });
}

export const MATERIALS = Object.freeze({
  'japanese-igusa': createMaterial('japanese-igusa', 'Japanese Igusa', 'needs-sample-verification', {
    japaneseName: '国産い草',
    imageSrc: '/materials/japanese-igusa-texture.jpg',
    imageScale: 1,
    category: 'Natural Fiber',
    supplier: {name: 'Kouhin', logoSrc: '/suppliers/kouhin-original.png'},
    sourceUrl: 'https://www.kouhin.com/c/sample/sample10',
  }),
  jute: createMaterial('jute', 'Jute', 'needs-sample-verification', {
    japaneseName: '黄麻',
    imageSrc: '/materials/jute.jpg',
    imageScale: 1.25,
    category: 'Fabric',
    supplier: {name: 'Lilicolor', logoSrc: '/suppliers/lilycolor-original.png'},
    sourceUrl: 'https://www.wako-dou-store.com/view/item/000000013531',
  }),
  'split-marble-gray': createMaterial('split-marble-gray', 'Split Marble Gray'),
  'oak-knotty-e190': createMaterial('oak-knotty-e190', 'Oak Knotty E190', 'needs-sample-verification', {
    japaneseName: 'オークノッティE190',
    imageSrc: '/materials/oak-knotty-e190.jpg',
    category: 'Wood',
    supplier: {name: 'Tokyo Koei', logoSrc: '/suppliers/tokyo-koei.svg'},
    sourceUrl: 'https://www.tokyokoei.com/itemlist/oakne190/',
  }),
  'cement-02-ea6652k': createMaterial('cement-02-ea6652k', 'Cement 02 / EA6652K', 'needs-sample-verification', {
    japaneseName: 'セメント02',
    imageSrc: '/materials/cement-02-ea6652k.jpg',
    category: 'Stone',
    supplier: {name: 'KMEW', logoSrc: '/suppliers/kmew-solido.svg'},
    sourceUrl: 'https://www.kmew.co.jp/shouhin/solido/typeF_facade/spec/',
  }),
  'koeido-eb-02': createMaterial('koeido-eb-02', 'White PVC', 'verified-product-specification', {
    japaneseName: 'ホワイトエンビ板',
    imageSrc: '/materials/koeido-eb-02.png',
    category: 'Plastic',
    supplier: {name: '光栄堂', mark: '光'},
    sourceName: 'Sekaido',
    sourceUrl: 'https://webshop.sekaido.co.jp/product/A005258',
    productCode: 'EB-02',
    physicalSize: '115 × 160mm',
    thickness: '0.5mm',
    materialType: 'PVC',
    properties: {material:'PVC', texture:'Smooth, opaque, uniform', color:'White', form:'Flat sheet'},
    visualProperties: {surface:'Smooth', finish:'Smooth Matte', opacity:'Opaque'},
    texture: 'Smooth, opaque, uniform',
    color: 'White',
    libraryImagePrompt: 'Professional architectural material sample photography. A single flat rectangular white PVC sheet with a smooth opaque white plastic surface, clean straight-cut edges, uniform white color, and extremely subtle natural surface texture. Top-down orthographic view, perfectly centered, soft diffused studio lighting, neutral light gray background. No text, labels, logos, hands, additional objects, decorative elements, or perspective distortion. Square 1:1, photorealistic, high detail.',
    materialPrompt: 'Use a smooth, opaque white PVC plastic material with a uniform matte-to-satin surface. It should appear clean, flat, and consistent, with minimal visible texture and subtle soft reflections. Maintain a neutral white color without wood grain, stone texture, fabric texture, or metallic reflections. Apply it naturally to interior surfaces while preserving spatial composition, geometry, and realistic lighting.',
  }),
  'koeido-al-03': createMaterial('koeido-al-03', 'Aluminum', 'verified-product-specification', {
    japaneseName: 'アルミ板',
    imageSrc: '/materials/koeido-al-03.png',
    category: 'Metal',
    supplier: {name: '光栄堂', mark: '光'},
    sourceName: 'Sekaido',
    sourceUrl: 'https://webshop.sekaido.co.jp/product/A005263',
    productCode: 'AL-03',
    physicalSize: '100 × 150mm',
    thickness: '0.3mm',
    materialType: 'Aluminum',
    properties: {material:'Aluminum', texture:'Smooth metallic surface', color:'Silver', form:'Flat sheet'},
    visualProperties: {surface:'Smooth metallic surface', finish:'Natural Metallic', opacity:'Opaque'},
    texture: 'Smooth metallic surface',
    color: 'Silver',
    libraryImagePrompt: 'Professional architectural material sample photography. A single flat rectangular thin aluminum sheet with a realistic natural silver metallic surface, smooth flat metal texture, subtle controlled metallic reflections, and precise straight-cut edges. Top-down orthographic view, perfectly centered, soft diffused studio lighting, neutral light gray background. No text, labels, logos, hands, additional objects, decorative elements, perspective distortion, strong brushing, mirror finish, or frosted finish. Square 1:1, photorealistic, high detail.',
    materialPrompt: 'Use realistic natural silver aluminum with a smooth metallic surface and physically plausible metallic reflections. Keep a neutral cool silver-gray appearance with subtle highlights and realistic responses to environmental lighting. Avoid exaggerated mirror reflections, heavy brushed patterns, chrome-like appearance, or artificial decorative textures. Apply it naturally to architectural surfaces while preserving spatial composition, geometry, and realistic lighting.',
  }),
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
