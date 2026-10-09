'use client';

import { useEffect, useRef, useState } from 'react';
import Camera from '../Camera';
import { getContainedVideoRect, RECOGNITION_REGION_LIST } from '@/features/recognition/recognitionRegions';
import styles from './CameraRecognitionPanel.module.css';

export default function CameraRecognitionPanel({cameraStarted,cameraKey,cameraStatus,recognitionStatus,videoRef,activePosition,onEnableCamera,onVideoReady,onCameraError,onCameraStatusChange,onRestart,error}) {
  const previewRef = useRef(null);
  const [videoRect,setVideoRect] = useState(null);
  useEffect(() => {
    const preview = previewRef.current;
    const video = videoRef.current;
    if (!preview || !video || cameraStatus !== 'active') return;
    const update = () => setVideoRect(getContainedVideoRect(preview.clientWidth,preview.clientHeight,video.videoWidth,video.videoHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(preview);
    return () => observer.disconnect();
  },[cameraStatus,videoRef]);

  return <section className={styles.panel} aria-label="Camera recognition">
    <div className={styles.preview} ref={previewRef} aria-label="Live material camera" data-node-id="140:114">
      {cameraStarted ? <Camera key={cameraKey} onVideoReady={onVideoReady} onError={onCameraError} onStatusChange={onCameraStatusChange} videoClassName={styles.video} /> : <button className={styles.enableCamera} onClick={onEnableCamera}>Enable camera</button>}
      {recognitionStatus === 'loading' && <span className={styles.cameraBadge}>Preparing recognition…</span>}
      {videoRect && cameraStatus === 'active' && RECOGNITION_REGION_LIST.map(region => <div key={region.position} className={`${styles.roi} ${activePosition === region.position ? styles.roiActive : ''}`} style={{left:videoRect.left + region.x * videoRect.width,top:videoRect.top + region.y * videoRect.height,width:region.width * videoRect.width,height:region.height * videoRect.height}}><span>{region.position}</span></div>)}
    </div>
    {error && <div className={styles.error} role="alert"><p>{error}</p><button onClick={onRestart}>Restart camera</button></div>}
  </section>;
}
