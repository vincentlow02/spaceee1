/**
 * teachableMachine.js
 *
 * Encapsulates all Teachable Machine model concerns:
 *  - Loading the model from a configurable URL
 *  - Running continuous predictions against a live video element
 *  - Stopping the prediction loop cleanly
 *
 * This module is browser-only (accesses window/navigator indirectly via TM).
 * Import it only inside Client Components or client-side hooks.
 *
 * Configuration:
 *   Set NEXT_PUBLIC_TEACHABLE_MODEL_URL in your .env.local file.
 *   The URL should point to the folder containing model.json and metadata.json.
 *
 * Phase 2 extension point:
 *   Swap the model URL per-session to support multiple material classifiers.
 */

let tmImage = null; // lazy-loaded to avoid SSR issues

/**
 * Lazily imports @teachablemachine/image.
 * Called only from browser context.
 */
async function getTMImage() {
  if (!tmImage) {
    tmImage = await import('@teachablemachine/image');
  }
  return tmImage;
}

/**
 * Loads and initialises a Teachable Machine image classification model.
 *
 * @param {string} modelUrl - Base URL of the TM model folder
 *   (must end with '/' or point to model.json directly).
 * @returns {Promise<object>} Loaded TM model instance
 */
export async function loadModel(modelUrl) {
  if (!modelUrl) {
    throw new Error(
      'loadModel: modelUrl is required. ' +
        'Set NEXT_PUBLIC_TEACHABLE_MODEL_URL in your .env.local.'
    );
  }

  const tm = await getTMImage();
  const modelJSON = modelUrl.endsWith('.json')
    ? modelUrl
    : `${modelUrl.replace(/\/$/, '')}/model.json`;
  const metadataURL = modelUrl.endsWith('.json')
    ? modelUrl.replace('model.json', 'metadata.json')
    : `${modelUrl.replace(/\/$/, '')}/metadata.json`;

  const model = await tm.load(modelJSON, metadataURL);
  return model;
}

/**
 * Starts a continuous prediction loop against a live <video> element.
 *
 * @param {object}   model          - Loaded TM model instance
 * @param {HTMLVideoElement} videoEl - The live camera feed element
 * @param {function} onPrediction   - Callback called with raw TM predictions array
 *                                    on every frame: (predictions) => void
 * @returns {{ stop: () => void }}  - Control object; call stop() to cancel the loop
 */
export function startPredictionLoop(model, videoEl, onPrediction) {
  let active = true;

  async function loop() {
    if (!active) return;

    try {
      // predict() returns [{ className, probability }, ...]
      const predictions = await model.predict(videoEl);
      onPrediction(predictions);
    } catch (err) {
      // Tolerate transient errors (e.g. frame not ready yet)
      console.warn('teachableMachine: prediction error (skipping frame)', err);
    }

    if (active) {
      requestAnimationFrame(loop);
    }
  }

  requestAnimationFrame(loop);

  return {
    stop() {
      active = false;
    },
  };
}
