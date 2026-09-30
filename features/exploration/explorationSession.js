/**
 * explorationSession.js
 *
 * Frontend session state for a Spacee exploration run.
 *
 * Responsible for:
 *  - Creating a new session object
 *  - Updating selected materials within a session
 *  - Advancing session status
 *
 * Session shape:
 * {
 *   id:                string,   // "exp_<timestamp>"
 *   status:            string,   // "selecting" | "ready_for_generation" | "completed"
 *   selectedMaterials: Material[], // up to 3
 *   createdAt:         string    // ISO 8601
 * }
 *
 * All functions are pure — they return new objects so React state diffs correctly.
 *
 * Phase 3 extension point:
 *   After createSession() → insert row in Supabase `explorations` table.
 *   After updateSessionMaterials() → update Supabase row.
 *   After advanceSessionStatus('completed') → trigger Qwen AI generation.
 */

/** All valid session statuses in lifecycle order. */
export const SESSION_STATUSES = {
  SELECTING: 'selecting',
  READY_FOR_GENERATION: 'ready_for_generation',
  COMPLETED: 'completed',
};

/**
 * Creates a fresh exploration session.
 *
 * @returns {{
 *   id: string,
 *   status: string,
 *   selectedMaterials: Array,
 *   createdAt: string
 * }}
 */
export function createSession() {
  return {
    id: `exp_${Date.now()}`,
    status: SESSION_STATUSES.SELECTING,
    selectedMaterials: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Returns a new session with an updated selectedMaterials list.
 *
 * @param {object} session          - Existing session object
 * @param {Array}  selectedMaterials - New selection array (from materialSelection.js)
 * @returns {object} Updated session (original unchanged)
 */
export function updateSessionMaterials(session, selectedMaterials) {
  return {
    ...session,
    selectedMaterials,
  };
}

/**
 * Advances the session to the next status.
 *
 * @param {object} session   - Existing session object
 * @param {string} newStatus - One of SESSION_STATUSES values
 * @returns {object} Updated session
 */
export function advanceSessionStatus(session, newStatus) {
  const valid = Object.values(SESSION_STATUSES);
  if (!valid.includes(newStatus)) {
    throw new Error(`advanceSessionStatus: unknown status "${newStatus}"`);
  }

  return {
    ...session,
    status: newStatus,
  };
}
