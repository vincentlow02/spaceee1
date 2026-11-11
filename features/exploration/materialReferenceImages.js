import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {MATERIALS} from '../../lib/materials/materials.js';
import libraryInputs from './materialLibraryGenerationInputsV1.json' with {type:'json'};

// A mapping belongs here only after the physical sample and photograph are verified.
export const VERIFIED_MATERIAL_REFERENCES = Object.freeze({
  jute:Object.freeze({
    verified:true,file:'IMG_1629.jpeg',mime:'image/jpeg',
    sha256:'01509443e621bbc8b62de7c34f9ab1de6b7a5f1efa9961ef111a698d86aa8834',
    reference_image_approved:true,approval_source:'designer_confirmation',physical_verified:false,
  }),
  'wool-felt-01':Object.freeze({
    verified:true,file:'IMG_1786.jpeg',mime:'image/jpeg',
    sha256:'89f52a230fc1f2f8c9a8b238c71a8bc1242366256672f880e5a4845e1da13103',
    reference_image_approved:true,approval_source:'designer_confirmation',physical_verified:false,
  }),
  cork:Object.freeze({
    verified:true,file:'IMG_1723.jpeg',mime:'image/jpeg',
    sha256:'7c87d3e305cbfa71dde7be38b6cd06d998fc408888aa0875b917e931ade251b5',
    reference_image_approved:true,approval_source:'designer_confirmation',physical_verified:false,
  }),
});

/**
 * Load the existing Material Library image as a generation input.
 * This is a visual library asset, not a claim that the file is a physical sample photo.
 */
export async function loadMaterialLibraryGenerationImage(materialId,{records=libraryInputs.records,read=readFile,scope='living-room:universal'}={}) {
  const matches=records.filter(record=>record.materialId===materialId);
  const entry=matches[0];
  const material=MATERIALS[materialId];
  const match=libraryInputs.scope.includes(scope)&&matches.length===1&&entry&&material&&entry.path===material.imageSrc&&
    /^\/materials\/[a-zA-Z0-9._-]+\.(?:png|jpg|jpeg)$/i.test(entry.path)&&
    entry.physicalVerified===false&&entry.sourceKind==='material-library-image'&&
    libraryInputs.approvalStatus==='approved_for_generation_input'&&libraryInputs.approvalSource==='designer_instruction'&&
    entry.approvalScope?.includes(scope)&&
    /^[a-f0-9]{64}$/.test(entry.sha256||'')&&
    entry.mime===(entry.path.toLowerCase().endsWith('.png')?'image/png':'image/jpeg');
  if(!match)throw Object.assign(new Error(`Material Library image unavailable for ${materialId}.`),{
    code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
  });

  let bytes;
  try {
    bytes=await read(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ process.cwd(),'public',entry.path.slice(1)));
  } catch {
    throw Object.assign(new Error(`Material Library image cannot be read for ${materialId}.`),{
      code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
    });
  }
  const png=Buffer.from([137,80,78,71,13,10,26,10]);
  const valid=Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=10*1024*1024&&
    (entry.mime==='image/png'?bytes.subarray(0,8).equals(png):bytes[0]===255&&bytes[1]===216&&bytes[2]===255)&&
    createHash('sha256').update(bytes).digest('hex')===entry.sha256;
  if(!valid)throw Object.assign(new Error(`Invalid Material Library image bytes for ${materialId}.`),{
    code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
  });

  try {
    const {default:sharp}=await import('sharp');
    const image=sharp(bytes,{limitInputPixels:64_000_000,failOn:'error'});
    const metadata=await image.metadata();
    if(metadata.format!==(entry.mime==='image/png'?'png':'jpeg')||!metadata.width||!metadata.height||
      metadata.width>8000||metadata.height>8000||(metadata.pages||1)!==1)throw new Error('Invalid image metadata.');
    await image.raw().toBuffer();
  } catch {
    throw Object.assign(new Error(`Invalid Material Library image for ${materialId}.`),{
      code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
    });
  }
  return {materialId,path:entry.path,mime:entry.mime,sha256:entry.sha256,
    sourceKind:entry.sourceKind,approvalSource:libraryInputs.approvalSource,
    approvalScope:[...entry.approvalScope],physicalVerified:false,
    data:`data:${entry.mime};base64,${bytes.toString('base64')}`};
}

export async function loadMaterialReferenceImages(materials, {
  references=VERIFIED_MATERIAL_REFERENCES,
  read=readFile,
}={}) {
  if (!Array.isArray(materials) || materials.length!==3) {
    throw Object.assign(new Error('Three verified material references are required.'),{code:'MATERIAL_REFERENCE_UNAVAILABLE'});
  }
  const unavailable=materials.filter(material=>!Object.hasOwn(references,material.materialId) ||
    references[material.materialId]?.verified!==true).map(material=>material.materialId);
  if (unavailable.length) {
    throw Object.assign(new Error('Verified material references are unavailable.'),{
      code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:unavailable,
    });
  }
  const result=[];
  for (const {materialId} of materials) {
    result.push(await loadMaterialReferenceImage(materialId,{references,read}));
  }
  return result;
}

export async function loadMaterialReferenceImage(materialId,{references=VERIFIED_MATERIAL_REFERENCES,read=readFile}={}) {
  const entry=Object.hasOwn(references,materialId) ? references[materialId] : null;
  if (!entry || entry.verified!==true || !/^[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg)$/i.test(entry.file) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256 || '') ||
      !['image/png','image/jpeg'].includes(entry.mime)) {
    throw Object.assign(new Error(`Verified reference unavailable for ${materialId}.`),{
      code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
    });
  }
  let bytes;
  try {
    bytes=await read(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ process.cwd(),'public','materials','reference-samples',entry.file));
  }
  catch {throw Object.assign(new Error(`Reference image cannot be read for ${materialId}.`),{
    code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
  });}
  const png=Buffer.from([137,80,78,71,13,10,26,10]);
  const valid=Buffer.isBuffer(bytes) && bytes.length>0 && bytes.length<=10*1024*1024 &&
    (entry.mime==='image/png' ? bytes.subarray(0,8).equals(png)
      : bytes[0]===255 && bytes[1]===216 && bytes[2]===255);
  if (!valid || createHash('sha256').update(bytes).digest('hex')!==entry.sha256) {
    throw Object.assign(new Error(`Invalid reference image for ${materialId}.`),{
      code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
    });
  }
  try {
    const {default:sharp}=await import('sharp');
    const image=sharp(bytes,{limitInputPixels:64_000_000,failOn:'error'});
    const metadata=await image.metadata();
    if (metadata.format!==(entry.mime==='image/png'?'png':'jpeg') ||
        !metadata.width || !metadata.height || metadata.width>8000 || metadata.height>8000 ||
        Math.max(metadata.width,metadata.height)/Math.min(metadata.width,metadata.height)>10 ||
        (metadata.pages || 1)!==1) {
      throw new Error('Image format mismatch.');
    }
    await image.raw().toBuffer();
  } catch {
    throw Object.assign(new Error(`Invalid reference image for ${materialId}.`),{
      code:'MATERIAL_REFERENCE_UNAVAILABLE',materialIds:[materialId],
    });
  }
  return `data:${entry.mime};base64,${bytes.toString('base64')}`;
}
