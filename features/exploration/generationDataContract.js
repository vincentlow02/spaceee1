import { z } from 'zod';
import { getMaterialById } from '../../lib/materials/materials.js';
import { getSpaceType } from './spaceTypes.js';
const MATERIAL_ID = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
export const SnapshotMaterialSchema = z.object({
  position: z.number().int(),
  priority: z.number().int(),
  materialId: MATERIAL_ID,
  confidence: z.preprocess(value => Number.isFinite(value) ? value : 0, z.number().finite()),
});

/** The wire shape used by createExplorationSnapshot and the existing route. */
export const MaterialSnapshotSchema = z.object({
  spaceType: z.string().refine(value=>Boolean(getSpaceType(value))).optional(),
  referenceMode: z.enum(['A','B']).optional(),
  sessionId: z.preprocess(value => typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 120) : 'unspecified-session', z.string()),
  createdAt: z.preprocess(value => typeof value === 'string' ? value : null, z.string().nullable()),
  materials: z.tuple([SnapshotMaterialSchema, SnapshotMaterialSchema, SnapshotMaterialSchema]),
  status: z.literal('captured'),
});

const issue = (code, path, message) => ({ code, path, message });
const structuralIssues = error => error.issues.map(item => issue('INVALID_STRUCTURE', item.path, item.message));

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Return only normalized client-owned fields; Registry lookup is authoritative. */
export function validateMaterialSnapshot(input) {
  const parsed = MaterialSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    const issues = structuralIssues(parsed.error);
    if (Array.isArray(input?.materials) && input.materials.length < 3) {
      issues.push(issue('MISSING_MATERIAL', ['materials'], 'A captured snapshot requires three materials.'));
    }
    return { ok: false, snapshot: null, issues };
  }

  const snapshot = parsed.data;
  const issues = [];
  const positions = new Set();
  const priorities = new Set();
  const ids = new Set();
  snapshot.materials.forEach((material, index) => {
    if (![1, 2, 3].includes(material.position) || positions.has(material.position)) {
      issues.push(issue('INVALID_POSITION', ['materials', index, 'position'], 'Positions must be 1, 2, and 3 exactly once.'));
    }
    positions.add(material.position);
    if (![1, 2, 3].includes(material.priority) || priorities.has(material.priority) || material.priority !== material.position) {
      issues.push(issue('INVALID_PRIORITY', ['materials', index, 'priority'], 'Priority must equal its unique physical position.'));
    }
    priorities.add(material.priority);
    if (ids.has(material.materialId)) {
      issues.push(issue('DUPLICATE_MATERIAL_ID', ['materials', index, 'materialId'], 'Each selected material ID must be unique.'));
    }
    ids.add(material.materialId);
    if (!getMaterialById(material.materialId)) {
      issues.push(issue('UNKNOWN_MATERIAL_ID', ['materials', index, 'materialId'], 'Material ID is not in the canonical Registry.'));
    }
  });
  return issues.length
    ? { ok: false, snapshot: null, issues }
    : { ok: true, snapshot: deepFreeze(snapshot), issues: [] };
}
