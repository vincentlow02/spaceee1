import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SPACE_BASE_IMAGE } from '../features/exploration/spatialTemplate.js';
import { getSpaceType } from '../features/exploration/spaceTypes.js';
import { createHash } from 'node:crypto';

export async function loadSpaceBaseImageWithMetadata(spaceType, {path:overridePath,mime:overrideMime}={}) {
  try {
    const space=spaceType === undefined ? null : getSpaceType(spaceType);
    if (spaceType !== undefined && !space) throw new Error('Invalid space type.');
    const publicPath=overridePath || (space ? space.generationBaseImage : SPACE_BASE_IMAGE.publicPath);
    if(overridePath && (!space || !/^\/images\/space-bases\/[a-zA-Z0-9._-]+$/.test(overridePath))) {
      throw new Error('Invalid space base override.');
    }
    const imagePath=publicPath.slice(1);
    const image=await readFile(path.join(process.cwd(),'public',imagePath));
    const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
    const mime=overrideMime || space?.mime || 'image/png';
    const validSignature=mime==='image/png' ? image.subarray(0,8).equals(pngSignature)
      : mime==='image/jpeg' && image[0]===255 && image[1]===216 && image[2]===255;
    if (image.length<24 || image.length>10*1024*1024 || !validSignature ||
      (!space && (image.readUInt32BE(16)!==SPACE_BASE_IMAGE.width || image.readUInt32BE(20)!==SPACE_BASE_IMAGE.height))) {
      throw new Error('Invalid spatial template.');
    }
    return {data:`data:${mime};base64,${image.toString('base64')}`, path:publicPath,
      sha256:createHash('sha256').update(image).digest('hex'), spaceType:space?.id || null};
  } catch {
    const error=new Error('The fixed space base image is unavailable.');
    error.code='BASE_IMAGE_UNAVAILABLE';
    throw error;
  }
}

export async function loadSpaceBaseImage(spaceType) {
  return (await loadSpaceBaseImageWithMetadata(spaceType)).data;
}
