/**
 * explorationState.js
 *
 * Defines the canonical Material Object format used throughout Phase 2+.
 *
 * Responsibilities:
 *  - Declare the material data structure
 *  - Provide a factory that creates a Material from a recognition result
 *  - Provide the known sub-type hints per category (expandable)
 *
 * Data shape:
 * {
 *   id:         string,   // unique per capture, e.g. "material_1727700000000"
 *   name:       string,   // display name derived from category
 *   category:   string,   // "Natural" | "Artificial" | "Cultural"
 *   confidence: number,   // 0–1 from Teachable Machine
 *   properties: {
 *     texture: string     // placeholder; expand in Phase 3
 *   },
 *   capturedAt: string    // ISO 8601
 * }
 *
 * Phase 3 extension point:
 *   Add Qwen AI-generated description to `properties` before Supabase insert.
 */

/**
 * Sub-type hints per category.
 * These are not hard-coded as the only options — they're seeds for
 * future expansion (e.g. Qwen naming, user tagging).
 */
export const CATEGORY_SUBTYPES = {
  Natural: ['wood', 'stone', 'plant', 'water', 'earth'],
  Artificial: ['metal', 'plastic', 'glass', 'fabric', 'ceramic'],
  Cultural: ['handmade object', 'flea market object', 'printed material', 'textile'],
};

/**
 * Creates a Material Object from a Spacee recognition result.
 *
 * @param {{
 *   primaryCategory: string,
 *   priority: Array<{ category: string, confidence: number }>,
 *   timestamp: string
 * }} recognitionResult - Output of processRecognitionResult()
 *
 * @returns {{
 *   id: string,
 *   name: string,
 *   category: string,
 *   confidence: number,
 *   properties: { texture: string },
 *   capturedAt: string
 * }}
 */
export function createMaterialFromRecognition(recognitionResult) {
  const { primaryCategory, priority, timestamp } = recognitionResult;
  const topItem = priority[0];

  return {
    // Unique ID based on timestamp so captures don't collide
    id: `material_${Date.now()}`,
    // Human-readable name: category label (can be refined by user or Qwen later)
    name: primaryCategory,
    category: primaryCategory,
    confidence: topItem.confidence,
    properties: {
      // Texture is a placeholder — Qwen AI will populate this in Phase 3
      texture: 'unknown',
    },
    capturedAt: timestamp,
  };
}
