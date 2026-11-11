import profileData from './materialProfilesV2.data.json' with {type: 'json'};

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

deepFreeze(profileData);

/** Identity and category always come from the canonical Registry, never the draft. */
export function createMaterialProfileV2({id, name, category, imageSrc, referenceImageSrc, sourceUrl}) {
  if (!Object.hasOwn(profileData, id)) return null;
  const data = profileData[id];
  return deepFreeze({
    ...data,
    materialId: id,
    name,
    category,
    sources: data.sources.map(source => source.id === 'legacy-registry'
      ? {...source, url: sourceUrl ?? null} : source),
    referenceImages: [
      ...data.referenceImages,
      ...[...new Set([imageSrc, referenceImageSrc].filter(Boolean))].map(src => ({
        src, role: 'legacy_library_image', sourceId: 'legacy-registry',
        mappingStatus: 'retained_for_compatibility_not_sample_verification',
      })),
    ],
  });
}
