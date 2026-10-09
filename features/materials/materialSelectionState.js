import { getMaterialById, resolveMaterial } from '../../lib/materials/materials.js';
import { DISK_POSITIONS, createExplorationSnapshot, getDiscoverEligibility } from '../recognition/positionRecognition.js';

export const MATERIAL_DRAG_TYPE = 'application/x-spacee-material-id';

export function emptyMaterialSelection() {
  return DISK_POSITIONS.map(() => ({ materialId: null, source: 'camera' }));
}

/** Only manual overrides need storage. Camera-owned slots always read the latest frame. */
export function selectLibraryMaterial(selection, position, materialId) {
  const material = getMaterialById(materialId);
  if (!DISK_POSITIONS.includes(position) || !material) return selection;
  return selection.map((slot, index) => index === position - 1
    ? { materialId: material.id, source: 'library' } : slot);
}

export function removeLibraryMaterial(selection, position) {
  if (!DISK_POSITIONS.includes(position)) return selection;
  return selection.map((slot, index) => index === position - 1
    ? { materialId: null, source: 'camera' } : slot);
}

export function resolveMaterialSelection(selection, liveState, cameraAvailable = true) {
  return DISK_POSITIONS.map((position, index) => {
    const slot = selection[index];
    if (slot?.source === 'library') {
      return { materialId: getMaterialById(slot.materialId)?.id ?? null, source: 'library' };
    }
    const observation = liveState?.positions?.find(entry => entry.position === position);
    const material = cameraAvailable && observation?.status === 'recognized'
      ? resolveMaterial(observation.materialId) : null;
    return { materialId: material?.id ?? null, source: 'camera' };
  });
}

/** Bridge to the existing eligibility/Snapshot contract. No fake Library confidence. */
export function selectionToPositionState(selection, liveState) {
  return { positions: DISK_POSITIONS.map((position, index) => {
    const slot = selection[index];
    const material = slot?.source === 'library'
      ? getMaterialById(slot.materialId) : resolveMaterial(slot?.materialId);
    const observation = liveState?.positions?.find(entry => entry.position === position);
    return {
      position, priority: position, materialId: material?.id ?? null,
      status: material ? 'recognized' : 'unknown',
      confidence: slot?.source === 'camera' ? observation?.confidence ?? 0 : null,
    };
  }) };
}

export function getMaterialSelectionEligibility(selection, liveState) {
  return getDiscoverEligibility(selectionToPositionState(selection, liveState));
}

export function createMaterialSelectionSnapshot(selection, liveState, options) {
  return createExplorationSnapshot(selectionToPositionState(selection, liveState), options);
}
