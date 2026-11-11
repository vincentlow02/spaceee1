import { createMaterialProfileV2 } from './materialProfilesV2.js';

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
  const profileV2 = createMaterialProfileV2({...presentation, id, name});
  return Object.freeze({
    id,
    name,
    profileV2,
    generationCandidate: profileV2 !== null,
    dataStatus,
    japaneseName: presentation.japaneseName ?? null,
    imageSrc: presentation.imageSrc ?? null,
    referenceImageSrc: presentation.referenceImageSrc ?? null,
    imageScale: presentation.imageScale ?? 1,
    category: presentation.category ?? null,
    conceptCategory: presentation.conceptCategory ?? null,
    supplier: presentation.supplier ? Object.freeze({...presentation.supplier}) : null,
    showSupplierMark: presentation.showSupplierMark ?? true,
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
    possibleApplications: Object.freeze([...(presentation.possibleApplications ?? [])]),
    unsuitableApplications: Object.freeze([...(presentation.unsuitableApplications ?? [])]),
  });
}

export const MATERIALS = Object.freeze({
  'japanese-igusa': createMaterial('japanese-igusa', 'Japanese Igusa', 'verified-product-presentation', {
    japaneseName: '国産い草',
    imageSrc: '/materials/japanese-igusa-texture.jpg',
    imageScale: 1,
    category: 'Natural Fiber',
    conceptCategory: 'Cultural',
    supplier: {name: 'Kouhin', logoSrc: '/suppliers/kouhin-original.png'},
    sourceUrl: 'https://www.kouhin.com/c/sample/sample10',
    materialType: 'Japanese Igusa Rush',
    properties: {
      material: 'Natural Japanese igusa rush',
      texture: 'Tightly woven fine rush fibers with narrow parallel ridges',
      color: 'Muted pale green-gray, following the Library image',
      form: 'Dense woven tatami-style surface',
    },
    visualProperties: {
      surface: 'Fine, dry woven rush texture',
      pattern: 'Tight linear weave with subtle natural variation',
      finish: 'Matte; very low reflectivity; non-metallic',
      opacity: 'Opaque',
    },
    texture: 'Tightly woven fine igusa rush fibers',
    color: 'Muted pale green-gray, following the Library image',
    libraryImagePrompt: 'Photorealistic Japanese igusa rush material, densely and tightly woven from fine natural rush fibers into narrow parallel ridges, muted pale green-gray color, dry matte surface, very low reflectivity, subtle irregular fiber variation, and realistic small-scale woven texture. Preserve a restrained natural appearance without glossy coating or exaggerated relief. The material must read as authentic woven igusa tatami rush, not generic green fabric, carpet, synthetic grass, rattan, wicker, or painted plastic.',
    materialPrompt: 'Natural Japanese igusa rush with a muted pale green-gray tone, tightly woven fine fibers, narrow parallel ridges, subtle natural variation, and a dry matte opaque finish. Its woven surface can suit flooring, wall finishes, furniture, or other tactile interior details.',
    possibleApplications: ['flooring', 'wall finish', 'furniture surface', 'tactile interior detail'],
  }),
  jute: createMaterial('jute', 'Jute', 'needs-sample-verification', {
    japaneseName: '黄麻',
    imageSrc: '/materials/jute.jpg',
    imageScale: 1.4,
    category: 'Fabric',
    conceptCategory: 'Natural',
    supplier: {name: 'Lilicolor', logoSrc: '/suppliers/lilycolor-original.png'},
    sourceUrl: 'https://www.wako-dou-store.com/view/item/000000013531',
  }),
  cork: createMaterial('cork', 'Cork', 'needs-sample-verification', {
    japaneseName: '天然コルク',
    imageSrc: '/materials/cork-01.jpg',
    category: 'Cork',
    conceptCategory: 'Natural',
  }),
  'split-marble-gray': createMaterial('split-marble-gray', 'Split Marble Gray', 'user-provided-reference', {
    japaneseName: 'スプリットマーブル75 グレー',
    imageSrc: '/materials/split-marble-gray.png',
    referenceImageSrc: '/materials/split-marble-gray.png',
    category: 'Stone',
    conceptCategory: 'Natural',
    supplier: {name: 'タイルマート / ユーロトラスト株式会社'},
    sourceName: 'タイルマート',
    sourceUrl: 'https://item.rakuten.co.jp/eurotrust/ns-split75100-gray-f75/',
    productCode: 'Split Marble 75・100',
    materialType: 'Natural Stone',
    properties: {
      material: 'Natural Stone',
      texture: 'Dense irregular mineral speckles with subtle reference-dependent roughness',
      color: 'Medium gray with dark gray and off-white particles, following the supplied reference image',
      form: 'Hard, opaque natural mineral surface',
    },
    visualProperties: {
      surface: 'Fine-grained mineral texture',
      pattern: 'Random organic granular variation',
      finish: 'Natural / low sheen; low-to-moderate reflectivity; non-metallic',
      opacity: 'Opaque',
    },
    texture: 'Dense irregular mineral speckles',
    color: 'Medium gray with dark gray and off-white particles',
    libraryImagePrompt: 'Photorealistic gray natural stone material surface, densely distributed fine mineral grains and irregular crystalline-looking speckles, layered variations of charcoal gray, medium gray, pale gray, white, and occasional near-black particles. Naturally randomized granular distribution with subtle clusters and mineral color variation. Dense solid stone appearance, opaque, hard mineral surface, non-metallic, low to moderate surface reflectivity, realistic stone microtexture and subtle surface roughness. Preserve the exact grain density, color balance, mineral pattern, texture scale, and surface appearance shown in the supplied reference image. Uniform visual continuity across the material without artificial geometric patterns. No exaggerated marble veins, no large decorative swirls, no wood grain, no concrete pores, no ceramic glaze, no metallic shine. Accurate photorealistic natural stone surface representation.',
    materialPrompt: 'Dense, hard, opaque natural stone with fine irregular mineral grains, gray-and-white speckles, subtle charcoal and pale-gray variation, restrained sheen, and natural granular texture. Its durable mineral surface suits floors, walls, counters, or architectural details at a believable scale; avoid exaggerated marble veining or artificial stone patterns.',
    possibleApplications: ['floor finish', 'wall finish', 'counter surface', 'architectural detail'],
  }),
  'oak-knotty-e190': createMaterial('oak-knotty-e190', 'Oak Knotty E190', 'verified-product-presentation', {
    japaneseName: 'オークノッティE190',
    imageSrc: '/materials/oak-knotty-e190.jpg',
    category: 'Wood',
    conceptCategory: 'Natural',
    supplier: {name: 'Tokyo Koei', logoSrc: '/suppliers/tokyo-koei.svg'},
    sourceUrl: 'https://www.tokyokoei.com/itemlist/oakne190/',
    materialType: 'Natural Oak Wood',
    properties: {
      material: 'Natural knotty oak wood',
      texture: 'Long flowing oak grain with visible knots and small natural dark marks',
      color: 'Warm light honey oak, following the Library image',
      form: 'Opaque natural wood plank surface',
    },
    visualProperties: {
      surface: 'Smooth natural oak with visible grain and knots',
      pattern: 'Long linear grain with irregular knot variation',
      finish: 'Matte to low sheen; low reflectivity; non-metallic',
      opacity: 'Opaque',
    },
    texture: 'Natural oak grain with visible knots',
    color: 'Warm light honey oak, following the Library image',
    libraryImagePrompt: 'Photorealistic natural knotty oak material, warm light honey-oak color, long flowing linear wood grain, visible irregular knots, small dark natural marks, and subtle tonal variation across the boards. Smooth natural wood surface with a matte to low-sheen finish, restrained reflection, opaque non-metallic character, and realistic grain scale. Preserve the calm warm appearance shown by the Library image. Do not turn it into walnut, pine, bamboo, generic printed woodgrain, highly polished lacquer, or distressed reclaimed timber.',
    materialPrompt: 'Natural knotty oak with a warm light honey tone, long flowing grain, irregular visible knots, small natural dark marks, subtle board-to-board variation, and an opaque matte-to-low-sheen finish. Its durable wood surface suits floors, furniture, cabinetry, built-ins, or wall details with believable grain direction and plank scale.',
    possibleApplications: ['flooring', 'furniture', 'cabinetry', 'built-in', 'wall detail'],
  }),
  'cement-02-ea6652k': createMaterial('cement-02-ea6652k', 'Cement 02 / EA6652K', 'needs-sample-verification', {
    japaneseName: 'セメント02',
    imageSrc: '/materials/cement-02-ea6652k.jpg',
    category: 'Stone',
    conceptCategory: 'Artificial',
    supplier: {name: 'KMEW', logoSrc: '/suppliers/kmew-solido.svg'},
    sourceUrl: 'https://www.kmew.co.jp/shouhin/solido/typeF_facade/spec/',
  }),
  'sekaido-silver-metallic-01': createMaterial('sekaido-silver-metallic-01', 'Sekaido Silver Metallic Finish', 'user-provided-reference', {
    imageSrc: '/materials/sekaido-silver-metallic-01.png',
    category: 'Metallic-effect sheet',
    conceptCategory: 'Artificial',
    materialType: 'Unverified metallic-effect material',
    properties: {
      material: 'Actual substrate unverified',
      texture: 'Smooth flat reflective surface',
      color: 'Neutral silver-gray',
      form: 'Flat sheet-like sample; exact construction unverified',
    },
    visualProperties: {
      surface: 'Exceptionally smooth and flat',
      pattern: 'No intentional brushed grain',
      finish: 'Reflective with softly blurred environmental reflections',
      opacity: 'Unverified',
    },
    texture: 'Smooth flat reflective surface',
    color: 'Neutral silver-gray',
    materialPrompt: 'Neutral silver-gray metallic-effect surface with pronounced silvery highlights and softly blurred environmental reflections. Exceptionally smooth and flat, without intentional brushed grain or tactile roughness.',
    possibleApplications: ['conceptual reflective surface', 'interior detail'],
  }),
  'black-transparent-pvc-01': createMaterial('black-transparent-pvc-01', 'Black Transparent PVC', 'user-provided-reference', {
    imageSrc: '/materials/black-transparent-pvc-01.png',
    category: 'Transparent Sheet',
    conceptCategory: 'Artificial',
    materialType: 'PVC, user-identified; technical composition unverified',
    properties: {
      material: 'PVC identification supplied by user; technical composition unverified',
      texture: 'Smooth flat surface without granular texture',
      color: 'Dark smoke-black',
      form: 'Transparent tinted sheet; exact construction unverified',
    },
    visualProperties: {
      surface: 'Very smooth and flat',
      pattern: 'Clear dark-tinted transparency',
      finish: 'Very subtle soft reflections',
      opacity: 'Transparent/tinted; optical values unverified',
    },
    texture: 'Smooth flat transparent sheet',
    color: 'Dark smoke-black',
    materialPrompt: 'Dark smoke-black transparent PVC sheet with smooth flat surface, clear dark-tinted transparency and very subtle soft reflections.',
    possibleApplications: ['conceptual partition', 'display element', 'interior panel'],
  }),
  'acrylic-sheet-01': createMaterial('acrylic-sheet-01', 'Acrylic Sheet', 'user-provided-reference', {
    japaneseName: 'アクリル板',
    imageSrc: '/materials/acrylic-sheet-01.png',
    referenceImageSrc: '/materials/acrylic-sheet-01.png',
    category: 'Plastic',
    conceptCategory: 'Artificial',
    supplier: {name: 'Unknown'},
    sourceUrl: null,
    productCode: null,
    materialType: 'Acrylic / PMMA',
    properties: {
      material: 'Acrylic (PMMA), polymer family',
      texture: 'Mixed frosted, matte, translucent-looking, and reflective acrylic finishes',
      color: 'Follow the supplied reference image',
      form: 'Acrylic sheet with translucent, frosted, matte, and reflective finish variations',
    },
    visualProperties: {
      surface: 'Mixed finishes',
      pattern: '2×2 surface variation',
      finish: 'Frosted / Matte / Translucent-looking / Reflective; reflectivity varies by finish; non-metallic base material',
      opacity: 'Varies by region; exact optical properties unverified',
    },
    texture: 'Mixed acrylic surface finishes in an exact 2×2 grid',
    color: 'Follow the supplied reference image',
    libraryImagePrompt: 'Photorealistic acrylic sheet material sample showing four distinct surface finishes arranged in an exact 2x2 grid. All four quadrants represent acrylic material with different visual treatments, not different base materials. Top-left: warm pale golden translucent-looking acrylic surface with fine grain and two muted horizontal greenish-gray bands. Top-right: frosted off-white acrylic surface with fine cloudy microtexture, soft diffuse reflection, and low visual clarity. Bottom-left: warm sand-beige acrylic with a uniform fine granular matte finish. Bottom-right: highly reflective silver-effect acrylic surface with a dense repeating grid of raised square-pyramid facets, producing crisp geometric highlights and reflections. Preserve the exact quadrant arrangement, color distribution, surface microtexture, pattern scale, boundaries, and visual contrast shown in the supplied reference image. Realistic polymer surface appearance, no conversion into ceramic, natural stone, fabric, or actual solid metal.',
    materialPrompt: 'Acrylic (PMMA) sheet with the supplied sample’s pale-golden translucent, frosted off-white, warm-beige matte, and reflective silver-effect finishes. The silver-effect finish has a small square-pyramid relief and remains polymer rather than solid metal. Use the finish or detail that best suits the requested interior element, with realistic translucency, frosting, and reflections; do not treat the sample layout itself as a room design.',
  }),
  'natural-rubber-01': createMaterial('natural-rubber-01', 'Natural Rubber', 'user-provided-reference', {
    japaneseName: '天然ゴムシート',
    imageSrc: '/materials/natural-rubber-01.jpg',
    referenceImageSrc: '/materials/natural-rubber-01.jpg',
    category: 'Rubber',
    conceptCategory: 'Natural',
    supplier: {name: 'ゴムシート.com / エーフロンティア'},
    sourceUrl: 'https://gom-sheet.com/sample/',
    materialType: 'Natural Rubber',
    properties: {
      material: 'Natural Rubber',
      texture: 'Subtle rubber grain',
      color: 'Follow reference photo',
      form: 'Flexible, highly elastic elastomer sheet',
    },
    visualProperties: {
      surface: 'Matte / Fine-grain',
      pattern: 'Subtle rubber grain',
      finish: 'Matte / low-sheen; low reflectivity; non-metallic; relatively high roughness',
      opacity: 'Opaque',
    },
    texture: 'Subtle rubber grain',
    color: 'Follow reference photo',
    libraryImagePrompt: 'Natural rubber sheet material, opaque solid rubber surface, matte to low-sheen finish, soft non-metallic appearance, subtle fine-grain surface texture, dense and homogeneous material structure, flexible elastomer with realistic material thickness, understated diffuse reflections, minimal specular highlights, no transparency, no metallic reflections, no plastic gloss, no silicone-like translucency. Preserve the exact color, surface pattern, and finish shown in the provided reference photograph. Photorealistic material representation with accurate texture scale and physically plausible surface properties.',
    materialPrompt: 'Dense, flexible natural-rubber sheet with the supplied reference color, subtle fine-grain texture, opaque matte-to-low-sheen surface, soft diffuse light response, and very limited specular reflection. Its resilient, non-metallic surface suits floor insets, protective cladding, or functional furniture details; it is not glossy plastic or translucent silicone.',
    possibleApplications: ['floor inset', 'protective cladding', 'functional furniture detail'],
    unsuitableApplications: ['major unsupported load-bearing structure'],
  }),
  'tilepark-prague-rf400': createMaterial('tilepark-prague-rf400', 'Prague Tile', 'user-provided-reference', {
    japaneseName: 'プラハ',
    imageSrc: '/materials/tilepark-prague-rf400.png',
    referenceImageSrc: '/materials/tilepark-prague-rf400.png',
    imageScale: 1.06,
    category: 'Tile',
    conceptCategory: 'Artificial',
    supplier: {name: 'TILE PARK'},
    sourceName: 'TILE PARK',
    productCode: 'RF-400',
    materialType: 'Glazed Ceramic Tile',
    properties: {
      material: 'Glazed ceramic tile',
      texture: 'Smooth glazed surface with subtle natural variations',
      color: 'Deep teal-blue / blue-green, following the supplied photograph',
      form: 'Ceramic tile surface; dimensions and tile format unverified',
    },
    visualProperties: {
      surface: 'Smooth glazed ceramic surface',
      pattern: 'Subtle irregular tonal variation',
      finish: 'Glossy and reflective; non-metallic',
      opacity: 'Opaque',
    },
    texture: 'Smooth glazed surface with subtle natural variations',
    color: 'Deep teal-blue / blue-green, following the supplied photograph',
    libraryImagePrompt: 'Glazed ceramic tile with a deep teal-blue / blue-green color, glossy reflective glaze, and subtle irregular natural tonal variations. Preserve the recognizable blue-green color, ceramic appearance, and reflective surface character shown in the supplied reference photograph. Keep the surface realistic and slightly handcrafted in appearance without adding unsupported patterns, dimensions, edge details, or technical properties.',
    materialPrompt: 'Deep teal-blue glazed ceramic tile with a glossy reflective finish and subtle natural tonal variations. Suitable for architectural accent walls and decorative interior surfaces. Preserve its recognizable blue-green color, ceramic appearance, and reflective glaze when interpreting its application in a spatial environment.',
    possibleApplications: ['interior accent wall', 'decorative wall finish', 'kitchen backsplash', 'architectural feature surface'],
  }),
  'daiso-shoji-paper-01': createMaterial('daiso-shoji-paper-01', 'Shoji Paper', 'user-provided-reference', {
    japaneseName: '障子紙',
    imageSrc: '/materials/daiso-shoji-paper-01.png',
    referenceImageSrc: '/materials/daiso-shoji-paper-01.png',
    category: 'Paper',
    conceptCategory: 'Cultural',
    supplier: {name: 'DAISO'},
    sourceName: 'DAISO',
    sourceUrl: null,
    productCode: null,
    materialType: 'Japanese Shoji Paper',
    properties: {
      material: 'Translucent Japanese Shoji Paper',
      texture: 'Fine irregular paper fibers',
      color: 'Soft warm-white surface, following the supplied reference photo',
      form: 'Thin fibrous paper sheet with soft diffused light transmission',
    },
    visualProperties: {
      surface: 'Matte',
      pattern: 'Fine irregular interwoven paper fibers',
      finish: 'Very low reflectivity; non-metallic',
      opacity: 'Translucent; neither transparent nor opaque',
    },
    texture: 'Fine irregular interwoven paper fibers',
    color: 'Soft warm white, following the supplied reference photo',
    libraryImagePrompt: 'Traditional Japanese shoji paper material, delicate thin fibrous paper sheet, soft warm-white color, fine irregularly interwoven natural-looking fibers, subtle overlapping wispy fiber strands distributed organically across the surface, softly diffused translucent appearance, matte finish, extremely low surface reflectivity, delicate cloudy fibrous structure, subtle variations in fiber density, soft natural appearance, photorealistic paper texture with accurate microscopic fiber scale. Preserve the exact fiber pattern, color tone, surface density, and texture distribution shown in the supplied reference photograph. The material should look like authentic translucent Japanese shoji paper, not cotton fabric, wool felt, plastic film, smooth printer paper, or opaque cardboard. No artificial geometric pattern, no exaggerated fiber thickness, no glossy coating.',
    materialPrompt: 'Thin, soft warm-white Japanese shoji paper with fine irregular interwoven fibers, a matte low-reflectivity surface, and gentle light transmission that diffuses illumination while softening visibility through it. It can suit translucent screens or light-filtering interior panels; its light response follows the scene and it is neither clear nor fully opaque.',
    possibleApplications: ['translucent screen', 'light-filtering panel'],
    unsuitableApplications: ['load-bearing structure', 'wet-area finish'],
  }),
  'wool-felt-01': createMaterial('wool-felt-01', 'Wool Felt', 'user-provided-reference', {
    japaneseName: '羊毛フェルト',
    imageSrc: '/materials/wool-felt-01.png',
    referenceImageSrc: '/materials/wool-felt-01.png',
    category: 'Textile',
    conceptCategory: 'Natural',
    supplier: {name: 'Unknown'},
    sourceUrl: null,
    productCode: null,
    materialType: 'Wool Felt',
    properties: {
      material: 'Wool Felt',
      texture: 'Dense non-woven fibrous texture with fine fuzzy felt fibers',
      color: 'Follow the supplied reference photo; off-white / soft warm white',
      form: 'Soft compressed fibrous sheet with high softness and medium-to-high flexibility',
    },
    visualProperties: {
      surface: 'Matte / soft fibrous',
      pattern: 'No geometric pattern; subtle organic fiber variation only',
      finish: 'Matte; very low reflectivity; non-metallic',
      opacity: 'Opaque',
    },
    texture: 'Dense fine felt fibers',
    color: 'Follow the supplied reference photo; off-white / soft warm white',
    libraryImagePrompt: 'Wool felt material, dense non-woven fibrous textile surface, soft off-white color, matte finish, opaque appearance, fine fuzzy interlocked fibers distributed evenly across the surface, soft and slightly fluffy texture, compressed felt sheet structure, delicate natural fiber variation, photorealistic felt material representation with accurate fiber scale and realistic surface density. Preserve the exact color tone, fiber density, texture softness, and subtle surface variation shown in the supplied reference photograph. The material should look like authentic wool felt, not woven fabric, paper, foam, fleece, cotton batting, or plastic sheet. No visible weave grid, no glossy coating, no strong directional fabric pattern.',
    materialPrompt: 'Soft warm-white wool felt with dense short non-woven fibers, a subtly fuzzy tactile surface, matte finish, opaque character, and very low reflectivity. Its flexible, sound-absorbing sheet form suits upholstery, acoustic wall treatment, or soft furniture details without long pile or a woven pattern.',
    possibleApplications: ['upholstery', 'acoustic wall treatment', 'soft furniture detail'],
  }),
  'bamboo-slat-01': createMaterial('bamboo-slat-01', 'Bamboo', 'user-provided-reference', {
    japaneseName: '竹材',
    imageSrc: '/materials/bamboo-slat-01.png',
    referenceImageSrc: '/materials/bamboo-slat-01.png',
    category: 'Natural',
    conceptCategory: 'Natural',
    supplier: {name: 'Unknown'},
    sourceUrl: null,
    productCode: null,
    materialType: 'Bamboo',
    properties: {
      material: 'Bamboo slat surface',
      texture: 'Narrow bamboo slats with subtle natural grain and node variation',
      color: 'Follow the supplied reference photo; light beige to pale yellow bamboo tone',
      form: 'Narrow bamboo strips or rods assembled vertically side by side',
    },
    visualProperties: {
      surface: 'Smooth natural bamboo',
      pattern: 'Vertical linear repetition with slight tonal and node variation',
      finish: 'Matte / low sheen; low reflectivity; non-metallic',
      opacity: 'Opaque',
    },
    texture: 'Narrow bamboo slats with subtle natural grain',
    color: 'Follow the supplied reference photo; light beige to pale yellow bamboo tone',
    libraryImagePrompt: 'Bamboo slat material, composed of narrow vertical bamboo strips arranged side by side in a repeating linear pattern, light beige to pale golden natural bamboo color, smooth natural plant-based surface, subtle bamboo grain, visible gentle variation in tone and node-like bamboo markings, matte to low-sheen finish, opaque appearance, photorealistic bamboo material representation with realistic slat spacing and natural organic variation. Preserve the exact color tone, strip width, spacing rhythm, surface character, and subtle node/grain details shown in the supplied reference photograph. The material should look like authentic bamboo slats or bamboo rods assembled into a surface, not flat bamboo flooring, oak planks, rattan weave, wicker, printed woodgrain, or synthetic panel. No exaggerated gloss, no heavy roughness, no artificial geometric ornament beyond the natural repeated slat structure.',
    materialPrompt: 'Light beige-to-pale-yellow natural bamboo formed from narrow vertical slats, with subtle grain, gentle node variation, natural spacing, and a matte-to-low-sheen finish. The slender repeated slat form suits screens, cabinetry, furniture, or architectural detailing and should remain distinct from flat timber planks, rattan, or wicker.',
    possibleApplications: ['screen', 'cabinetry', 'furniture', 'architectural detail'],
  }),
  'natsusobiku-ametsuchi-01': createMaterial('natsusobiku-ametsuchi-01', 'Ametsuchi Linen', 'user-provided-reference', {
    japaneseName: 'アメツチ 01 生成',
    imageSrc: '/materials/natsusobiku-ametsuchi-01.jpg',
    referenceImageSrc: '/materials/natsusobiku-ametsuchi-01.jpg',
    category: 'Fabric',
    conceptCategory: 'Cultural',
    supplier: {name: 'natsusobiku'},
    sourceName: 'natsusobiku',
    sourceUrl: 'https://www.natsusobiku.jp/shopping/item/fab/fab0601',
    materialType: '100% Linen',
    properties: {
      material: '100% linen, made in Japan',
      texture: 'Dense plain weave with visible linen fibers, subtle irregularities, and natural slubs',
      color: 'Natural beige / warm greige',
      form: 'Heavyweight woven fabric with natural folds and soft drape',
    },
    visualProperties: {
      surface: 'Visible linen fibers with subtle natural slubs',
      pattern: 'Dense plain weave with subtle irregularities',
      finish: 'Matte, soft, and tactile',
      opacity: null,
    },
    texture: 'Dense plain-woven linen with visible fibers, subtle irregularities, and natural slubs',
    color: 'Natural beige / warm greige',
    libraryImagePrompt: 'Natural heavyweight linen fabric in a soft undyed beige-greige color, dense plain-weave construction with visible linen fibers, subtle irregular yarn texture and natural slubs, matte tactile surface, and gentle natural folds. Preserve the recognizable woven linen texture, warm beige-gray tone, and natural appearance shown in the supplied photograph. Do not add a pattern, finish, or performance property not visible in the reference.',
    materialPrompt: 'Natural heavyweight linen fabric in a soft undyed beige-greige color. Characterized by dense plain-weave construction, subtle irregular yarn textures, a tactile matte surface, and soft natural folds. Suitable for curtains, soft furnishings, and decorative textile applications. Preserve its recognizable woven linen texture and natural appearance in spatial visualization.',
    possibleApplications: ['curtains and window treatments', 'soft furnishing accents', 'cushions', 'decorative fabric panels', 'textile accessories'],
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

/** Evidence profiles extend the same Registry; legacy lookups stay available. */
export function getMaterialProfileV2(id) {
  return getMaterialById(id)?.profileV2 ?? null;
}

/** Candidate inventory membership does not imply verified generation readiness. */
export function isGenerationCandidateMaterial(id) {
  return getMaterialById(id)?.generationCandidate === true;
}

export function getGenerationCandidateMaterials() {
  return Object.values(MATERIALS).filter(material => material.generationCandidate);
}

// Explicit compatibility records: never offered as real Library materials.
const TEST_MATERIALS = Object.freeze({
  'coke-can': createMaterial('coke-can', 'Coke Can', 'technical-test'),
  blackcan: createMaterial('blackcan', 'Black Can', 'technical-test'),
  tissue: createMaterial('tissue', 'Tissue', 'technical-test'),
});

export function getLibraryMaterials() {
  return getGenerationCandidateMaterials();
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
  const aliases = {
    linen: 'natsusobiku-ametsuchi-01',
    shojipaper: 'daiso-shoji-paper-01',
    'natural stone': 'split-marble-gray',
    woolfelt: 'wool-felt-01',
    tatami: 'japanese-igusa',
  };
  if (value === 'koeido-al-03' || value === 'koeido-eb-02' ||
    value === 'aluminum' || value === 'white pvc') return null;
  if (Object.hasOwn(aliases, value)) return aliases[value];
  if (value === 'cork' || value === 'tilte') return null;
  // Keep unknown class identity for debugging; selection checks support separately.
  return value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
}
