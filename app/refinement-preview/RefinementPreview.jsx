'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import RefinementExperience from '@/components/refinement/RefinementExperience';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';

const MOCK_MATERIALS = [{id:'oak',name:'Oak',image:'/prototypes/refinement/oak.png'},{id:'cork',name:'Cork',image:'/prototypes/refinement/cork.png'},{id:'acrylic',name:'Acrylic',image:'/prototypes/refinement/acrylic.png'}];
const MOCK_RESULT = {imageUrl:'/prototypes/refinement/space.png',alt:'Reference reading space with natural light, an armchair and shelving — mock result',description:'A calm reading space with warm natural light, using oak, cork and acrylic materials.',generatedLabel:'Generated 2 minutes ago',timeLabel:'2 min ago'};

export default function RefinementPreview({headingClassName,navigationFontClassName}) {
  const [activeSection,setActiveSection] = useState('home');
  const [materials,setMaterials] = useState(MOCK_MATERIALS);
  const [requirement,setRequirement] = useState('');
  const [notice,setNotice] = useState('');
  const [fullView,setFullView] = useState(false);
  function handleRefine(text) { setNotice(`Prototype only — refinement received: “${text}”. No generation request was sent.`); setRequirement(''); }
  function handleDownload(result) { const link = document.createElement('a'); link.href = result.imageUrl; link.download = 'spacee-reference-prototype.png'; link.click(); setNotice('Downloaded the reference prototype image, not an AI result.'); }
  return <div className={navigationFontClassName}><WorkspaceShell activeSection={activeSection} onNavigate={setActiveSection} contentLayout="canvas">
    <div hidden={activeSection !== 'home'}>
    <RefinementExperience materials={materials} initialRequest="Create a calm reading space with warm natural light." result={MOCK_RESULT} version={1} requirement={requirement} onRequirementChange={setRequirement} onRefine={handleRefine} onDownload={handleDownload} onFullView={() => setFullView(true)} onRemoveMaterial={id => {setMaterials(current => current.filter(material => material.id !== id)); setNotice('Mock context updated. The reference image has not changed.');}} onContextOptions={() => setNotice('Prototype context — material editing and request history are not connected yet.')} onAttach={() => setNotice('Reference attachment is a placeholder in this UI prototype. No file was uploaded.')} headingClassName={headingClassName} notice={notice}/>
    </div>
    {activeSection !== 'home' && <section className="mx-auto mt-20 max-w-xl"><h1 className={`${headingClassName} text-4xl capitalize`}>{activeSection}</h1><p className="mt-4 text-sm text-spacee-muted">This section is a placeholder in the UI prototype.</p><button className="mt-6 rounded-lg bg-black px-4 py-2 text-sm text-white" onClick={() => setActiveSection('home')}>Back to Refine</button></section>}
    <Dialog.Root open={fullView} onOpenChange={setFullView}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/75"/><Dialog.Content className="fixed inset-4 z-50 flex flex-col items-center justify-center rounded-xl bg-white p-4 outline-none"><Dialog.Title className="sr-only">Reference space — full view</Dialog.Title><Dialog.Description className="sr-only">Mock prototype image, not a generated AI result.</Dialog.Description><img src={MOCK_RESULT.imageUrl} alt={MOCK_RESULT.alt} className="max-h-[85vh] max-w-full rounded-lg object-contain"/><Dialog.Close className="absolute top-3 right-4 rounded-full bg-white px-3 py-1 text-xl" aria-label="Close full view">×</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </WorkspaceShell></div>;
}
