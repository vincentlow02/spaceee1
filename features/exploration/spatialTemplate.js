/** Fixed geometry input, shared by server generation and result layout.
 * Never use this image as a loading preview or as a generated result.
 */
export const SPACE_BASE_IMAGE = Object.freeze({
  publicPath: '/images/space-base.png',
  width: 1448,
  height: 1086,
  outputSize: '1280*960',
  aspectRatio: '4 / 3',
});

export const SPATIAL_TEMPLATE_INSTRUCTIONS = [
  'FIXED SPATIAL BASE IMAGE — HIGHEST PRIORITY',
  'Edit the supplied base image itself. It is a fixed spatial template, not a style reference.',
  'Preserve its room geometry, camera angle, perspective, floor/wall/ceiling boundaries, and overall spatial composition.',
  'Keep the central floor-to-ceiling window in exactly the same position, size, frame layout, and perspective. Keep it visible and unobstructed.',
  'Do not move the camera, crop the frame, change the viewpoint, or replace the scene with a different room.',
  'Change materials, textures, colors, surfaces, and spatial atmosphere according to the three selected materials.',
  'Material-driven architectural elements may be introduced only within the existing room envelope, without changing its geometry or blocking the window.',
  'Keep geometry and framing consistent across different material combinations so the resulting images can be compared directly.',
  'Return one redesigned 2D image of this same base space. Preserve the base image perspective; do not flatten it into a collage or a floor plan.',
].join('\n');
