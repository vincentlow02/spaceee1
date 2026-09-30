/**
 * materialSelection.js
 *
 * Pure selection logic for Spacee material picking.
 * No React, no side effects — all functions return new arrays.
 *
 * Rules:
 *  - Maximum 3 materials selected at once
 *  - Selection order is preserved
 *  - A material can only be selected once (deduplicated by id)
 *
 * Usage (inside a React component):
 *   const [selected, setSelected] = useState([]);
 *   setSelected(prev => selectMaterial(prev, material));
 *   setSelected(prev => removeMaterial(prev, material.id));
 *
 * Phase 2 → Supabase extension point:
 *   Pass getSelectedMaterials() output as the `materials` column
 *   when creating an exploration record.
 */

export const MAX_SELECTION = 3;

/**
 * Adds a material to the selection if room allows and it isn't already present.
 *
 * @param {Array} currentSelection - Existing selected materials array
 * @param {object} material        - Material object from createMaterialFromRecognition()
 * @returns {Array}                - New selection array (original unchanged)
 */
export function selectMaterial(currentSelection, material) {
  if (currentSelection.length >= MAX_SELECTION) {
    // Already at limit — caller should check canAddMaterial() first
    return currentSelection;
  }

  const alreadySelected = currentSelection.some((m) => m.id === material.id);
  if (alreadySelected) {
    return currentSelection;
  }

  return [...currentSelection, material];
}

/**
 * Removes a material from the selection by its id.
 *
 * @param {Array}  currentSelection
 * @param {string} materialId
 * @returns {Array} New selection array
 */
export function removeMaterial(currentSelection, materialId) {
  return currentSelection.filter((m) => m.id !== materialId);
}

/**
 * Returns the current selection (identity function for symmetry with the API).
 *
 * @param {Array} currentSelection
 * @returns {Array}
 */
export function getSelectedMaterials(currentSelection) {
  return currentSelection;
}

/**
 * Returns an empty selection array.
 *
 * @returns {Array}
 */
export function clearSelection() {
  return [];
}

/**
 * Returns true when another material can still be added.
 *
 * @param {Array} currentSelection
 * @returns {boolean}
 */
export function canAddMaterial(currentSelection) {
  return currentSelection.length < MAX_SELECTION;
}
