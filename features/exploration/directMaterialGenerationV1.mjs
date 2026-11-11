import {createHash} from 'node:crypto';
import {MATERIALS} from '../../lib/materials/materials.js';
import {buildQwenImageEditRequest} from '../../lib/qwenImageRequest.js';
import {loadSpaceBaseImageWithMetadata} from '../../lib/spaceBaseImageCore.js';
import {getSpaceType} from './spaceTypes.js';
import {getMaterialPromptV1,MATERIAL_PROMPTS_VERSION_V1} from './materialPromptsV1.js';
import {loadMaterialLibraryGenerationImage} from './materialReferenceImages.js';
import libraryInputs from './materialLibraryGenerationInputsV1.json' with {type:'json'};

export const DIRECT_MATERIAL_GENERATION_VERSION='furniture-only-material-application-v3';
const bases={
  'living-room':'/images/space-bases/livingroom-furnished-neutral.png',
  bedroom:'/images/space-bases/bedroom-furnished-v1.png',
  'tea-room':'/images/space-bases/tea-room-furnished-v1.png',
  'personal-lounge':'/images/space-bases/personal-lounge-furnished-v1.png',
  studio:'/images/space-bases/studio-furnished-v1.png',
  bathroom:'/images/space-bases/bathroom-furnished-v1.png',
};

// Each target names an editable surface on the furnished base and where the edit stops.
const targets={
  'living-room':[
    'Main sofa upholstery: the left sofa seat, fixed back upholstery and upholstered arms. Stop at the edges of the two loose throw pillows and the wooden base.',
    'Independent sofa cushions: the covers of the two loose throw pillows only. Keep both pillows in place, with their own silhouettes visible against the sofa.',
    'Right storage sideboard: the visible cabinet door fronts only. Preserve the door seams, top, sides and legs.',
  ],
  bedroom:[
    'Bed headboard: the exposed front face behind the pillows, within the existing headboard outline. Keep the pillows in front of it.',
    'Main bedding: one broad existing cover on the bed, such as the duvet cover or bedspread. Preserve the folds, pillows and all other bedding layers.',
    'Left storage dresser: the visible drawer faces below the top. Keep the drawer seams, top and objects on it intact.',
  ],
  'tea-room':[
    'Central low tea table: one visible surface of the existing round top, edge or pedestal. Keep the tea set and the tatami unchanged.',
    'Floor cushions: the fabric covers of all three existing floor cushions, as one group. Keep the cushions separate and stop at their edges.',
    'Right floor lamp: one visible surface of the existing shade or exterior frame. Keep the lamp silhouette, glow and surrounding wall and shoji unchanged.',
  ],
  'personal-lounge':[
    'Left work desk: the desktop and its front edge below the monitor. Keep the desk objects and the two floating shelves above it unchanged.',
    'Main lounge chair on the right: the exposed upholstery of the chair or its matching footrest. Preserve the loose cushion, throw and nearby side table.',
    'Low storage shelf: the freestanding cubby unit between the door and window. Edit only visible shelf faces or side panels within its outer frame, keeping books and objects unchanged.',
  ],
  studio:[
    'Main worktable: the visible tabletop within its existing edge. Keep the legs, chairs and desktop objects unchanged.',
    'Central divider shelf: one visible face of the freestanding divider, such as its outer side panel. Stop at its outline and keep its openings and contents unchanged.',
    'Right built-in storage cabinet: only the lower cabinet door faces beneath the countertop and horizontal window. Keep the countertop, glazing and upper wood panels above the window unchanged.',
  ],
  bathroom:[
    'Bathtub front panel: only the outward-facing vertical apron below the rim, where appropriate. Keep the top rim, basin interior and adjacent floor unchanged.',
    'Wall-mounted open shelf on the right: one visible exterior face of the wooden shelf unit, within its outline. Keep the wall tile, towels, basket and plumbing unchanged.',
    'Bathroom textile set: the exposed fabric of the existing hanging towel on the left. Preserve its folds, silhouette and rail, and leave the floor mat unchanged.',
  ],
};

