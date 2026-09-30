'use client';

/**
 * SpaceePrototype page  —  app/spacee-prototype/page.js
 *
 * Purpose: Debug screen to verify the full Phase 1 data flow:
 *   Camera → Teachable Machine → recognitionHandler → UI display
 *
 * This page intentionally prioritises data correctness over visual polish.
 * Styling is minimal so the data flow is easy to inspect.
 *
 * Phase 2 extension point:
 *   Replace the local useState calls with a shared recognition store
 *   once Supabase exploration logging is introduced.
 */

import { useState, useCallback, useRef } from 'react';
import Camera from '@/components/Camera';
import { loadModel, startPredictionLoop } from '@/lib/teachableMachine';
import { processRecognitionResult } from '@/features/recognition/recognitionHandler';

// --- Configuration -----------------------------------------------------------
// Set NEXT_PUBLIC_TEACHABLE_MODEL_URL in .env.local to point to your TM model.
// Example: https://teachablemachine.withgoogle.com/models/<YOUR_MODEL_ID>/
const MODEL_URL = process.env.NEXT_PUBLIC_TEACHABLE_MODEL_URL;

// -----------------------------------------------------------------------------

export default function SpaceePrototypePage() {
  // Recognition result in Spacee format (null = not started yet)
  const [recognitionResult, setRecognitionResult] = useState(null);
  // Raw TM predictions for the debug panel
  const [rawPredictions, setRawPredictions] = useState(null);
  // UI state
  const [modelStatus, setModelStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [cameraError, setCameraError] = useState('');

  // Hold a reference to the prediction loop controller so we can stop it
  const predictionLoopRef = useRef(null);

  /**
   * Called by <Camera> once the video stream is live.
   * Loads the TM model then starts the prediction loop.
   */
  const handleVideoReady = useCallback(async (videoElement) => {
    if (!MODEL_URL) {
      setModelStatus('error');
      console.warn(
        'SpaceePrototype: NEXT_PUBLIC_TEACHABLE_MODEL_URL is not set. ' +
          'Add it to .env.local and restart the dev server.'
      );
      return;
    }

    setModelStatus('loading');

    try {
      const model = await loadModel(MODEL_URL);
      setModelStatus('ready');

      // Start the continuous prediction loop
      predictionLoopRef.current = startPredictionLoop(
        model,
        videoElement,
        (predictions) => {
          // Keep raw TM output for the debug panel
          setRawPredictions(predictions);

          // Transform into the locked Spacee data contract
          const result = processRecognitionResult(predictions);
          setRecognitionResult(result);
        }
      );
    } catch (err) {
      setModelStatus('error');
      console.error('SpaceePrototype: failed to load TM model', err);
    }
  }, []);

  const handleCameraError = useCallback((msg) => {
    setCameraError(msg);
  }, []);

  // Format confidence as a percentage string, e.g. "82%"
  const fmtPct = (confidence) => `${Math.round(confidence * 100)}%`;

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Spacee — Phase 1 Prototype</h1>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Status</h2>
        <p>
          Model:{' '}
          <strong>
            {modelStatus === 'idle' && 'Waiting for camera…'}
            {modelStatus === 'loading' && 'Loading Teachable Machine model…'}
            {modelStatus === 'ready' && '✓ Running'}
            {modelStatus === 'error' &&
              (MODEL_URL
                ? '✗ Failed to load model (see console)'
                : '✗ NEXT_PUBLIC_TEACHABLE_MODEL_URL not set')}
          </strong>
        </p>
        {cameraError && <p style={styles.error}>{cameraError}</p>}
      </section>

      {/* ── Camera ─────────────────────────────────────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Camera</h2>
        <div style={styles.cameraContainer}>
          <Camera onVideoReady={handleVideoReady} onError={handleCameraError} />
        </div>
      </section>

      {/* ── Recognition Result ─────────────────────────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Recognition Result</h2>

        {recognitionResult ? (
          <div>
            <p style={styles.primaryLabel}>
              Detected Material:{' '}
              <strong>{recognitionResult.primaryCategory}</strong>
            </p>

            <ol style={styles.priorityList}>
              {recognitionResult.priority.map((item, idx) => (
                <li key={item.category} style={styles.priorityItem}>
                  <span style={styles.rank}>{idx + 1}.</span>
                  <span style={styles.categoryName}>{item.category}</span>
                  <span style={styles.confidence}>
                    {fmtPct(item.confidence)}
                  </span>
                  {/* Confidence bar */}
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: fmtPct(item.confidence),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p style={styles.placeholder}>
            No prediction yet — allow camera access and wait for the model to
            load.
          </p>
        )}
      </section>

      {/* ── Raw Data Debug ─────────────────────────────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Raw Data Debug</h2>

        <h3 style={styles.debugLabel}>Spacee Recognition Result</h3>
        <pre style={styles.codeBlock}>
          {recognitionResult
            ? JSON.stringify(recognitionResult, null, 2)
            : 'null'}
        </pre>

        <h3 style={styles.debugLabel}>Raw Teachable Machine Predictions</h3>
        <pre style={styles.codeBlock}>
          {rawPredictions ? JSON.stringify(rawPredictions, null, 2) : 'null'}
        </pre>
      </section>
    </main>
  );
}

// ── Inline styles (keeps the debug page self-contained) ──────────────────────

const styles = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 720,
    margin: '0 auto',
    padding: '2rem 1rem',
    color: '#111',
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #111',
    paddingBottom: '0.5rem',
  },
  section: {
    marginBottom: '2rem',
    padding: '1rem',
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#555',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: '4/3',
    backgroundColor: '#000',
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: '1.1rem',
    marginBottom: '0.75rem',
  },
  priorityList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  priorityItem: {
    display: 'grid',
    gridTemplateColumns: '1.5rem 8rem 3.5rem 1fr',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.4rem',
  },
  rank: { color: '#888', fontSize: '0.85rem' },
  categoryName: { fontWeight: '600' },
  confidence: { color: '#333', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#333',
    borderRadius: 4,
    transition: 'width 0.15s ease',
  },
  placeholder: { color: '#888', fontStyle: 'italic' },
  debugLabel: { fontSize: '0.8rem', color: '#888', margin: '0.75rem 0 0.25rem' },
  codeBlock: {
    backgroundColor: '#f0f0f0',
    padding: '0.75rem',
    borderRadius: 4,
    fontSize: '0.75rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  error: { color: '#c00', marginTop: '0.5rem' },
};
