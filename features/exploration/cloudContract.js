import { getMaterialById } from '../../lib/materials/materials.js';

export const IMAGE_LIMIT = 20 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function validateCloudRecord(space, record) {
  if (!isUuid(space?.id) || !isUuid(record?.id) || record.spaceId !== space.id ||
      !Number.isInteger(record.version) || record.version < 1 || record.version > 1000) throw new Error('Invalid version.');
  const materials = record.snapshot?.materials;
  if (!Array.isArray(materials) || materials.length !== 3) throw new Error('Three materials are required.');
  const ordered = [...materials].sort((a,b) => a.position - b.position);
  if (new Set(ordered.map(m => m.materialId)).size !== 3 ||
      ordered.some((m,i) => m.position !== i+1 || m.priority !== i+1 || !getMaterialById(m.materialId))) throw new Error('Invalid material selection.');
  if (typeof space.title !== 'string' || !space.title.trim() || space.title.length > 80 ||
      typeof record.initialRequest !== 'string' || record.initialRequest.length > 1000 ||
      typeof record.userRequest !== 'string' || record.userRequest.length > 1000) throw new Error('Invalid space details.');
  return ordered.map(m => ({...m, name:getMaterialById(m.materialId).name}));
}

export function validImageSignature(bytes, type) {
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  return false;
}

function stableJson(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableJson(value[key])]));
  }
  return value;
}

export function historyVersionMatches(existing, expected) {
  return existing?.id === expected.id &&
    existing.space_id === expected.spaceId &&
    existing.generation_index === expected.version &&
    existing.storage_path === expected.path &&
    JSON.stringify(stableJson(existing.snapshot)) === JSON.stringify(stableJson(expected.snapshot)) &&
    JSON.stringify(stableJson(existing.spatial_plan)) === JSON.stringify(stableJson(expected.spatialPlan)) &&
    JSON.stringify(stableJson(existing.refinement_instruction)) === JSON.stringify(stableJson(expected.userRequest));
}
