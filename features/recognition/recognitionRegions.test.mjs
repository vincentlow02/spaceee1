import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECOGNITION_REGION_LIST,
  getContainedVideoRect,
  resolveRegionToVideoPixels,
} from './recognitionRegions.js';

test('defines positions 1, 2, and 3 exactly once', () => {
  assert.deepEqual(RECOGNITION_REGION_LIST.map((region) => region.position), [1, 2, 3]);
});

test('converts normalized ROI coordinates to native video pixels', () => {
  assert.deepEqual(
    resolveRegionToVideoPixels({ x: 0.25, y: 0.1, width: 0.5, height: 0.4 }, 1280, 720),
    { x: 320, y: 72, width: 640, height: 288 }
  );
});

test('flips only the source x-coordinate for a mirrored preview', () => {
  assert.deepEqual(
    resolveRegionToVideoPixels(
      { x: 0.1, y: 0.2, width: 0.25, height: 0.25 },
      1000,
      800,
      { mirrored: true }
    ),
    { x: 650, y: 160, width: 250, height: 200 }
  );
});

test('calculates the contained video rectangle independently of native resolution', () => {
  assert.deepEqual(getContainedVideoRect(1000, 700, 1920, 1080), {
    left: 0,
    top: 68.75,
    width: 1000,
    height: 562.5,
  });
});
