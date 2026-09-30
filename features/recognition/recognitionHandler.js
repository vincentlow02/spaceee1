/**
 * recognitionHandler.js
 *
 * Converts raw Teachable Machine predictions into the canonical
 * Spacee MaterialRecognitionResult format.
 *
 * Input  — Teachable Machine array:
 *   [{ className: string, probability: number }, ...]
 *
 * Output — Spacee structured object:
 *   {
 *     primaryCategory: string,
 *     priority: [{ category: string, confidence: number }, ...],
 *     timestamp: string   // ISO 8601
 *   }
 *
 * This layer is intentionally framework-agnostic (plain JS).
 * The UI layer only calls processRecognitionResult() and stores the output.
 *
 * Phase 2 extension point:
 *   Pass the returned object directly to Supabase exploration logging.
 */

/**
 * Processes raw Teachable Machine predictions into a Spacee recognition result.
 *
 * @param {Array<{ className: string, probability: number }>} predictions
 * @returns {{
 *   primaryCategory: string,
 *   priority: Array<{ category: string, confidence: number }>,
 *   timestamp: string
 * }}
 */
export function processRecognitionResult(predictions) {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    throw new Error('processRecognitionResult: predictions must be a non-empty array');
  }

  // Sort descending by probability so the highest-confidence item comes first
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);

  // Map TM shape → Spacee shape
  const priority = sorted.map((p) => ({
    category: p.className,
    confidence: p.probability,
  }));

  return {
    primaryCategory: priority[0].category,
    priority,
    timestamp: new Date().toISOString(),
  };
}
