'use client';

/* eslint-disable @next/next/no-img-element */
import TextareaAutosize from 'react-textarea-autosize';
import MaterialPhoto from '../MaterialPhoto';
import { MATERIAL_DRAG_TYPE } from '@/features/materials/materialSelectionState';

const actionClass = 'inline-flex min-h-9 items-center justify-center gap-3 rounded-lg px-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spacee-muted disabled:cursor-not-allowed';

export default function MaterialComposer({materials,activePosition,onSelectPosition,onDropMaterial,onRemoveLibrary,requirement,onRequirementChange,onClear,onGenerate,canGenerate,canClear,hint = ''}) {
  const recognizedCount = materials.filter(entry => entry.material).length;
  const firstEmptyPosition = materials.find(entry => !entry.material)?.position;

  return <form className="w-full max-w-[720px] rounded-2xl border border-spacee-line bg-white p-4 text-spacee-ink transition-colors focus-within:border-[#c5beb7] max-[700px]:p-3" aria-label="Material and space composer" data-node-id="140:70" onSubmit={event => {event.preventDefault(); if (canGenerate) onGenerate();}}>
    <div className="grid w-full max-w-[324px] grid-cols-3 gap-3" aria-label="Three material positions" data-node-id="140:77">
      {materials.map(entry => {
        const recognized = Boolean(entry.material);
        const name = entry.material?.name;
        return <div key={entry.position} className="relative aspect-square w-full min-w-0" onDragOver={event => {if (event.dataTransfer.types.includes(MATERIAL_DRAG_TYPE)) {event.preventDefault(); event.dataTransfer.dropEffect = 'copy';}}} onDrop={event => {const id = event.dataTransfer.getData(MATERIAL_DRAG_TYPE); if (id) {event.preventDefault(); onDropMaterial?.(id,entry.position);}}}>
        <button type="button" className={`relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border bg-white p-1.5 transition-colors hover:bg-[#faf9f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spacee-muted ${activePosition === entry.position ? 'border-spacee-muted' : 'border-spacee-line'}`} aria-label={recognized ? `Position ${entry.position}: ${name}. Change placement.` : `Add material at position ${entry.position}`} aria-pressed={activePosition === entry.position} onClick={() => onSelectPosition(entry.position)}>
          {recognized ? <><span className="absolute top-1.5 left-2 text-[10px] text-spacee-muted">{entry.position}</span><div className="flex size-14 max-[380px]:size-10 items-center justify-center"><MaterialPhoto key={entry.material.id} material={entry.material} className="h-full w-full object-contain" placeholderClassName="text-center text-[10px] leading-tight text-spacee-muted" /></div><span className="max-w-full truncate text-[11px]">{name}</span></> : entry.position === firstEmptyPosition ? <span className="flex flex-col items-center gap-1 text-xs text-spacee-muted"><img src="/figma/workspace/add-material.svg" width="35" height="35" className="max-w-none" alt="" /><span>Add</span></span> : <span className="sr-only">Waiting for material</span>}
        </button>
        {entry.source === 'library' && <button type="button" className="absolute right-1 top-1 rounded bg-white px-1 text-xs" aria-label={`Remove Library material from Slot ${entry.position}`} title="Remove Library material and resume Camera" onClick={() => onRemoveLibrary?.(entry.position)}>×</button>}
        </div>;
      })}
    </div>
    <label className="sr-only" htmlFor="space-description">Describe the space you want to create</label>
    <TextareaAutosize id="space-description" className="mt-4 mb-3 block w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-spacee-ink shadow-none outline-none placeholder:text-[#b1a7a2] focus-visible:outline-none max-[700px]:text-base" value={requirement} onChange={event => onRequirementChange(event.target.value)} placeholder="Describe the space you want to create" maxLength={1000} minRows={1} maxRows={4} aria-describedby={requirement ? 'description-note' : undefined} data-node-id="140:119" />
    {requirement && <p id="description-note" className="mb-2 text-[10px] leading-4 text-spacee-muted">Draft note only — not sent to the image model yet.</p>}
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-[11px] leading-4 text-spacee-muted" role="status" aria-live="polite">{hint}<span className="sr-only">{recognizedCount} of 3 materials selected.</span></p>
      <div className="ml-auto flex gap-2" data-node-id="140:95">
        <button className={`${actionClass} border border-spacee-line bg-white hover:bg-[#faf9f7] disabled:opacity-40`} type="button" onClick={onClear} disabled={!canClear}>Clear All</button>
        <button className={`${actionClass} bg-black text-white hover:bg-[#333] disabled:opacity-50`} type="submit" disabled={!canGenerate}>Generate My Space<img src="/figma/workspace/generate-arrow.svg" width="10" height="9" className="max-w-none" alt="" /></button>
      </div>
    </footer>
  </form>;
}
