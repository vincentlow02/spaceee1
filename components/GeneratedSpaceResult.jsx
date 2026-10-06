'use client';

/* Temporary generated URLs are displayed directly, not persisted. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { resolveTemporaryMaterialInformation } from '@/features/materials/temporaryMaterialInformation';
import styles from './GeneratedSpaceResult.module.css';

function ResultIcon({type}) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'expand' ? <><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" /></> : type === 'download' ? <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></> : <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17" /></>}
  </svg>;
}

export default function GeneratedSpaceResult({generation,headingClassName,onRegenerate,onExplore,onImageError}) {
  const headingRef = useRef(null);
  const dialogRef = useRef(null);
  const downloadRef = useRef(null);
  const [downloading,setDownloading] = useState(false);
  const [downloadError,setDownloadError] = useState(null);
  const names = generation.snapshot.materials.map(material => resolveTemporaryMaterialInformation(material.materialId).name);
  const title = generation.interpretation?.title?.trim() || 'Your space, reimagined.';
  const description = generation.interpretation?.description?.trim() || `A spatial interpretation of ${names.slice(0,-1).join(', ')} and ${names.at(-1)}, explored within the same base space.`;
  const imageAlt = generation.motionPreview ? 'Motion test graphic, not an AI-generated space' : 'Generated spatial image based on the captured material combination';

  useEffect(() => {headingRef.current?.focus({preventScroll:true}); return () => downloadRef.current?.abort();}, []);

  async function downloadImage() {
    if (downloadRef.current) return;
    const controller = new AbortController();
    downloadRef.current = controller;
    setDownloading(true);
    setDownloadError(null);
    try {
      // Only the explicitly labeled local motion fixture bypasses the download API.
      const response = generation.motionPreview && generation.imageUrl === '/figma/generation-material-slots.svg'
        ? await fetch(generation.imageUrl,{signal:controller.signal})
        : await fetch('/api/download-space',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageUrl:generation.imageUrl}),signal:controller.signal});
      if (!response.ok) throw new Error('The image could not be downloaded. Its temporary link may have expired.');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = generation.motionPreview ? 'spacee-motion-test.svg' : blob.type === 'image/jpeg' ? 'spacee-space.jpg' : blob.type === 'image/webp' ? 'spacee-space.webp' : 'spacee-space.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl),1000);
    } catch (error) {
      if (error.name !== 'AbortError') setDownloadError(error.message || 'Download failed. Please try again.');
    } finally {
      if (downloadRef.current === controller) {downloadRef.current = null; setDownloading(false);}
    }
  }

  return <section className={styles.resultLayout} aria-label="Generated space result">
    <aside className={styles.sidebar}>
      <div className={styles.interpretation}>
        <span className={styles.eyebrow}>{generation.motionPreview || generation.layoutPreview ? 'DESIGN PREVIEW' : 'AI INTERPRETATION'}</span>
        <h1 ref={headingRef} tabIndex={-1} className={headingClassName}>{title}</h1>
        <p>{description}</p>
      </div>
      <div className={styles.bottomActions}>
        <button className={styles.generateAgain} onClick={onRegenerate}><ResultIcon type="regenerate" />Generate again</button>
        <button className={styles.explore} onClick={onExplore}>Explore new materials <span aria-hidden="true">→</span></button>
      </div>
    </aside>
    <div className={styles.imageStage}>
      {!generation.layoutPreview && <img className={styles.spaceImage} src={generation.imageUrl} alt={imageAlt} onError={onImageError} />}
      <div className={styles.imageActions}>
        <button disabled={generation.layoutPreview} onClick={() => dialogRef.current?.showModal()}><ResultIcon type="expand" />Full view</button>
        <button onClick={downloadImage} disabled={downloading || generation.layoutPreview}><ResultIcon type="download" />{downloading ? 'Downloading…' : 'Download'}</button>
      </div>
      {generation.motionPreview && <span className={styles.previewLabel}>TEST GRAPHIC · NOT AI RESULT</span>}
      {generation.layoutPreview && <span className={styles.previewLabel}>IMAGE AREA · DESIGN PREVIEW ONLY</span>}
      {downloadError && <p className={styles.downloadError} role="alert">{downloadError}</p>}
    </div>
    {!generation.layoutPreview && <dialog ref={dialogRef} className={styles.imageDialog} aria-label="Generated space full view"><button className={styles.closeDialog} onClick={() => dialogRef.current?.close()} autoFocus>Close <span aria-hidden="true">×</span></button><img src={generation.imageUrl} alt={imageAlt} /><p>{names.join(' · ')}</p></dialog>}
    <span className={styles.srOnly} role="status">{generation.layoutPreview ? 'Result layout preview. No image has been generated.' : 'Your space is ready.'}</span>
  </section>;
}
