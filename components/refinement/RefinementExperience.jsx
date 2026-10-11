'use client';

/* All domain data and actions are supplied by the parent. No recognition or API calls. */
/* eslint-disable @next/next/no-img-element */
import { useEffect,useRef,useState } from 'react';
import { motion,useReducedMotion } from 'motion/react';
import CurrentContext from './CurrentContext';
import RefinementInput from './RefinementInput';
import RefinementIcon from './RefinementIcon';
import styles from './RefinementExperience.module.css';

function SpacePreview({result,version,status,error,onRetry,onFullView,onDownload}) {
  const [loaded,setLoaded] = useState(false);
  const [failed,setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const reduced = useReducedMotion();
  const imageRef = useRef(null);
  useEffect(() => {
    // Cached images may finish before React attaches the load listener.
    if (!imageRef.current?.complete || !imageRef.current.naturalWidth) return;
    const frame = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(frame);
  },[]);
  return <section className={styles.preview} aria-label="Current space result">
    <div className={`${styles.imageStage} ${status === 'generating' ? styles.generatingStage : ''}`}>
      {status === 'generating' && <div className={styles.generatingMessage} role="status"><span className={styles.generatingMark} aria-hidden="true"><i/><i/><i/></span><span>Generating your space</span></div>}
      {status === 'error' && <div className={styles.errorMessage} role="alert"><p>{error || 'Generation failed. Please try again.'}</p><button type="button" onClick={onRetry}>Try again</button></div>}
      {result.imageUrl && !failed && <motion.img key={`${result.imageUrl}-${attempt}`} ref={imageRef} src={result.imageUrl} alt={result.alt} className={styles.image} initial={{opacity:0,filter:reduced ? 'blur(0px)' : 'blur(24px)',scale:reduced ? 1 : .98}} animate={loaded ? {opacity:1,filter:'blur(0px)',scale:1} : {opacity:0}} transition={{duration:reduced ? 0 : 2.8,ease:[.22,1,.36,1]}} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/>}
      {failed && <div className={styles.errorMessage} role="alert"><p>Preview image could not load.</p><button type="button" onClick={() => {setFailed(false); setLoaded(false); setAttempt(current => current + 1);}}>Reload image</button></div>}
    </div>
    <footer className={styles.imageFooter}><div><h2 className="text-sm font-semibold">Version {String(version).padStart(2,'0')}</h2><p className="mt-0.5 text-xs text-[#8990aa]">{status === 'generating' ? 'Generating…' : status === 'error' ? 'Generation paused' : result.generatedLabel}</p></div><div className="flex gap-2"><button className={styles.action} disabled={!result.imageUrl} onClick={() => onFullView(result)}><RefinementIcon type="expand"/>Full view</button><button className={styles.action} disabled={!result.imageUrl} onClick={() => onDownload(result)}><RefinementIcon type="download"/>Download</button></div></footer>
  </section>;
}

export default function RefinementExperience({materials,initialRequest,result,version,generationStatus = 'success',generationError,requirement,onRequirementChange,onRefine,onRetry,onDownload,onFullView,onRemoveMaterial,onContextOptions,onAttach,onExplore,headingClassName,notice}) {
  const generating = generationStatus === 'generating';
  return <section className={styles.page} aria-label="Space refinement">
    <header className={styles.header}><h1 className={headingClassName}>Refine your space</h1><p>Keep exploring with your materials through conversation.</p>{generating && <div className={styles.topGenerating} aria-hidden="true"><span/><span/><span/> GENERATING SPACE</div>}</header>
    <div className={styles.layout}>
      <SpacePreview key={`${version}-${result.imageUrl}`} result={result} version={version} status={generationStatus} error={generationError} onRetry={onRetry} onFullView={onFullView} onDownload={onDownload}/>
      <section className={styles.conversation} aria-label="Refine your space">
        <header className={styles.conversationHeader}><h2 className={headingClassName}>Refine your space</h2><p>Keep shaping the result through conversation.</p></header>
        <div className={styles.contextArea}><CurrentContext materials={materials} initialRequest={initialRequest} onRemoveMaterial={onRemoveMaterial} onContextOptions={onContextOptions}/>
          <article className="mt-4 rounded-2xl border border-[#e8e6e6] bg-white p-4" aria-label="Current version"><div className="flex items-start gap-3"><RefinementIcon type="sparkle" className="size-6 shrink-0"/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Spaceeee</h3><span className="text-xs text-[#8990aa]">{generating ? 'Now' : result.timeLabel}</span></div><p className="mt-1 text-xs leading-5 text-[#8990aa]">{generating ? 'Generating with your selected materials and request.' : generationStatus === 'error' ? 'Generation paused. Your context is preserved.' : 'Generated using your selected materials and request.'}</p>{result.imageUrl && <div className="mt-2 flex gap-3 rounded-xl bg-[#f7f7f7] p-1"><img src={result.imageUrl} alt="" className="w-[105px] shrink-0 rounded-lg object-cover"/><div className="py-1"><h4 className="text-xs font-semibold">Version {String(version).padStart(2,'0')}</h4><p className="mt-1 text-xs leading-5 text-[#858ba0]">{result.description}</p></div></div>}</div></div></article>
        </div>
        <div className="mt-auto pt-4"><RefinementInput value={requirement} onChange={onRequirementChange} onRefine={onRefine} onAttach={onAttach} disabled={generationStatus !== 'success'}/></div>
      </section>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[11px] text-spacee-muted"><p role="status">{notice || 'UI prototype · Reference image and mock data · No AI requests'}</p>{onExplore && <button type="button" onClick={onExplore} className="underline decoration-black/20 underline-offset-4 hover:text-spacee-ink">Explore new materials <span aria-hidden="true">→</span></button>}</div>
  </section>;
}
