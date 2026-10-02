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

/**
 * Run one model against several fixed crops from one live video stream.
 * A complete set is emitted together so React never sees a half-updated frame.
 *
 * @param {object} model Loaded Teachable Machine model.
 * @param {HTMLVideoElement} videoEl The single live camera element.
 * @param {Array<object>} regions Normalized ROI definitions with a position.
 * @param {object} options Loop and crop configuration.
 * @param {function} onPredictionSet Receives [{ position, predictions }, ...].
 * @returns {{ stop: () => void }}
 */
export function startRegionPredictionLoop(
  model,
  videoEl,
  regions,
  {
    cropSize = 224,
    intervalMs = 150,
    mirrored = false,
    resolveRegion,
    onPredictionSet,
    onError,
  }
) {
  if (typeof resolveRegion !== 'function') {
    throw new Error('startRegionPredictionLoop: resolveRegion is required.');
  }

  let active = true;
  let frameRequest = null;
  let lastStartedAt = 0;
  const crops = regions.map((region) => {
    const canvas = document.createElement('canvas');
    canvas.width = cropSize;
    canvas.height = cropSize;
    return { region, canvas, context: canvas.getContext('2d') };
  });

  async function predictRegions(timestamp) {
    if (!active) return;

    if (
      timestamp - lastStartedAt < intervalMs ||
      videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !videoEl.videoWidth ||
      !videoEl.videoHeight
    ) {
      frameRequest = requestAnimationFrame(predictRegions);
      return;
    }

    lastStartedAt = timestamp;

    try {
      const predictionSet = [];

      // Deliberately sequential: one model instance reads three stable crops.
      for (const { region, canvas, context } of crops) {
        const source = resolveRegion(region, videoEl.videoWidth, videoEl.videoHeight, { mirrored });
        context.drawImage(
          videoEl,
          source.x,
          source.y,
          source.width,
          source.height,
          0,
          0,
          cropSize,
          cropSize
        );
        const predictions = await model.predict(canvas);
        predictionSet.push({ position: region.position, predictions });
      }

      if (active) onPredictionSet(predictionSet);
    } catch (error) {
      if (active) onError?.(error);
    }

    if (active) frameRequest = requestAnimationFrame(predictRegions);
  }

  frameRequest = requestAnimationFrame(predictRegions);

  return {
    stop() {
      active = false;
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    },
  };
}
