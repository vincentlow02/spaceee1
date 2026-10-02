import { MAX_SELECTION } from './materialSelection.js';
import { resolveTemporaryMaterialInformation } from '../materials/temporaryMaterialInformation.js';

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
    'Create a realistic 2D spatial visualization.',
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
      properties: {
        material: knownValue(properties.material),
        texture: knownValue(properties.texture),
        color: knownValue(properties.color),
        form: knownValue(properties.form),
      },
    };
  });

  const observedMaterials = materials.flatMap((material) => [
    `Priority ${material.priority} (Position ${material.position}):`,
    `Name: ${material.name}`,
    `Material ID: ${material.materialId}`,
    `Category: ${material.category}`,
    'Known properties:',
    `- Material: ${material.properties.material}`,
    `- Texture: ${material.properties.texture}`,
    `- Color: ${material.properties.color}`,
    `- Form: ${material.properties.form}`,
    '',
  ]);

  const prompt = [
    'ROLE',
    'Explore spatial possibilities from a set of physically discovered materials.',
    '',
    'OBSERVED FACTS',
    'The following identities and factual properties were supplied by the discovery system. Treat unavailable information as unknown.',
    '',
    ...observedMaterials,
    'AI INTERPRETATION',
    'Interpret relationships between the discovered materials and explore how their material qualities could influence a spatial environment.',
    'Search for unexpected relationships and translate them into a coherent spatial possibility.',
    'The observations state what was discovered; you decide what their relationship could become spatially.',
    '',
    'CONSTRAINTS',
    '- Do not simply place or mechanically reproduce the three physical objects in a room.',
    '- Do not assume a conventional room type or impose a predefined architectural or interior style.',
    '- Do not force a known design movement or a manually predefined material-combination rule.',
    '- Base the interpretation on the supplied facts while keeping creative spatial interpretation open-ended.',
    '',
    'OUTPUT',
    'Generate a realistic 2D visualization of a coherent spatial environment with clear spatial depth, a visible relationship between the discovered material qualities, and a visually understandable composition.',
  ].join('\n');

  return {
    prompt,
    materials,
    sessionId: snapshot.sessionId,
  };
}
