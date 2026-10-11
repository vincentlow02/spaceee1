import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildQwenImageEditRequest } from './qwenImageRequest.js';
import { SPACE_BASE_IMAGE } from '../features/exploration/spatialTemplate.js';
import { prepareGenerationRequest } from '../features/exploration/generationRequest.js';

const snapshot = {
  status:'captured',sessionId:'base-image-test',
  materials:['coke-can','blackcan','tissue'].map((materialId,index)=>({position:index+1,priority:index+1,materialId})),
};

test('the fixed base PNG is valid and matches the configured spatial aspect ratio', async () => {
  const image = await readFile(new URL('../public/images/space-base.png',import.meta.url));
  assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.ok(image.length < 10 * 1024 * 1024);
  assert.equal(image.readUInt32BE(16),SPACE_BASE_IMAGE.width);
  assert.equal(image.readUInt32BE(20),SPACE_BASE_IMAGE.height);
  const [width,height]=SPACE_BASE_IMAGE.outputSize.split('*').map(Number);
  assert.equal(width/height,SPACE_BASE_IMAGE.width/SPACE_BASE_IMAGE.height);
});

test('every image edit request sends the base PNG and exactly one rebuilt prompt', async () => {
  const bytes = await readFile(new URL('../public/images/space-base.png',import.meta.url));
  const image = `data:image/png;base64,${bytes.toString('base64')}`;
  const prepared=prepareGenerationRequest({snapshot,prompt:'client replacement',baseImage:'client replacement'});
  const request=buildQwenImageEditRequest(prepared.promptResult.prompt,image);
  assert.equal(request.model,'qwen-image-3.0');
  assert.equal(request.input.messages.length,1);
  assert.deepEqual(request.input.messages[0].content,[{image},{text:prepared.promptResult.prompt}]);
  assert.ok(!prepared.promptResult.prompt.includes('client replacement'));
  assert.equal(request.parameters.size,'1280*960');
  assert.equal(request.parameters.prompt_extend,false);
  assert.equal(request.parameters.enable_thinking,false);
  assert.equal(request.parameters.n,1);
});

test('rejects a text-only model instead of silently dropping the spatial base', () => {
  assert.throws(()=>buildQwenImageEditRequest('Edit the base','data:image/png;base64,AA==','qwen-image-plus'),error=>error.code==='INVALID_IMAGE_EDIT_MODEL');
});

test('rejects a missing base image before submitting to Qwen', () => {
  assert.throws(()=>buildQwenImageEditRequest('Edit the base',null),error=>error.code==='INVALID_IMAGE_EDIT_INPUT');
});
