import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {GENERATION_TRACE_HEADER,createGenerationId} from '../../../features/exploration/generationTrace.js';
import {prepareImagePersistenceContext} from '../../../features/exploration/imagePersistence.js';
import {loadMaterialLibraryGenerationImage} from '../../../features/exploration/materialReferenceImages.js';

const root=path.resolve(process.cwd());
const moduleUrl=relative=>pathToFileURL(path.join(root,relative)).href;
let authenticated=true;
let imageCalls=0;
let inlineJobs=new Map();
let quotaAllowed=true;
let providerError=null;
let persistenceEnabled=true;
let unavailableMaterialId=null;
let quotaCalls=0;
let lastProviderArguments=null;
let providerWait=null;
let saveImage=async ({generationId})=>({saved:true,historyVersionId:generationId,imageUrl:`/api/spaces/image?version=${generationId}`});

mock.module(moduleUrl('features/exploration/materialReferenceImages.js'),{
  exports:{loadMaterialLibraryGenerationImage:async(materialId,options)=>{
    if(materialId===unavailableMaterialId) {
      throw Object.assign(new Error('Reference unavailable.'),{materialIds:[materialId]});
    }
    return loadMaterialLibraryGenerationImage(materialId,options);
  }},
});
mock.module(moduleUrl('features/exploration/generationJobsRepository.js'),{
  exports:{persistentGenerationJobsEnabled:()=>false},
});
mock.module(moduleUrl('lib/supabase/server.js'),{
  exports:{verifiedGuest:async()=>{
    if (!authenticated) throw new Error('SESSION_UNAVAILABLE');
    return {user:{id:'test-owner'},supabase:{rpc:async()=>{quotaCalls++;return {data:quotaAllowed,error:null};}}};
  }},
});
mock.module(moduleUrl('lib/qwenImage.js'),{
  exports:{generateQwenImage:async(...args)=> {
    lastProviderArguments=args;
    imageCalls++;
    if(providerWait)await providerWait;
    if (providerError) throw Object.assign(new Error('Fake provider fault.'),{code:providerError});
    return {imageUrl:'https://dashscope-result-shanghai.oss-cn-shanghai.aliyuncs.com/fake.png',requestId:'fake-image-1'};
  }},
});

