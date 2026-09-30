/**
 * materialMapper.js
 *
 * Defines the canonical material category registry for Spacee.
 *
 * Responsibilities:
 *  - Declare all valid categories with metadata
 *  - Provide lookup helpers for validation / future expansion
 *
 * Phase 2+ extension point:
 *  - Add Supabase category slugs here when syncing with exploration history
 */

/** All recognised Spacee material categories. */
export const MATERIAL_CATEGORIES = {
  Natural: {
    description: 'Materials discovered in natural environments',
  },

  Artificial: {
    description: 'Human processed or manufactured materials',
  },

  Cultural: {
    description: 'Market and cultural materials',
  },
};

/**
 * Returns true when the given string matches a known category key.
 * @param {string} name
 * @returns {boolean}
 */
export function isKnownCategory(name) {
  return Object.prototype.hasOwnProperty.call(MATERIAL_CATEGORIES, name);
}

/**
 * Returns an array of all known category names.
 * @returns {string[]}
 */
export function getCategoryNames() {
  return Object.keys(MATERIAL_CATEGORIES);
}
