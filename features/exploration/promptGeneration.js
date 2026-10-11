import { MAX_SELECTION } from './materialSelection.js';
import { resolveTemporaryMaterialInformation } from '../materials/temporaryMaterialInformation.js';
import { SPATIAL_TEMPLATE_INSTRUCTIONS } from './spatialTemplate.js';

/**
 * Convert discoveries into a neutral exploration prompt without prescribing
 * style, atmosphere, architecture, or design direction.
 */
export function generateExplorationPrompt(materials) {
  if (!Array.isArray(materials) || materials.length !== MAX_SELECTION) {
    throw new Error(`Exactly ${MAX_SELECTION} materials are required to generate a prompt.`);
  }

  const categories = materials.map((material) =>
    typeof material === 'string' ? material.trim() : material?.category?.trim()
  );

  if (categories.some((category) => !category)) {
    throw new Error('Every selected material must include a category.');
  }

  return [
    `Discovered material categories: ${categories.join(', ')}.`,
    'Based only on these discovered material categories, explore possible spatial environments.',
    'Interpret the relationship between these materials and generate an unexpected spatial concept.',
    SPATIAL_TEMPLATE_INSTRUCTIONS,
  ].join('\n');
}

function knownValue(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'unknown';
}

function validateSnapshot(snapshot) {
  if (!snapshot || snapshot.status !== 'captured') {
    throw new Error('A captured Exploration Snapshot is required to build a spatial prompt.');
  }

  if (!Array.isArray(snapshot.materials) || snapshot.materials.length !== MAX_SELECTION) {
    throw new Error(`The Exploration Snapshot must contain exactly ${MAX_SELECTION} materials.`);
  }

  if (
    snapshot.materials.some(
      (material) =>
        !Number.isInteger(material?.position) ||
        !Number.isInteger(material?.priority) ||
        typeof material?.materialId !== 'string' ||
        material.materialId.trim().length === 0
    )
  ) {
    throw new Error('Every snapshot material must include position, priority, and materialId.');
  }
}

/**
 * Convert an immutable Exploration Snapshot into a deterministic, inspectable
 * prompt. Snapshot order is preserved exactly; confidence is recognition
 * evidence and is intentionally excluded from the creative prompt.
 */
export function buildSpatialPrompt(
  snapshot,
  { resolveMaterial = resolveTemporaryMaterialInformation } = {}
) {
  validateSnapshot(snapshot);

  const materials = snapshot.materials.map((snapshotMaterial) => {
    const information = resolveMaterial(snapshotMaterial.materialId);
    const properties = information?.properties || {};

    return {
      position: snapshotMaterial.position,
      priority: snapshotMaterial.priority,
      materialId: snapshotMaterial.materialId,
      name: knownValue(information?.name),
      category: knownValue(information?.category),
      materialPrompt: information?.materialPrompt ?? null,
      properties: {
        material: knownValue(properties.material),
        texture: knownValue(properties.texture),
        color: knownValue(properties.color),
        form: knownValue(properties.form),
      },
    };
  });

  const ordinal = ['first','second','third'];
  const observedMaterials = materials.map((material,index) => {
    const knownProperties = Object.entries(material.properties)
      .filter(([,value]) => value !== 'unknown')
      .map(([key,value]) => `${key} is ${value}`);
    const category = material.category === 'unknown' ? '' : ` in the ${material.category} category`;
    const profile = material.materialPrompt ? ` ${material.materialPrompt}` : '';
    const facts = knownProperties.length ? ` Verified qualities: ${knownProperties.join(', ')}.` : '';
    return `The ${ordinal[index]} material is ${material.name}${category}.${profile}${facts}`;
  });

  const prompt = [
    'Create a finished, photorealistic interior by editing the supplied base-room photograph.',
    SPATIAL_TEMPLATE_INSTRUCTIONS,
    ...observedMaterials,
    'Use that ordering only to guide the relative influence of the materials. Translate their verified qualities into surfaces and architectural details rather than displaying the source products themselves.',
    'Furnish the room as a believable, complete interior with proportionate furniture, practical lighting, soft furnishings, and a coherent atmosphere. Keep the specific style open to an interpretation of the verified material facts.',
    'The final image must contain only the interior scene. Do not include typography, letters, numbers, captions, labels, annotations, diagrams, floor plans, material samples, swatches, tables, borders, side panels, specification sheets, presentation boards, mood boards, posters, or interface elements anywhere in the frame.',
  ].join(' ');

  return {
    prompt,
    materials,
    sessionId: snapshot.sessionId,
  };
}
