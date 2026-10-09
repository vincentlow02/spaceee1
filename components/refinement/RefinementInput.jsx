'use client';

import TextareaAutosize from 'react-textarea-autosize';
import RefinementIcon from './RefinementIcon';

export default function RefinementInput({value,onChange,onRefine,onAttach,disabled = false}) {
  return <form className="flex items-end gap-2 rounded-2xl border border-[#e4e5e9] bg-white px-3 py-2" onSubmit={event => {event.preventDefault(); if (value.trim() && !disabled) onRefine(value.trim());}}>
    <label className="sr-only" htmlFor="refinement-request">Ask for a change</label>
    <TextareaAutosize id="refinement-request" value={value} onChange={event => onChange(event.target.value)} minRows={1} maxRows={4} maxLength={1000} placeholder="Ask for a change..." disabled={disabled} className="my-2 min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-6 outline-none placeholder:text-[#8990aa]"/>
    <button type="button" aria-label="Attach reference" onClick={onAttach} disabled={disabled} className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#596076] hover:bg-black/5"><RefinementIcon type="attach"/></button>
    <button type="submit" aria-label="Send refinement" disabled={disabled || !value.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#34363f] text-white hover:bg-black disabled:opacity-50"><RefinementIcon type="send" className="size-6"/></button>
  </form>;
}