export async function prepareDirectMaterialGeneration({spaceType,materialIds}={}) {
  if(!getSpaceType(spaceType)||!Array.isArray(materialIds)||materialIds.length!==3||
    new Set(materialIds).size!==3||materialIds.some(id=>typeof id!=='string'||!Object.hasOwn(MATERIALS,id))) {
    return {status:'unsupported',blockers:[{code:'invalid_space_or_materials'}]};
  }
  const ids=[...materialIds].sort();
  const scope=`${spaceType}:universal`;
  const missing=ids.filter(id=>{
    const records=libraryInputs.records.filter(row=>row.materialId===id);
    return !libraryInputs.scope.includes(scope)||records.length!==1||!records[0].approvalScope?.includes(scope);
  });
  if(missing.length)return {status:'needs_review',blockers:missing.map(materialId=>({materialId,code:'scoped_reference_missing'}))};

  let images;
  try {images=await Promise.all(ids.map(id=>loadMaterialLibraryGenerationImage(id,{scope})));}
  catch(error) {return {status:'needs_review',blockers:[{code:'material_reference_unavailable',materialIds:error.materialIds}]};}
  let base;
  try {
    base=await loadSpaceBaseImageWithMetadata(spaceType,{path:bases[spaceType],mime:'image/png'});
    const match=/^data:image\/png;base64,(.+)$/.exec(base.data);
    if(base.path!==bases[spaceType]||!match)throw new Error('Invalid base');
    const {default:sharp}=await import('sharp');
    const image=sharp(Buffer.from(match[1],'base64'),{limitInputPixels:64_000_000,failOn:'error'});
    const metadata=await image.metadata();
    if(metadata.format!=='png'||!metadata.width||!metadata.height||(metadata.pages||1)!==1)throw new Error('Invalid base');
    await image.raw().toBuffer();
  } catch {return {status:'needs_review',blockers:[{code:'base_image_unavailable'}]};}

  const materialBlocks=images.map(({materialId},index)=>{
    const identity=getMaterialPromptV1(materialId)?.prompt;
    if(!identity)throw new Error(`Material prompt missing for ${materialId}.`);
    return `Image ${index+2} — ${MATERIALS[materialId].name} (Material ID: ${materialId})\n${identity}`;
  });
  const prompt=[
    'Edit Image 1 by applying the three reference materials to three separate furniture surfaces. Use Image 1 as the fixed room composition. Preserve its camera, architecture, lighting and layout, and keep the outlines, positions, seams and contents of all existing objects.',
    `ROOM: ${spaceType}`,
    `DESIGNATED FURNITURE TARGETS:\n${targets[spaceType].map((target,index)=>`Target ${index+1}: ${target}`).join('\n')}`,
    `MATERIAL REFERENCES:\n${materialBlocks.join('\n\n')}`,
    `MATERIAL APPLICATION:
1. Before rendering, decide three pairs internally: Target 1 → one reference, Target 2 → one reference, Target 3 → one reference. Use Image 2, Image 3 and Image 4 exactly once each. Choose the pairing using the actual reference appearances, material forms and target surfaces. Keep these pairs fixed for the entire edit.
2. Render each pair as a separate surface edit. Replace the original finish across enough of the specified visible surface for the assigned reference to be identifiable in the full-room view. Use its actual color, pattern scale, texture, reflectivity and transparency. Keep the three appearances distinct. Follow existing contours and stop at the stated boundary, including where objects touch or overlap. A named group receives its assigned material only on the listed members.
3. Check the full frame before returning it: each target visibly shows its own reference, no reference is repeated on another target, and surfaces outside the designated edit areas retain their original appearance. Preserve all original furnishings and their positions, including pillows, layers and objects that partly cover the edited surface.
Use the references as visual finishes only. Do not infer water, heat, fire, slip or structural performance. Keep materials without verified properties away from prolonged immersion, direct spray, heat and slippery or load-bearing applications. If a reasonable application cannot be established, do not invent material performance.
Return only the edited room image, with no assignment text, labels, samples or added objects.`,
  ].join('\n\n');
  const request=buildQwenImageEditRequest(prompt,base.data,undefined,spaceType,images.map(image=>image.data));
  return {status:'ready',version:DIRECT_MATERIAL_GENERATION_VERSION,prompt,request,
    promptSha256:createHash('sha256').update(prompt).digest('hex'),materialPromptVersion:MATERIAL_PROMPTS_VERSION_V1,
    spacePromptVersion:'furniture-only-targets-v2',
    imageManifest:[{role:'space_base',path:base.path,sha256:base.sha256},...images.map(({materialId,path,sha256,mime,sourceKind,approvalScope,approvalSource,physicalVerified})=>({role:'material_reference',materialId,path,sha256,mime,sourceKind,approvalScope,approvalSource,physicalVerified}))]};
}
