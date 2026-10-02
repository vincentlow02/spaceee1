'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Camera from '@/components/Camera';
import { loadModel, startRegionPredictionLoop } from '@/lib/teachableMachine';
import { RECOGNITION_THRESHOLD } from '@/features/recognition/recognitionConfig';
import {
  CAMERA_PREVIEW_MIRRORED,
  RECOGNITION_CROP_SIZE,
  RECOGNITION_INTERVAL_MS,
  RECOGNITION_REGION_LIST,
  getContainedVideoRect,
  resolveRegionToVideoPixels,
} from '@/features/recognition/recognitionRegions';
import { adaptTeachableMachinePredictions } from '@/features/recognition/teachableMachineAdapter';
import { buildSpatialPrompt } from '@/features/exploration/promptGeneration';
import {
  createExplorationSnapshot,
  createLiveRecognitionState,
  getDiscoverEligibility,
} from '@/features/recognition/positionRecognition';
import styles from './recognition-test.module.css';

const MODEL_URL = process.env.NEXT_PUBLIC_TEACHABLE_MODEL_URL;

function createUnknownPosition(position) {
  return {
    position,
    priority: position,
    materialId: null,
    className: null,
    confidence: 0,
    status: 'unknown',
    observedAt: null,
  };
}

const INITIAL_FRAME = {
  liveState: createLiveRecognitionState([1, 2, 3].map(createUnknownPosition)),
  rawByPosition: {},
};

const INITIAL_GENERATION = {
  status: 'idle',
  imageUrl: null,
  requestId: null,
  error: null,
};

