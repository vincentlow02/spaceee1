'use client';

/* All domain data and actions are supplied by the parent. No recognition or API calls. */
/* eslint-disable @next/next/no-img-element */
import { useEffect,useRef,useState } from 'react';
import { motion,useReducedMotion } from 'motion/react';
import CurrentContext from './CurrentContext';
import RefinementInput from './RefinementInput';
import RefinementIcon from './RefinementIcon';
import styles from './RefinementExperience.module.css';

function SpacePreview({result,version,onFullView,onDownload}) {
  const [loaded,setLoaded] = useState(false);
  const [failed,setFailed] = useState(false);
  const reduced = useReducedMotion();
  const imageRef = useRef(null);
  useEffect(() => {
    // Cached images may finish before React attaches the load listener.
    if (!imageRef.current?.complete || !imageRef.current.naturalWidth) return;
    const frame = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(frame);
  },[]);
  return <section className={styles.preview} aria-label="Current space result">
    <div className={styles.imageStage}>{result.imageUrl && !failed && <motion.img ref={imageRef} src={result.imageUrl} alt={result.alt} className={styles.image} initial={{opacity:0,filter:reduced ? 'blur(0px)' : 'blur(24px)',scale:reduced ? 1 : .98}} animate={loaded ? {opacity:1,filter:'blur(0px)',scale:1} : {opacity:0}} transition={{duration:reduced ? 0 : 2.8,ease:[.22,1,.36,1]}} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/>}{failed && <p className="absolute inset-0 grid place-items-center text-sm text-spacee-muted">Preview image could not load.</p>}</div>
    <footer className={styles.imageFooter}><div><h2 className="text-sm font-semibold">Version {String(version).padStart(2,'0')}</h2><p className="mt-0.5 text-xs text-[#8990aa]">{result.generatedLabel}</p></div><div className="flex gap-2"><button className={styles.action} onClick={() => onFullView(result)}><RefinementIcon type="expand"/>Full view</button><button className={styles.action} onClick={() => onDownload(result)}><RefinementIcon type="download"/>Download</button></div></footer>
  </section>;
}

export default function RefinementExperience({materials,initialRequest,result,version,requirement,onRequirementChange,onRefine,onDownload,onFullView,onRemoveMaterial,onContextOptions,onAttach,headingClassName,notice}) {
  return <section className={styles.page} aria-label="Space refinement prototype">
    <header className={styles.header}><h1 className={headingClassName}>Refine your space</h1><p>Keep exploring with your materials through conversation.</p></header>
    <div className={styles.layout}>
      <SpacePreview key={`${version}-${result.imageUrl}`} result={result} version={version} onFullView={onFullView} onDownload={onDownload}/>
      <section className={styles.conversation} aria-label="Refine your space">
        <header className={styles.conversationHeader}><h2 className={headingClassName}>Refine your space</h2><p>Keep shaping the result through conversation.</p></header>
        <div className={styles.contextArea}><CurrentContext materials={materials} initialRequest={initialRequest} onRemoveMaterial={onRemoveMaterial} onContextOptions={onContextOptions}/>
          <article className="mt-4 rounded-2xl border border-[#e8e6e6] bg-white p-4" aria-label="Current version"><div className="flex items-start gap-3"><RefinementIcon type="sparkle" className="size-6 shrink-0"/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Spaceeee</h3><span className="text-xs text-[#8990aa]">{result.timeLabel}</span></div><p className="mt-1 text-xs leading-5 text-[#8990aa]">Generated using your selected materials and request.</p><div className="mt-2 flex gap-3 rounded-xl bg-[#f7f7f7] p-1"><img src={result.imageUrl} alt="" className="w-[105px] shrink-0 rounded-lg object-cover"/><div className="py-1"><h4 className="text-xs font-semibold">Version {String(version).padStart(2,'0')}</h4><p className="mt-1 text-xs leading-5 text-[#858ba0]">{result.description}</p></div></div></div></div></article>
        </div>
        <div className="mt-auto pt-4"><RefinementInput value={requirement} onChange={onRequirementChange} onRefine={onRefine} onAttach={onAttach}/></div>
      </section>
    </div>
    <p className="mt-3 text-center text-[11px] text-spacee-muted" role="status">{notice || 'UI prototype · Reference image and mock data · No AI requests'}</p>
  </section>;
}
