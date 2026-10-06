'use client';

/* Local Figma SVGs are rendered at their original dimensions. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Camera from './Camera';
import { useLiveRecognition } from '@/features/recognition/useLiveRecognition';
import { createExplorationSnapshot, getDiscoverEligibility } from '@/features/recognition/positionRecognition';
import { getContainedVideoRect, RECOGNITION_REGION_LIST } from '@/features/recognition/recognitionRegions';
import { resolveTemporaryMaterialInformation } from '@/features/materials/temporaryMaterialInformation';
import MaterialPhoto from './MaterialPhoto';
import GenerationExperience from './GenerationExperience';
import styles from './SpaceeHome.module.css';

function nameFor(id) { return resolveTemporaryMaterialInformation(id).name; }

export default function SpaceeHome({ headingClassName }) {
  const { liveState, status, error, videoRef, onVideoReady, onCameraError, resetRecognition } = useLiveRecognition();
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [activePosition, setActivePosition] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [generation, setGeneration] = useState({status: 'idle'});
  const requestRef = useRef(null);
  const snapshotRef = useRef(null);
  const previewRef = useRef(null);
  const introRef = useRef(null);
  const [videoRect, setVideoRect] = useState(null);
  const eligibility = getDiscoverEligibility(liveState);
  const readyToGenerate = eligibility.eligible && cameraStatus === 'active' && status === 'running' && !error;
  const count = liveState.positions.filter(entry => entry.status === 'recognized').length;

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    const preview = previewRef.current;
    const video = videoRef.current;
    if (!preview || !video || cameraStatus !== 'active') return;
    const update = () => setVideoRect(getContainedVideoRect(preview.clientWidth, preview.clientHeight, video.videoWidth, video.videoHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(preview);
    return () => observer.disconnect();
  }, [cameraStatus, videoRef]);

  async function generateSpace(retry = false) {
    if (requestRef.current || (!retry && !readyToGenerate)) return;
    const snapshot = retry ? snapshotRef.current : createExplorationSnapshot(liveState);
    if (!snapshot) return;
    snapshotRef.current = snapshot;
    const controller = new AbortController();
    requestRef.current = controller;
    setGeneration({status: 'generating', snapshot});
    try {
      const response = await fetch('/api/generate-space', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({snapshot}), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || typeof result.imageUrl !== 'string' || !result.imageUrl.trim()) throw new Error(result.error || 'Generation failed. Please try again.');
      setGeneration({status: 'success', imageUrl: result.imageUrl, snapshot});
    } catch (failure) {
      if (failure.name !== 'AbortError') setGeneration({status: 'error', error: failure.message, snapshot});
    } finally { if (requestRef.current === controller) requestRef.current = null; }
  }

  return (
    <main className={styles.page}>
      <div className={styles.menu}>
        <button className={styles.menuButton} aria-label="Open Spacee menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <img src="/figma/status-circle.svg" width="37" height="37" alt="" />
        </button>
        {menuOpen && <nav className={styles.menuPanel} aria-label="Spacee tools"><Link href="/recognition-test">Recognition test</Link><Link href="/spacee-prototype">Position prototype</Link></nav>}
      </div>
      <div className={styles.content} hidden={generation.status !== 'idle'}>
        <header className={styles.intro}>
          <h1 ref={introRef} tabIndex={-1} className={headingClassName}>Create a space<br />from real materials</h1>
          <p>Place three materials on the platform to begin.</p>
        </header>
        <section className={styles.preview} ref={previewRef} aria-label="Live material camera">
          {cameraStarted ? <Camera key={cameraKey} onVideoReady={onVideoReady} onError={onCameraError} onStatusChange={setCameraStatus} videoClassName={styles.video} /> :
            <div className={styles.cameraPlaceholder}><button onClick={() => setCameraStarted(true)}>Enable camera</button><p>Your materials, seen live.</p></div>}
          {status === 'loading' && <span className={styles.cameraBadge}>Preparing recognition…</span>}
          {videoRect && cameraStatus === 'active' && RECOGNITION_REGION_LIST.map(region => (
            <div key={region.position} className={`${styles.roi} ${activePosition === region.position ? styles.roiActive : ''}`} style={{left: videoRect.left + region.x * videoRect.width, top: videoRect.top + region.y * videoRect.height, width: region.width * videoRect.width, height: region.height * videoRect.height}}><span>{region.position}</span></div>
          ))}
        </section>
        {error && <div className={styles.cameraError} role="alert"><p>{error}</p><button onClick={() => {resetRecognition(); setCameraStatus('idle'); setVideoRect(null); setCameraStarted(true); setCameraKey(key => key + 1);}}>Restart camera</button></div>}
        <section className={styles.materials} aria-label="Three material positions">
          {liveState.positions.map(entry => <MaterialCard key={entry.position} entry={entry} active={activePosition === entry.position} onEdit={() => setActivePosition(activePosition === entry.position ? null : entry.position)} />)}
        </section>
        {activePosition && <p className={styles.guidance}>Place or replace a material in camera position {activePosition}. Its card updates automatically.</p>}
        <section className={styles.controls} aria-label="Space generation controls">
          <p aria-live="polite">{count} {count === 1 ? 'material' : 'materials'} selected</p>
          <button className={styles.generate} disabled={!readyToGenerate || generation.status === 'generating'} onClick={() => generateSpace()}>
            {generation.status === 'generating' ? 'Generating Space…' : 'Generate Space'}<img src="/figma/arrow-right.svg" width="20" height="20" alt="" />
          </button>
          {eligibility.reason === 'duplicate-material' && <p className={styles.hint}>Place a different material at each position.</p>}
          {count < 3 && <p className={styles.hint}>Waiting for three different materials.</p>}
        </section>
      </div>
      {generation.status !== 'idle' && <GenerationExperience generation={generation} headingClassName={headingClassName} onRetry={() => generateSpace(true)} onExplore={() => {setGeneration({status:'idle'}); snapshotRef.current = null; setActivePosition(null); requestAnimationFrame(() => introRef.current?.focus({preventScroll:true}));}} />}
    </main>
  );
}

function MaterialCard({entry, active, onEdit}) {
  const recognized = entry.status === 'recognized' && entry.materialId;
  return <article className={`${styles.card} ${recognized ? '' : styles.emptyCard} ${active ? styles.activeCard : ''}`}>
    <div className={styles.thumbnail}>{recognized ? <MaterialPhoto key={entry.materialId} materialId={entry.materialId} className={styles.productPhoto} placeholderClassName={styles.photoPlaceholder} /> : <span aria-hidden="true">+</span>}</div>
    <div className={styles.cardBody}><span className={styles.position}>{entry.position}</span><h2>{recognized ? nameFor(entry.materialId) : 'Waiting for material'}</h2><p>{recognized ? 'Recognized material' : `Place in position ${entry.position}`}</p></div>
    <button className={styles.edit} onClick={onEdit} aria-label={`Show placement guide for position ${entry.position}`} aria-pressed={active}><span className={styles.pencil}><img className={styles.pencilLine} src="/figma/pencil-line.svg" width="9.99167" height="1.74167" alt="" /><img className={styles.pencilBody} src="/figma/pencil-body.svg" width="16.5196" height="16.5196" alt="" /></span></button>
  </article>;
}

