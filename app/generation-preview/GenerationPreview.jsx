'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import GenerationExperience from '@/components/GenerationExperience';
import GeneratedSpaceResult from '@/components/GeneratedSpaceResult';
import { createExplorationSnapshot, createLiveRecognitionState } from '@/features/recognition/positionRecognition';
import homeStyles from '@/components/SpaceeHome.module.css';
import styles from './preview.module.css';

// Sample materials are explicitly labeled; real generation is user-triggered only.
const snapshot = createExplorationSnapshot(createLiveRecognitionState(
  ['coke-can','blackcan','tissue'].map((materialId,index) => ({position:index+1,materialId,status:'recognized',confidence:1}))
), {sessionId:'loading-design-preview',createdAt:'2026-10-02T00:00:00.000Z'});

export default function GenerationPreview({headingClassName}) {
  const router = useRouter();
  const [generation,setGeneration] = useState({status:'generating',snapshot});
  const [attempt,setAttempt] = useState(0);
  const [resultPreview,setResultPreview] = useState(true);
  const requestRef = useRef(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  async function generate() {
    if (requestRef.current) return;
    setResultPreview(false);
    const controller = new AbortController();
    requestRef.current = controller;
    setAttempt(current => current + 1);
    setGeneration({status:'generating',snapshot});
    try {
      const response = await fetch('/api/generate-space', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot}),signal:controller.signal});
      const result = await response.json();
      if (!response.ok || typeof result.imageUrl !== 'string' || !result.imageUrl.trim()) throw new Error(result.error || 'Generation failed. Please try again.');
      setGeneration({status:'success',snapshot,imageUrl:result.imageUrl});
    } catch (error) {
      if (error.name !== 'AbortError') setGeneration({status:'error',snapshot,error:error.message});
    } finally { if (requestRef.current === controller) requestRef.current = null; }
  }
  return <main className={`${homeStyles.page} ${styles.previewPage}`}>
    {resultPreview ? <GeneratedSpaceResult generation={{status:'success',snapshot,layoutPreview:true}} headingClassName={headingClassName} onRegenerate={() => {setResultPreview(false); setAttempt(current => current + 1); setGeneration({status:'generating',snapshot});}} onExplore={() => router.push('/')} /> : <GenerationExperience key={attempt} generation={generation} headingClassName={headingClassName} onRetry={generate} onExplore={() => router.push('/')} />}
  </main>;
}
