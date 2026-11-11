import data from './materialPromptsV1.data.json' with {type:'json'};

export const MATERIAL_PROMPTS_VERSION_V1=data.version;

const prompts=new Map(data.records.map(record=>[record.materialId,Object.freeze({...record})]));

export function getMaterialPromptV1(materialId) {
  return prompts.get(materialId) ?? null;
}
