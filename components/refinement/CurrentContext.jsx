/* eslint-disable @next/next/no-img-element */
import RefinementIcon from './RefinementIcon';

export default function CurrentContext({materials,initialRequest,onRemoveMaterial,onContextOptions}) {
  return <section className="rounded-2xl border border-[#e8e6e6] bg-[#faf9f8] p-4" aria-label="Current context">
    <div className="flex items-start gap-3"><RefinementIcon type="context" className="mt-1 size-5 shrink-0"/><div className="flex-1"><h3 className="text-sm font-semibold">Current context</h3><p className="mt-1 text-xs leading-5 text-[#858ba0]">These materials and your request guide the next result.</p></div><button type="button" aria-label="Context options" onClick={onContextOptions} className="rounded-md p-1 hover:bg-black/5"><RefinementIcon type="more"/></button></div>
    <ul className="mt-3 grid grid-cols-3 gap-2" aria-label="Selected materials">{materials.map(material => <li key={material.id} className="flex min-w-0 items-center gap-1.5 rounded-xl border border-[#e8e6e6] bg-white p-2">{material.image ? <img src={material.image} alt="" className="size-8 shrink-0 rounded-full object-cover"/> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ece9e5] text-[10px] font-medium" aria-hidden="true">{material.name.slice(0,1)}</span>}<span className="min-w-0 flex-1 truncate text-xs" title={material.name}>{material.name}</span><button type="button" className="shrink-0 rounded p-0.5 text-[#858ba0] hover:bg-black/5" aria-label={`Remove ${material.name}`} onClick={() => onRemoveMaterial?.(material.id)}><RefinementIcon type="close" className="size-3.5"/></button></li>)}</ul>
    {materials.length === 0 && <p className="mt-3 text-xs text-[#858ba0]">No materials selected.</p>}
    <p className="mt-3 rounded-xl bg-[#f0f1f2] px-4 py-3 text-sm leading-6">{initialRequest}</p>
  </section>;
}
