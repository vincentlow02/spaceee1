import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareDirectMaterialGeneration} from './directMaterialGenerationV1.mjs';
import {getMaterialPromptV1} from './materialPromptsV1.js';
import {SPACE_TYPES} from './spaceTypes.js';
import {executeDirectMaterialGeneration} from './directMaterialGenerationExecution.js';
import {GenerationRequestValidationError,prepareGenerationRequest} from './generationRequest.js';
import {buildGenerationResponsePayload} from './generationResponse.js';
import {MATERIALS} from '../../lib/materials/materials.js';
import {loadMaterialLibraryGenerationImage} from './materialReferenceImages.js';

test('Bedroom with Cork, Jute and Wool Felt uses the same four-image request in any selection order',async()=>{
  const ids=['wool-felt-01','jute','cork'];
  const result=await prepareDirectMaterialGeneration({spaceType:'bedroom',materialIds:ids});
  assert.equal(result.status,'ready');
  assert.equal(result.imageManifest[0].path,'/images/space-bases/bedroom-furnished-v1.png');
  assert.deepEqual(result.imageManifest.map(x=>x.path),[
    '/images/space-bases/bedroom-furnished-v1.png',
    '/materials/cork-01.jpg',
    '/materials/jute.jpg',
    '/materials/wool-felt-01.png',
  ]);
  assert.equal(result.allocation,undefined);
  assert.equal(result.request.model,'qwen-image-2.1-turbo');
  assert.deepEqual(result.request.parameters,{n:1,size:'1536*1024',prompt_extend:false,watermark:false});
  assert.match(result.prompt,/Target 1: Bed headboard/);
  const reversed=await prepareDirectMaterialGeneration({spaceType:'bedroom',materialIds:[...ids].reverse()});
  assert.equal(reversed.promptSha256,result.promptSha256);
  assert.deepEqual(reversed.imageManifest,result.imageManifest);
});

test('direct request passes through the existing authenticated inline lifecycle once',async()=>{
  const ids=['natural-rubber-01','bamboo-slat-01','acrylic-sheet-01'];
  const snapshot={spaceType:'living-room',sessionId:'test',createdAt:'2026-10-25T00:00:00.000Z',status:'captured',materials:ids.map((materialId,index)=>({materialId,position:index+1,priority:index+1,confidence:1}))};
  let providerCalls=0,quotaCalls=0;
  const response=await executeDirectMaterialGeneration(new Request('http://localhost/api/generate-space',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot})}),{
    GenerationRequestValidationError,prepareGenerationRequest,buildGenerationResponsePayload,
    verifiedGuest:async()=>({user:{id:'test'},supabase:{rpc:async()=>{quotaCalls++;return {data:true,error:null};}}}),
    prepareDirectMaterialGeneration:s=>prepareDirectMaterialGeneration({spaceType:s.spaceType,materialIds:s.materials.map(m=>m.materialId)}),
    generateQwenImage:async(_prompt,_trace,_space,_images,options)=>{providerCalls++;assert.equal(options.request.input.messages[0].content.length,5);return {imageUrl:'https://example.test/image.png'};},
  });
  assert.equal(response.status,200);
  assert.equal(providerCalls,1);
  assert.equal(quotaCalls,1);
});

test('furniture-only prompts bind each approved reference to its image across all six spaces',async()=>{
  const ids=Object.keys(MATERIALS);
  const targets={
    'living-room':['Main sofa upholstery','Independent sofa cushions','Right storage sideboard'],
    bedroom:['Bed headboard','Main bedding','Left storage dresser'],
    'tea-room':['Central low tea table','Floor cushions','Right floor lamp'],
    'personal-lounge':['Left work desk','Main lounge chair','Low storage shelf'],
    studio:['Main worktable','Central divider shelf','Right built-in storage cabinet'],
    bathroom:['Bathtub front panel','Wall-mounted open shelf','Bathroom textile set'],
  };
  for(const {id} of SPACE_TYPES){
    for(let i=0;i<ids.length;i+=3){
      const result=await prepareDirectMaterialGeneration({spaceType:id,materialIds:ids.slice(i,i+3)});
      assert.equal(result.status,'ready',JSON.stringify(result.blockers));
      assert.equal(result.version,'furniture-only-material-application-v3');
      const section=result.prompt.split('DESIGNATED FURNITURE TARGETS:\n')[1].split('\n\nMATERIAL REFERENCES:')[0];
      assert.equal((section.match(/^Target [123]:/gm)||[]).length,3);
      targets[id].forEach((target,index)=>assert.ok(section.includes(`Target ${index+1}: ${target}`)));
      assert.doesNotMatch(result.prompt,/\{(?:TARGET|MATERIAL)/);
      assert.match(result.prompt,/Use Image 2, Image 3 and Image 4 exactly once each/);
      assert.match(result.prompt,/Keep these pairs fixed for the entire edit/);
      assert.match(result.prompt,/surfaces outside the designated edit areas retain their original appearance/);
      const content=result.request.input.messages[0].content;
      assert.equal(content.length,5);
      assert.equal(content[4].text,result.prompt);
      for(const [index,entry] of result.imageManifest.entries()){
        assert.equal(createHash('sha256').update(Buffer.from(content[index].image.split(',')[1],'base64')).digest('hex'),entry.sha256);
        if(index){
          assert.ok(entry.approvalScope.includes(`${id}:universal`));
          const material=MATERIALS[entry.materialId];
          assert.ok(result.prompt.includes(`Image ${index+1} — ${material.name} (Material ID: ${entry.materialId})\n${getMaterialPromptV1(entry.materialId).prompt}`));
        }
      }
    }
  }
});

test('unauthorized scopes and invalid materials fail before a provider request',async()=>{
  await assert.rejects(()=>loadMaterialLibraryGenerationImage('jute',{scope:'unapproved:universal'}),{code:'MATERIAL_REFERENCE_UNAVAILABLE'});
  assert.equal((await prepareDirectMaterialGeneration({spaceType:'living-room',materialIds:['jute','jute','cork']})).status,'unsupported');
});
