import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SPACE_BASE_IMAGE } from '../features/exploration/spatialTemplate.js';

/** Server-controlled input: no client image URL or filesystem path is accepted. */
export async function loadSpaceBaseImage() {
  try {
    const image = await readFile(path.join(process.cwd(), 'public', SPACE_BASE_IMAGE.publicPath.slice(1)));
    const pngSignature = Buffer.from([137,80,78,71,13,10,26,10]);
    if (image.length < 24 || image.length > 10 * 1024 * 1024 || !image.subarray(0,8).equals(pngSignature) ||
        image.readUInt32BE(16) !== SPACE_BASE_IMAGE.width || image.readUInt32BE(20) !== SPACE_BASE_IMAGE.height) {
      throw new Error('Invalid spatial template.');
    }
    return `data:image/png;base64,${image.toString('base64')}`;
  } catch {
    const error = new Error('The fixed space base image is unavailable.');
    error.code = 'BASE_IMAGE_UNAVAILABLE';
    throw error;
  }
}
