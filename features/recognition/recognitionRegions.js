/**
 * Phase 4B-2 fixed recognition regions.
 *
 * Coordinates are normalized to the visible video frame (0–1), not CSS pixels.
 * Keep the regions square because the current image classifier expects a square
 * subject crop. These values are deliberately easy to tune during installation.
 */
export const RECOGNITION_REGIONS = Object.freeze({
  1: Object.freeze({ x: 0.35, y: 0.08, width: 0.3, height: 0.3 }),
  2: Object.freeze({ x: 0.08, y: 0.6, width: 0.3, height: 0.3 }),
  3: Object.freeze({ x: 0.62, y: 0.6, width: 0.3, height: 0.3 }),
});

export const RECOGNITION_REGION_LIST = Object.freeze(
  Object.entries(RECOGNITION_REGIONS).map(([position, region]) =>
    Object.freeze({ position: Number(position), ...region })
  )
);

/** Fixed canvas size passed to Teachable Machine for every ROI. */
export const RECOGNITION_CROP_SIZE = 224;

/** Limit React updates and avoid starting another three-ROI pass too quickly. */
export const RECOGNITION_INTERVAL_MS = 150;

/** The current camera preview is not mirrored. */
export const CAMERA_PREVIEW_MIRRORED = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundLayoutValue(value) {
  return Math.round(value * 10000) / 10000 || 0;
}

/**
 * Convert a normalized visible ROI to source pixels in the native video frame.
 * When a preview is mirrored, the source x-coordinate is flipped here so the
 * crop still represents the boundary the user sees.
 */
export function resolveRegionToVideoPixels(
  region,
  videoWidth,
  videoHeight,
  { mirrored = CAMERA_PREVIEW_MIRRORED } = {}
) {
  if (!(videoWidth > 0) || !(videoHeight > 0)) {
    throw new Error('Video dimensions must be available before resolving ROIs.');
  }

  const width = clamp(region.width, 0, 1);
  const height = clamp(region.height, 0, 1);
  const visibleX = clamp(region.x, 0, 1 - width);
  const visibleY = clamp(region.y, 0, 1 - height);
  const sourceX = mirrored ? 1 - visibleX - width : visibleX;

  return {
    x: Math.round(sourceX * videoWidth),
    y: Math.round(visibleY * videoHeight),
    width: Math.max(1, Math.round(width * videoWidth)),
    height: Math.max(1, Math.round(height * videoHeight)),
  };
}

/**
 * Locate an object-fit: contain video inside its CSS container. This keeps the
 * debug boundaries aligned even when CSS size and native camera aspect differ.
 */
export function getContainedVideoRect(containerWidth, containerHeight, videoWidth, videoHeight) {
  if (!(containerWidth > 0) || !(containerHeight > 0) || !(videoWidth > 0) || !(videoHeight > 0)) {
    return null;
  }

  const scale = Math.min(containerWidth / videoWidth, containerHeight / videoHeight);
  const width = videoWidth * scale;
  const height = videoHeight * scale;

  return {
    left: roundLayoutValue((containerWidth - width) / 2),
    top: roundLayoutValue((containerHeight - height) / 2),
    width: roundLayoutValue(width),
    height: roundLayoutValue(height),
  };
}