function displayName(value) {
  if (!value) return 'Unknown';
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function materialLabel(materialId) {
  return displayName(materialId?.replace(/-/g, ' '));
}

export default function RecognitionTestPage() {
  const predictionLoopRef = useRef(null);
  const cameraFrameRef = useRef(null);
  const mountedRef = useRef(true);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [modelStatus, setModelStatus] = useState('idle');
  const [recognitionStatus, setRecognitionStatus] = useState('waiting');
  const [recognitionFrame, setRecognitionFrame] = useState(INITIAL_FRAME);
  const [snapshot, setSnapshot] = useState(null);
  const [promptResult, setPromptResult] = useState(null);
  const [generation, setGeneration] = useState(INITIAL_GENERATION);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    // React Strict Mode runs an extra setup/cleanup cycle in development.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      predictionLoopRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const frame = cameraFrameRef.current;
    if (!frame) return undefined;

    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect();
      setFrameSize({ width: rect.width, height: rect.height });
    };

    updateFrameSize();
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const previewRect = useMemo(
    () => getContainedVideoRect(frameSize.width, frameSize.height, videoSize.width, videoSize.height),
    [frameSize, videoSize]
  );
  const eligibility = getDiscoverEligibility(recognitionFrame.liveState);

  const handleVideoReady = useCallback(async (videoElement) => {
    if (!MODEL_URL) {
      setModelStatus('error');
      setRecognitionStatus('stopped');
      setError('NEXT_PUBLIC_TEACHABLE_MODEL_URL is not configured.');
      return;
    }

    setVideoSize({ width: videoElement.videoWidth, height: videoElement.videoHeight });
    setModelStatus('loading');
    setRecognitionStatus('waiting');
    setError('');

    try {
      const model = await loadModel(MODEL_URL);
      if (!mountedRef.current) return;

      setModelStatus('loaded');
      setRecognitionStatus('running');
      predictionLoopRef.current?.stop();
      predictionLoopRef.current = startRegionPredictionLoop(
        model,
        videoElement,
        RECOGNITION_REGION_LIST,
        {
          cropSize: RECOGNITION_CROP_SIZE,
          intervalMs: RECOGNITION_INTERVAL_MS,
          mirrored: CAMERA_PREVIEW_MIRRORED,
          resolveRegion: resolveRegionToVideoPixels,
          onPredictionSet: (predictionSet) => {
            if (!mountedRef.current) return;
            const observedAt = new Date().toISOString();
            const positions = predictionSet.map(({ position, predictions }) =>
              adaptTeachableMachinePredictions(predictions, {
                position,
                threshold: RECOGNITION_THRESHOLD,
                observedAt,
              })
            );

            setRecognitionFrame({
              liveState: createLiveRecognitionState(positions),
              rawByPosition: Object.fromEntries(
                predictionSet.map(({ position, predictions }) => [position, predictions])
              ),
            });
          },
          onError: (predictionError) => {
            if (!mountedRef.current) return;
            setError(
              predictionError instanceof Error
                ? `Prediction error: ${predictionError.message}`
                : 'A prediction cycle failed.'
            );
          },
        }
      );
    } catch (modelError) {
      if (!mountedRef.current) return;
      setModelStatus('error');
      setRecognitionStatus('stopped');
      setError(modelError instanceof Error ? modelError.message : 'Failed to load the recognition model.');
    }
  }, []);

  const handleCameraError = useCallback((message) => {
    setRecognitionStatus('stopped');
    setError(message);
  }, []);

  function handleDiscover() {
    if (!eligibility.eligible) return;
    const nextSnapshot = createExplorationSnapshot(recognitionFrame.liveState);
    setSnapshot(nextSnapshot);
    setPromptResult(null);
    setGeneration(INITIAL_GENERATION);
  }

  function handleGeneratePrompt() {
    if (!snapshot) return;
    setPromptResult(buildSpatialPrompt(snapshot));
  }

  async function handleGenerateSpace() {
    if (!snapshot || generation.status === 'generating') return;

    setGeneration({ status: 'generating', imageUrl: null, requestId: null, error: null });

    try {
      const response = await fetch('/api/generate-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Generation failed. Please try again.');
      }

      if (typeof payload?.imageUrl !== 'string' || payload.imageUrl.length === 0) {
        throw new Error('The image service did not return an image.');
      }

      setGeneration({
        status: 'success',
        imageUrl: payload.imageUrl,
        requestId: payload.requestId || null,
        error: null,
      });
    } catch (generationError) {
      setGeneration({
        status: 'error',
        imageUrl: null,
        requestId: null,
        error:
          generationError instanceof Error
            ? generationError.message
            : 'Generation failed. Please try again.',
      });
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Spacee / Phase 5B</p>
          <h1>Snapshot to Spatial Image</h1>
        </div>
        <a href="/spacee-prototype">Back to Phase 4A</a>
      </header>

      <p className={styles.notice}>
        Development-only three-position test. One browser camera feeds three fixed crops. Frames never reach the Next.js server.
      </p>

      <section className={styles.statusBar} aria-label="System status">
        <Status label="Model" value={modelStatus} good={modelStatus === 'loaded'} />
        <Status label="Camera" value={cameraStatus === 'active' ? 'connected' : cameraStatus} good={cameraStatus === 'active'} />
        <Status label="Recognition" value={recognitionStatus} good={recognitionStatus === 'running'} />
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <section className={styles.panel} aria-labelledby="camera-heading">
        <div className={styles.panelHeading}>
          <h2 id="camera-heading">Camera Preview</h2>
          <span>One stream · three fixed ROI</span>
        </div>
        <div className={styles.cameraFrame} ref={cameraFrameRef}>
          <Camera
            onVideoReady={handleVideoReady}
            onError={handleCameraError}
            onStatusChange={setCameraStatus}
            videoClassName={`${styles.containedVideo} ${CAMERA_PREVIEW_MIRRORED ? styles.mirroredVideo : ''}`}
          />
          {previewRect && (
            <div
              className={styles.roiLayer}
              style={{
                left: previewRect.left,
                top: previewRect.top,
                width: previewRect.width,
                height: previewRect.height,
              }}
              aria-hidden="true"
            >
              {RECOGNITION_REGION_LIST.map((region) => (
                <div
                  className={styles.roi}
                  key={region.position}
                  style={{
                    left: `${region.x * 100}%`,
                    top: `${region.y * 100}%`,
                    width: `${region.width * 100}%`,
                    height: `${region.height * 100}%`,
                  }}
                >
                  <span>ROI {region.position}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.cameraMeta}>
          <span>Source: {videoSize.width || '—'} × {videoSize.height || '—'}</span>
          <span>Crop input: {RECOGNITION_CROP_SIZE} × {RECOGNITION_CROP_SIZE}</span>
          <span>Threshold: {percent(RECOGNITION_THRESHOLD)}</span>
        </div>
      </section>

      <section className={styles.positionGrid} aria-label="Live position recognition state">
        {recognitionFrame.liveState.positions.map((recognition) => (
          <PositionCard
            key={recognition.position}
            recognition={recognition}
            predictions={recognitionFrame.rawByPosition[recognition.position] || []}
          />
        ))}
      </section>

      <section
        className={`${styles.discoverPanel} ${eligibility.eligible ? styles.discoverReady : styles.discoverBlocked}`}
        aria-label="Discover eligibility"
      >
        <div>
          <span>Live recognition</span>
          <strong>{eligibility.eligible ? 'Ready to discover' : 'Discover unavailable'}</strong>
          <p>{eligibility.message}</p>
        </div>
        <button type="button" disabled={!eligibility.eligible} onClick={handleDiscover}>
          DISCOVER <span>↗</span>
        </button>
      </section>

      <section className={styles.snapshotPanel} aria-labelledby="snapshot-heading">
        <div className={styles.panelHeading}>
          <h2 id="snapshot-heading">Exploration Snapshot</h2>
          <span>{snapshot ? 'Captured · immutable' : 'Waiting for Discover'}</span>
        </div>

        {snapshot ? (
          <div className={styles.snapshotBody}>
            <div className={styles.snapshotMeta}>
              <span>Session</span><code>{snapshot.sessionId}</code>
              <span>Created</span><time dateTime={snapshot.createdAt}>{new Date(snapshot.createdAt).toLocaleTimeString()}</time>
            </div>
            <div className={styles.snapshotMaterials}>
              {snapshot.materials.map((material) => (
                <article key={material.position}>
                  <span>Priority {material.priority}</span>
                  <strong>{materialLabel(material.materialId)}</strong>
                  <small>Captured from Position {material.position}</small>
                </article>
              ))}
            </div>
            <div className={styles.promptAction}>
              <div>
                <strong>Snapshot ready</strong>
                <p>Build a deterministic prompt from this frozen exploration.</p>
              </div>
              <button type="button" onClick={handleGeneratePrompt}>Generate Prompt <span>→</span></button>
            </div>
            <p className={styles.snapshotNote}>
              Frozen at Discover. Continued camera recognition does not mutate this snapshot.
            </p>
          </div>
        ) : (
          <div className={styles.snapshotEmpty}>
            <strong>No exploration captured</strong>
            <p>A valid live arrangement becomes immutable only when DISCOVER is pressed.</p>
          </div>
        )}
      </section>

      {promptResult && (
        <section className={styles.generatedPrompt} aria-labelledby="generated-prompt-heading">
          <div className={styles.panelHeading}>
            <h2 id="generated-prompt-heading">Generated Prompt</h2>
            <span>Inspectable · Qwen not called</span>
          </div>
          <pre>{promptResult.prompt}</pre>
          <div className={styles.generationAction} aria-live="polite">
            <button
              type="button"
              disabled={generation.status === 'generating'}
              onClick={handleGenerateSpace}
            >
              {generation.status === 'error' ? 'Try Again' : 'Generate Space'} <span>↗</span>
            </button>
            {generation.status === 'generating' && (
              <p><strong>Generating Space…</strong> Please wait. This can take up to two minutes.</p>
            )}
            {generation.status === 'error' && (
              <p className={styles.generationError} role="alert">
                <strong>Generation failed.</strong> {generation.error}
              </p>
            )}
          </div>
        </section>
      )}

      {generation.status === 'success' && (
        <section className={styles.generatedSpace} aria-labelledby="generated-space-heading">
          <div className={styles.panelHeading}>
            <h2 id="generated-space-heading">Generated Space</h2>
            <span>{generation.requestId ? `Request ${generation.requestId}` : 'Qwen Image'}</span>
          </div>
          {/* Qwen returns a temporary remote URL, so a plain image is intentional in this prototype. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={generation.imageUrl} alt="AI-generated spatial interpretation of the captured materials" />
        </section>
      )}

      <section className={styles.contract} aria-label="Spacee mapping contract">
        <span>Recognition</span><i>→</i><span>Immutable Snapshot</span><i>→</i><span>Server Prompt</span><i>→</i><strong>Qwen Image</strong>
      </section>
    </main>
  );
}

function PositionCard({ recognition, predictions }) {
  return (
    <article className={styles.positionCard}>
      <div className={styles.positionBanner}>
        <span>Position {recognition.position}</span>
        <strong>Priority {recognition.priority}</strong>
      </div>

      <dl className={styles.recognitionData}>
        <div><dt>Material</dt><dd>{recognition.status === 'recognized' ? displayName(recognition.className) : 'Unknown'}</dd></div>
        <div><dt>Status</dt><dd className={recognition.status === 'recognized' ? styles.recognized : styles.unknown}>{displayName(recognition.status)}</dd></div>
      </dl>

      {recognition.status === 'unknown' && recognition.className && (
        <p className={styles.candidate}>Highest candidate: {displayName(recognition.className)}</p>
      )}

      {recognition.status === 'unknown' && (
        <p className={styles.waiting}>Waiting for material</p>
      )}

      <div className={styles.rawPredictions}>
        <h3>Raw predictions</h3>
        {predictions.length > 0 ? predictions.map((prediction) => (
          <div className={styles.prediction} key={prediction.className}>
            <span>{displayName(prediction.className)}</span>
            <strong>{percent(prediction.probability)}</strong>
          </div>
        )) : <p>Waiting for prediction…</p>}
      </div>
    </article>
  );
}

function Status({ label, value, good }) {
  return (
    <div className={styles.statusItem}>
      <span>{label}</span>
      <strong><i className={good ? styles.goodDot : styles.neutralDot} />{displayName(value)}</strong>
    </div>
  );
}
