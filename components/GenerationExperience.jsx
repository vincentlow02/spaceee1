'use client';

/* Generated imagery is mounted only after the API succeeds. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import MaterialPhoto from './MaterialPhoto';
import GeneratedSpaceResult from './GeneratedSpaceResult';
import { getMaterialPresentation } from '@/features/materials/materialPresentation';
import { resolveTemporaryMaterialInformation } from '@/features/materials/temporaryMaterialInformation';
import styles from './GenerationExperience.module.css';

const PHASES = ['Interpreting material qualities', 'Exploring spatial compositions', 'Forming the final space'];
const REVEAL_SECONDS = 2.8;

export default function GenerationExperience({ generation, headingClassName, onRetry, onExplore }) {
  const [phase, setPhase] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [revealedUrl, setRevealedUrl] = useState(null);
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const [imageAttempt, setImageAttempt] = useState(0);
  const headingRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const hasImage = generation.status === 'success' && Boolean(generation.imageUrl);
  const imageDescription = generation.motionPreview ? 'Motion test graphic, not an AI-generated space' : 'Generated two-dimensional spatial concept composed from the three selected materials';
  const imageLoaded = hasImage && loadedUrl === generation.imageUrl;
  const imageReady = imageLoaded && revealedUrl === generation.imageUrl;
  const imageFailed = hasImage && failedImageUrl === generation.imageUrl;
  const failed = generation.status === 'error' || imageFailed;
  const currentPhase = hasImage ? 2 : phase;
  const materials = generation.snapshot.materials;
  const hasProductPhotos = materials.some(material => getMaterialPresentation(material.materialId).imageSrc);

  function regenerate() {
    setPhase(0);
    setLoadedUrl(null);
    setRevealedUrl(null);
    setFailedImageUrl(null);
    onRetry();
  }

  useEffect(() => { headingRef.current?.focus({preventScroll:true}); }, []);
  // Editorial waiting cues, not reported API stages or percentage progress.
  useEffect(() => {
    if (generation.status !== 'generating') return;
    const interval = setInterval(() => setPhase(current => Math.min(current + 1, PHASES.length - 1)), 7000);
    return () => clearInterval(interval);
  }, [generation.status]);

  if (imageReady && !failed) return <GeneratedSpaceResult generation={generation} headingClassName={headingClassName} onRegenerate={regenerate} onExplore={onExplore} onImageError={() => setFailedImageUrl(generation.imageUrl)} />;

  return <section className={styles.generationLayout} aria-label="Space generation" aria-busy={!failed && !imageReady} data-node-id="130:2">
    <aside className={styles.sidebar} data-node-id="133:55">
      <header className={styles.sidebarHeader} data-node-id="133:51">
        <h1 ref={headingRef} tabIndex={-1} className={headingClassName} data-node-id="130:14">{imageReady ? 'Your space is ready.' : failed ? 'Let’s try again.' : <>Shaping<br />the space</>}</h1>
        <p data-node-id="131:15">{imageReady ? 'A spatial possibility, composed from your materials.' : failed ? 'Your materials are saved. We can try once more.' : 'Interpreting your materials with AI'}</p>
      </header>
      <ol className={styles.progressSteps} aria-label="Generation waiting stages" data-node-id="132:27">
        {PHASES.map((label,index) => <li key={label} className={imageReady || index < currentPhase ? styles.completeStep : index === currentPhase && !failed ? styles.activeStep : ''} aria-current={!imageReady && !failed && index === currentPhase ? 'step' : undefined}>
          <span className={styles.stepDot} aria-hidden="true" /><span>{label}</span>
        </li>)}
      </ol>
      <div className={styles.materialStudy} data-node-id="133:54">
        {!hasProductPhotos && <img className={styles.materialSlots} src="/figma/generation-material-slots.svg" width="167" height="35" alt="" data-node-id="132:22" />}
        <ol className={styles.materialSwatches} aria-label="Captured materials">
          {materials.map(material => <li key={material.position}>
            {hasProductPhotos && <div className={styles.swatchPhoto}><MaterialPhoto key={material.materialId} materialId={material.materialId} className={styles.productPhoto} placeholderClassName={styles.swatchPlaceholder} /></div>}
            <span title={resolveTemporaryMaterialInformation(material.materialId).name}>{resolveTemporaryMaterialInformation(material.materialId).name}</span>
          </li>)}
        </ol>
      </div>
      {failed && <button className={styles.backToMaterials} onClick={onExplore}>Back to materials <span aria-hidden="true">→</span></button>}
    </aside>

    <div className={`${styles.stage} ${styles.generationStage} ${imageLoaded ? styles.loaded : ''} ${imageReady ? styles.ready : ''} ${failed ? styles.failed : ''}`} data-node-id="130:10">
      <span className={styles.stageLabel} data-node-id="130:13">{generation.motionPreview ? 'MOTION TEST · NOT AI RESULT' : imageReady ? 'YOUR GENERATED SPACE' : failed ? 'GENERATION PAUSED' : 'GENERATING SPACE'}</span>
      {hasImage && <motion.img key={`${generation.imageUrl}-${imageAttempt}`} className={styles.generatedImage} src={generation.imageUrl} alt={imageDescription}
        initial={{opacity:0,filter:reducedMotion ? 'blur(0px)' : 'blur(24px)'}}
        animate={imageLoaded ? {opacity:1,filter:'blur(0px)'} : {opacity:0,filter:reducedMotion ? 'blur(0px)' : 'blur(24px)'}}
        transition={{duration:reducedMotion ? 0 : REVEAL_SECONDS,ease:[0.22,1,0.36,1]}}
        onLoad={() => {setLoadedUrl(generation.imageUrl); setFailedImageUrl(null);}}
        onError={() => setFailedImageUrl(generation.imageUrl)}
        onAnimationComplete={() => {if (imageLoaded) setRevealedUrl(generation.imageUrl);}} />}
      {failed && <div className={styles.status} role="alert"><p>{imageFailed ? 'Your space was generated, but the image could not load.' : generation.error || 'Generation failed. Please try again.'}</p><button className={styles.retry} onClick={imageFailed ? () => {setFailedImageUrl(null); setImageAttempt(current => current + 1);} : regenerate}>{imageFailed ? 'Reload image' : 'Try Again'}</button></div>}
      <span role="status" aria-live="polite" className={styles.srOnly}>{imageReady ? 'Your space is ready.' : failed ? '' : hasImage ? 'Revealing your space' : PHASES[phase]}</span>
    </div>

  </section>;
}
