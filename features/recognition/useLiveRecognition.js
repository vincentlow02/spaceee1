'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadModel, startRegionPredictionLoop } from '@/lib/teachableMachine';
import { MATERIAL_RECHECK_INTERVAL_MS, RECOGNITION_THRESHOLD } from './recognitionConfig';
import { CAMERA_PREVIEW_MIRRORED, RECOGNITION_CROP_SIZE, RECOGNITION_REGION_LIST, resolveRegionToVideoPixels } from './recognitionRegions';
import { adaptTeachableMachinePredictions } from './teachableMachineAdapter';
import { createLiveRecognitionState } from './positionRecognition';

function emptyState() {
  return createLiveRecognitionState([1, 2, 3].map(position => ({
    position, priority: position, materialId: null, confidence: 0, status: 'unknown', observedAt: null,
  })));
}

export function useLiveRecognition() {
  const loopRef = useRef(null);
  const videoRef = useRef(null);
  const mountedRef = useRef(false);
  const versionRef = useRef(0);
  const [status, setStatus] = useState('waiting');
  const [error, setError] = useState('');
  const [liveState, setLiveState] = useState(emptyState);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; versionRef.current += 1; loopRef.current?.stop(); };
  }, []);

  const onVideoReady = useCallback(async video => {
    const version = ++versionRef.current;
    videoRef.current = video;
    setStatus('loading');
    setError('');
    try {
      const model = await loadModel(process.env.NEXT_PUBLIC_TEACHABLE_MODEL_URL);
      if (!mountedRef.current || versionRef.current !== version) return;
      loopRef.current?.stop();
      setStatus('running');
      loopRef.current = startRegionPredictionLoop(model, video, RECOGNITION_REGION_LIST, {
        cropSize: RECOGNITION_CROP_SIZE, intervalMs: MATERIAL_RECHECK_INTERVAL_MS,
        mirrored: CAMERA_PREVIEW_MIRRORED, resolveRegion: resolveRegionToVideoPixels,
        onPredictionSet: results => {
          if (!mountedRef.current || versionRef.current !== version) return;
          const observedAt = new Date().toISOString();
          setError('');
          setLiveState(createLiveRecognitionState(results.map(({position, predictions}) =>
            adaptTeachableMachinePredictions(predictions, {position, observedAt, threshold: RECOGNITION_THRESHOLD})
          )));
        },
        onError: () => { if (mountedRef.current && versionRef.current === version) setError('Recognition paused. Please restart the camera.'); },
      });
    } catch {
      if (mountedRef.current && versionRef.current === version) { setStatus('error'); setError('Material recognition is unavailable. Please restart the camera.'); }
    }
  }, []);

  const onCameraError = useCallback(() => {
    versionRef.current += 1;
    loopRef.current?.stop();
    setLiveState(emptyState());
    setStatus('error');
    setError('Camera unavailable. Allow camera access in your browser, then try again.');
  }, []);

  const resetRecognition = useCallback(() => {
    versionRef.current += 1;
    loopRef.current?.stop();
    videoRef.current = null;
    setLiveState(emptyState());
    setStatus('waiting');
    setError('');
  }, []);

  return { liveState, status, error, videoRef, onVideoReady, onCameraError, resetRecognition };
}