test('browser simulated direct material inline generation', {skip:!process.env.SPACEEE_BROWSER_SIMULATION_URL,timeout:90000},async()=>{
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const baseURL=process.env.SPACEEE_BROWSER_SIMULATION_URL;
  authenticated=true;quotaAllowed=true;providerError=null;persistenceEnabled=true;
  imageCalls=0;quotaCalls=0;inlineJobs=new Map();
  let release;
  providerWait=new Promise(resolve=>{release=resolve;});
  try {
    await page.addInitScript(()=>sessionStorage.setItem('spaceee-auth-prompt-dismissed','true'));
    await page.route('**/*',async route=>{
      const incoming=route.request();
      const url=new URL(incoming.url());
      if(url.pathname==='/api/generate-space'){
        const response=await POST(new Request(incoming.url(),{method:'POST',headers:incoming.headers(),body:incoming.postData()}));
        return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
      }
      if(url.pathname==='/api/spaces/image')return route.fulfill({path:path.join(root,'public/images/space-base.png'),contentType:'image/png'});
      if(url.pathname.startsWith('/api/spaces'))return route.fulfill({json:incoming.method()==='GET'?{spaces:[]}:{path:'owner/space/generation',ownerId:'11111111-1111-4111-8111-111111111111'}});
      if(url.pathname==='/auth/v1/signup'){
        const id='11111111-1111-4111-8111-111111111111';
        const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
        const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.signature`;
        return route.fulfill({json:{access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'test',user:{id,aud:'authenticated',role:'authenticated',is_anonymous:true}}});
      }
      if(url.origin===new URL(baseURL).origin)return route.continue();
      return route.abort();
    });
    await page.goto(baseURL+'/space-selection');
    await page.getByRole('button',{name:'Select Living Room',exact:true}).click();
    await page.locator('[data-selected="true"]').getByRole('button',{name:'Enter Space'}).click();
    for(const [index,name] of ['Jute','Cork','Wool Felt'].entries()){
      const position=index+1;
      await page.getByRole('button',{name:`Add material at position ${position}`,exact:true}).click();
      await page.getByLabel(`Select or drag ${name} to a material slot`,{exact:true}).getByRole('button',{name:`Use in position ${position}`,exact:true}).click();
    }
    await page.getByRole('button',{name:'Generate My Space'}).click();
    await page.getByRole('button',{name:'New Space',exact:true}).waitFor({state:'visible'});
    assert.equal(await page.getByRole('button',{name:'New Space',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Materials Library'}).isDisabled(),true);
    release();
    await page.getByRole('img',{name:/Generated spatial interpretation using/}).waitFor({state:'visible',timeout:30000});
    assert.equal(imageCalls,1);
    assert.match(lastProviderArguments[0],/DESIGNATED FURNITURE TARGETS/);
    assert.equal(lastProviderArguments[4].request.input.messages[0].content.length,5);
    await page.getByRole('button',{name:'End experience'}).click();
    await page.getByRole('button',{name:'Choose a space',exact:true}).waitFor({state:'visible'});
    assert.equal(await page.getByRole('button',{name:'Add material at position 1'}).count(),0);
  } finally {
    release?.();providerWait=null;
    await browser.close();
  }
});
mock.module(moduleUrl('lib/supabase/generationJobs.js'),{
  exports:{
    createVerifiedGenerationJobsRepository:async()=>({
      reserve:async job=>{
        if (inlineJobs.has(job.generationId)) return {reserved:false};
        inlineJobs.set(job.generationId,{
          ...job,owner_id:job.ownerId,status:'running',error_code:null,history_version_id:null,
        });
        return {reserved:true};
      },
      getForOwner:async(generationId,ownerId)=>{
        const job=inlineJobs.get(generationId);
        return job?.owner_id===ownerId?job:null;
      },
      appendEvents:async()=>({appended:0}),
      transition:async({generationId,status,errorCode})=>{
        const job=inlineJobs.get(generationId);
        if (!job) return {updated:false};
        Object.assign(job,{status,error_code:errorCode});
        return {updated:true};
      },
      markSaved:async({generationId,historyVersionId})=>{
        Object.assign(inlineJobs.get(generationId),{status:'saved',history_version_id:historyVersionId});
        return {saved:true};
      },
      linkHistoryVersion:async()=>({linked:true}),
    }),
  },
});
mock.module(moduleUrl('features/exploration/imagePersistence.js'),{
  exports:{
    persistGeneratedImage:input=>saveImage(input),
    serverImagePersistenceEnabled:()=>persistenceEnabled,
    prepareImagePersistenceContext,
  },
});

const {POST}=await import('./route.js');
const snapshot={
  sessionId:'route-test',createdAt:'2026-11-05T00:00:00.000Z',status:'captured',spaceType:'living-room',
  materials:['natural-rubber-01','bamboo-slat-01','wool-felt-01'].map((materialId,index)=>({
    position:index+1,priority:index+1,materialId,confidence:0.9,
  })),
};
function generationRequest(body=snapshotBody(),id=createGenerationId(),headers={}) {
  return new Request('http://localhost/api/generate-space',{
    method:'POST',
    headers:{'Content-Type':'application/json',[GENERATION_TRACE_HEADER]:id,...headers},
    body:JSON.stringify(body),
  });
}
function snapshotBody() {return {snapshot,persistence:{spaceId:createGenerationId(),version:1,title:'Test space',initialRequest:''}};}
async function responseJson(response) {return {response,body:await response.json()};}

test('direct inline sends V7 with four images and rejects unavailable references before quota',async()=>{
  authenticated=true;quotaAllowed=true;providerError=null;persistenceEnabled=true;
  imageCalls=0;quotaCalls=0;inlineJobs=new Map();
  const ids=['jute','cork','wool-felt-01'];
  try {
    for(const order of [ids,[...ids].reverse(),[ids[1],ids[2],ids[0]],[ids[1],ids[0],ids[2]],[ids[2],ids[0],ids[1]],[ids[2],ids[1],ids[0]]]) {
      const body=snapshotBody();
      body.snapshot={...snapshot,materials:order.map((materialId,index)=>({position:index+1,priority:index+1,materialId,confidence:0.9}))};
      const response=await POST(generationRequest(body));
      assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
      const request=lastProviderArguments[4].request;
      assert.equal(request.input.messages[0].content.length,5);
      assert.match(request.input.messages[0].content[4].text,/Edit Image 1 by applying the three reference materials/);
      assert.equal(lastProviderArguments[0],request.input.messages[0].content[4].text);
    }
    const beforeQuota=quotaCalls,beforeCalls=imageCalls,beforeJobs=inlineJobs.size;
    unavailableMaterialId='bamboo-slat-01';
    const rejected=await POST(generationRequest(snapshotBody()));
    const result=await rejected.json();
    assert.equal(rejected.status,422);
    assert.equal(result.errorCode,'DIRECT_MATERIAL_GENERATION_REVIEW_REQUIRED');
    assert.deepEqual(result.blockers,[{code:'material_reference_unavailable',materialIds:['bamboo-slat-01']}]);
    assert.equal(quotaCalls,beforeQuota);
    assert.equal(imageCalls,beforeCalls);
    assert.equal(inlineJobs.size,beforeJobs);
  } finally {
    unavailableMaterialId=null;
  }
});

test('inline route validates, authenticates and calls the deterministic fake provider once',async()=>{

  authenticated=true;
  imageCalls=0;
  quotaAllowed=true;
  providerError=null;
  inlineJobs=new Map();
  const id=createGenerationId();
  const {response,body}=await responseJson(await POST(generationRequest(snapshotBody(),id)));
  assert.equal(response.status,200);
  assert.equal(response.headers.get(GENERATION_TRACE_HEADER),id);
  assert.equal(body.requestId,'fake-image-1');
  assert.equal(body.serverPersisted,true);
  assert.equal(body.imageUrl,`/api/spaces/image?version=${id}`);
  assert.equal(inlineJobs.get(id).status,'saved');
  assert.equal(imageCalls,1);
});

test('inline route rejects invalid and oversized request bodies before provider work',async()=>{

  imageCalls=0;
  inlineJobs=new Map();
  const invalid=await POST(generationRequest({snapshot:{...snapshot,materials:snapshot.materials.slice(0,2)}}));
  assert.equal(invalid.status,400);
  assert.match((await invalid.json()).error,/exactly three materials/i);
  const oversized=await POST(generationRequest(snapshotBody(),createGenerationId(),{'Content-Length':'20000001'}));
  assert.equal(oversized.status,413);
  assert.equal(imageCalls,0);
});

test('new requests reject missing or unrecognized spaceType before any provider work',async()=>{

  imageCalls=0;
  const {spaceType:unused,...withoutType}=snapshot;
  assert.equal(unused,'living-room');
  for (const candidate of [withoutType,{...snapshot,spaceType:'invalid'}]) {
    const response=await POST(generationRequest({snapshot:candidate}));
    assert.equal(response.status,400);
  }
  assert.equal(imageCalls,0);
});

test('inline route authentication rejection does not invoke the image provider',async()=>{

  authenticated=false;
  imageCalls=0;
  inlineJobs=new Map();
  const response=await POST(generationRequest());
  assert.equal(response.status,401);
  assert.equal(imageCalls,0);
  authenticated=true;
});

test('inline generation ID is durable idempotency key and duplicate POST never repeats provider work',async()=>{

  authenticated=true;
  quotaAllowed=true;
  providerError=null;
  imageCalls=0;
  inlineJobs=new Map();
  const id=createGenerationId();
  const first=await POST(generationRequest(snapshotBody(),id));
  assert.equal(first.status,200);
  const duplicate=await responseJson(await POST(generationRequest(snapshotBody(),id)));
  assert.equal(duplicate.response.status,202);
  assert.equal(duplicate.body.generationId,id);
  assert.equal(duplicate.body.status,'saved');
  assert.equal(duplicate.body.reused,true);
  assert.equal(imageCalls,1);
});

test('concurrent inline submissions for one ID produce only one image',async()=>{

  authenticated=true;
  quotaAllowed=true;
  providerError=null;
  imageCalls=0;
  inlineJobs=new Map();
  const id=createGenerationId();
  const results=await Promise.all([
    POST(generationRequest(snapshotBody(),id)),
    POST(generationRequest(snapshotBody(),id)),
  ]);
  assert.deepEqual(results.map(result=>result.status).sort(),[200,202]);
  const reused=await results.find(result=>result.status===202).json();
  assert.equal(reused.generationId,id);
  assert.equal(reused.reused,true);
  assert.equal(imageCalls,1);
});

test('inline quota control rejects before planner or provider work',async()=>{

  authenticated=true;
  quotaAllowed=false;
  providerError=null;
  imageCalls=0;
  inlineJobs=new Map();
  const response=await POST(generationRequest());
  assert.equal(response.status,429);
  assert.equal(imageCalls,0);
  quotaAllowed=true;
});

test('inline route rejects missing persistence or configuration before provider work',async()=>{
  imageCalls=0;
  assert.equal((await POST(generationRequest({snapshot}))).status,400);
  persistenceEnabled=false;
  try {
    assert.equal((await POST(generationRequest())).status,503);
    assert.equal(imageCalls,0);
  } finally {persistenceEnabled=true;}
});

test('inline success waits for cloud saving and a save failure never returns the temporary image',async()=>{
  const originalSave=saveImage;
  let enteredSave;
  const saving=new Promise(resolve=>{enteredSave=resolve;});
  let failSave;
  const saveResult=new Promise((_,reject)=>{failSave=reject;});
  saveImage=()=>{enteredSave();return saveResult;};
  const id=createGenerationId();
  const requestBody=snapshotBody();
  imageCalls=0;
  try {
    const post=POST(generationRequest(requestBody,id));
    await saving;
    assert.equal(inlineJobs.get(id).status,'image_generated');
    const duplicate=await POST(generationRequest(requestBody,id));
    assert.equal(duplicate.status,202);
    assert.equal(imageCalls,1);
    failSave(Object.assign(new Error('Storage failed'),{code:'STORAGE_VERIFY_FAILED'}));
    const {response,body}=await responseJson(await post);
    assert.equal(response.status,503);
    assert.deepEqual(body,{status:'save_failed',errorCode:'STORAGE_VERIFY_FAILED'});
    assert.equal(inlineJobs.get(id).status,'save_failed');
  } finally {saveImage=originalSave;}
});

test('inline passes the selected type into provider and persisted history snapshot',async()=>{
  const originalSave=saveImage;
  let savedSnapshot;
  saveImage=async input=>{
    savedSnapshot=input.snapshot;
    return {saved:true,historyVersionId:input.generationId,imageUrl:`/api/spaces/image?version=${input.generationId}`};
  };
  try {
    const body=snapshotBody();
    body.snapshot={...snapshot,spaceType:'studio'};
    const response=await POST(generationRequest(body));
    assert.equal(response.status,200);
    assert.equal(savedSnapshot.spaceType,'studio');
    assert.equal(savedSnapshot.generationStrategy.promptVersion,'furniture-only-material-application-v3');
  } finally {saveImage=originalSave;}
});

test('inline provider timeout is durably marked needs_review and never retried',async()=>{

  authenticated=true;
  quotaAllowed=true;
  providerError='QWEN_TIMEOUT';
  imageCalls=0;
  inlineJobs=new Map();
  const id=createGenerationId();
  const {response,body}=await responseJson(await POST(generationRequest(snapshotBody(),id)));
  assert.equal(response.status,504);
  assert.equal(body.needsReview,true);
  assert.equal(inlineJobs.get(id).status,'needs_review');
  assert.equal(imageCalls,1);
  providerError=null;
  const duplicate=await POST(generationRequest(snapshotBody(),id));
  assert.equal(duplicate.status,202);
  assert.equal(imageCalls,1);
});

\r\n