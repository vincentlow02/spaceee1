'use client';

/* Temporary Qwen URLs are displayed directly and downloaded through the server proxy. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { resolveTemporaryMaterialInformation } from '@/features/materials/temporaryMaterialInformation';
import { getMaterialPresentation } from '@/features/materials/materialPresentation';
import RefinementExperience from './RefinementExperience';

export default function LiveRefinementResult({generation,headingClassName,onRetry,onExplore}) {
  const initialMaterials = useMemo(() => generation.snapshot.materials.map(({materialId}) => {
    const material = resolveTemporaryMaterialInformation(materialId);
    return {id:materialId,name:material.name,image:getMaterialPresentation(materialId).imageSrc};
  }),[generation.snapshot]);
  const [materials,setMaterials] = useState(initialMaterials);
  const [requirement,setRequirement] = useState('');
  const [notice,setNotice] = useState('');
  const [fullView,setFullView] = useState(false);
  const downloadRef = useRef(null);
  const names = initialMaterials.map(material => material.name);
  const materialList = names.length > 1 ? `${names.slice(0,-1).join(', ')} and ${names.at(-1)}` : names[0];
  const initialRequest = generation.initialRequest || `Create a spatial interpretation from ${materialList}.`;
  const result = {
    imageUrl:generation.status === 'success' ? generation.imageUrl : '',
    alt:`Generated spatial interpretation using ${materialList}`,
    description:`A spatial interpretation using ${materialList}.`,
    generatedLabel:'Generated just now',
    timeLabel:'Just now',
  };

  useEffect(() => () => downloadRef.current?.abort(),[]);

  async function downloadImage() {
    if (downloadRef.current) return;
    const controller = new AbortController();
    downloadRef.current = controller;
    setNotice('Preparing download…');
    try {
      const response = await fetch('/api/download-space',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageUrl:generation.imageUrl}),signal:controller.signal});
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'The image could not be downloaded. Its temporary link may have expired.');
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = blob.type === 'image/jpeg' ? 'spacee-space.jpg' : blob.type === 'image/webp' ? 'spacee-space.webp' : 'spacee-space.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl),1000);
      setNotice('Download ready.');
    } catch (error) {
      if (error.name !== 'AbortError') setNotice(error.message || 'Download failed. Please try again.');
    } finally {
      if (downloadRef.current === controller) downloadRef.current = null;
    }
  }

  function handleRefine() {
    setNotice('Refinement was not sent because iterative image generation is not connected yet.');
  }

  const statusNotice = generation.status === 'generating'
    ? 'Generating your space…'
    : generation.status === 'error'
      ? generation.error || 'Generation failed. Please try again.'
      : 'Generated using the selected materials and request.';

  return <>
    <RefinementExperience materials={materials} initialRequest={initialRequest} result={result} version={1} generationStatus={generation.status} generationError={generation.error} requirement={requirement} onRequirementChange={setRequirement} onRefine={handleRefine} onRetry={onRetry} onDownload={downloadImage} onFullView={() => setFullView(true)} onRemoveMaterial={id => {setMaterials(current => current.filter(material => material.id !== id)); setNotice('Current context updated. The generated image has not changed.');}} onContextOptions={() => setNotice('The current context uses the three materials captured for this generation.')} onAttach={() => setNotice('Reference attachments are not connected yet.')} onExplore={onExplore} headingClassName={headingClassName} notice={notice || statusNotice}/>
    {result.imageUrl && <Dialog.Root open={fullView} onOpenChange={setFullView}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/75"/><Dialog.Content className="fixed inset-4 z-50 flex flex-col items-center justify-center rounded-xl bg-white p-4 outline-none"><Dialog.Title className="sr-only">Generated space — full view</Dialog.Title><Dialog.Description className="sr-only">The current AI-generated spatial interpretation.</Dialog.Description><img src={result.imageUrl} alt={result.alt} className="max-h-[85vh] max-w-full rounded-lg object-contain"/><Dialog.Close className="absolute top-3 right-4 rounded-full bg-white px-3 py-1 text-xl" aria-label="Close full view">×</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>}
  </>;
}
