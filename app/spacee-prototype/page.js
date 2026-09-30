'use client';

/**
 * SpaceePrototype page  —  app/spacee-prototype/page.js
 *
 * Phase 1 + Phase 2 debug screen.
 *
 * Data flow:
 *   Camera → Teachable Machine → recognitionHandler
 *     → createMaterialFromRecognition → selectMaterial / removeMaterial
 *       → updateSessionMaterials → explorationSession state
 *
 * UI layers are strictly separated from business logic:
 *   - All selection logic lives in features/exploration/materialSelection.js
 *   - All session logic lives in features/exploration/explorationSession.js
 *   - This file only calls those functions and displays the result
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ── Phase 1 layers ────────────────────────────────────────────────────────────
import Camera from '@/components/Camera';
import { loadModel, startPredictionLoop } from '@/lib/teachableMachine';
import { processRecognitionResult } from '@/features/recognition/recognitionHandler';

// ── Phase 2 layers ────────────────────────────────────────────────────────────
import { createMaterialFromRecognition } from '@/features/exploration/explorationState';
import {
  selectMaterial,
  removeMaterial,
  clearSelection,
  canAddMaterial,
  MAX_SELECTION,
} from '@/features/exploration/materialSelection';
import {
  createSession,
  updateSessionMaterials,
  advanceSessionStatus,
  SESSION_STATUSES,
} from '@/features/exploration/explorationSession';

// ── Configuration ─────────────────────────────────────────────────────────────
const MODEL_URL = process.env.NEXT_PUBLIC_TEACHABLE_MODEL_URL;

// =============================================================================

export default function SpaceePrototypePage() {
  // ── Phase 1 state ───────────────────────────────────────────────────────────
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [rawPredictions, setRawPredictions] = useState(null);
  const [modelStatus, setModelStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const predictionLoopRef = useRef(null);

  // ── Phase 2 state ───────────────────────────────────────────────────────────
  // The current material object built from the latest recognition result
  const [currentMaterial, setCurrentMaterial] = useState(null);
  // Selected materials list (up to MAX_SELECTION)
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  // Exploration session
  const [session, setSession] = useState(() => createSession());

  // ── Sync session whenever selectedMaterials changes ─────────────────────────
  useEffect(() => {
    setSession((prev) => updateSessionMaterials(prev, selectedMaterials));
  }, [selectedMaterials]);

  // ── Phase 1: camera → TM model ──────────────────────────────────────────────
  const handleVideoReady = useCallback(async (videoElement) => {
    if (!MODEL_URL) {
      setModelStatus('error');
      return;
    }
    setModelStatus('loading');
    try {
      const model = await loadModel(MODEL_URL);
      setModelStatus('ready');

      predictionLoopRef.current = startPredictionLoop(
        model,
        videoElement,
        (predictions) => {
          setRawPredictions(predictions);

          // Phase 1 → structured recognition result
          const result = processRecognitionResult(predictions);
          setRecognitionResult(result);

          // Phase 2 → build material object from latest prediction
          const material = createMaterialFromRecognition(result);
          setCurrentMaterial(material);
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

  // ── Phase 2: selection actions ───────────────────────────────────────────────

  /** Capture the current detection and add it to the selection. */
  const handleAddMaterial = useCallback(() => {
    if (!currentMaterial) return;
    setSelectedMaterials((prev) => selectMaterial(prev, currentMaterial));
  }, [currentMaterial]);

  /** Remove a specific material by id. */
  const handleRemoveMaterial = useCallback((materialId) => {
    setSelectedMaterials((prev) => removeMaterial(prev, materialId));
  }, []);

  /** Clear all selected materials and reset session status. */
  const handleClearSelection = useCallback(() => {
    setSelectedMaterials(clearSelection());
    setSession((prev) => advanceSessionStatus(prev, SESSION_STATUSES.SELECTING));
  }, []);

  /** Mark session as ready when 3 materials are selected. */
  const handleMarkReady = useCallback(() => {
    setSession((prev) =>
      advanceSessionStatus(prev, SESSION_STATUSES.READY_FOR_GENERATION)
    );
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmtPct = (confidence) => `${Math.round(confidence * 100)}%`;

  const selectionFull = !canAddMaterial(selectedMaterials);
  const canMarkReady =
    selectedMaterials.length > 0 &&
    session.status === SESSION_STATUSES.SELECTING;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main style={s.page}>
      <h1 style={s.title}>Spacee — Phase 1 + 2 Prototype</h1>

      {/* ── Status ──────────────────────────────────────────────────────────── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Status</h2>
        <p>
          Model: <strong>
            {modelStatus === 'idle' && 'Waiting for camera…'}
            {modelStatus === 'loading' && 'Loading Teachable Machine model…'}
            {modelStatus === 'ready' && '✓ Running'}
            {modelStatus === 'error' &&
              (MODEL_URL
                ? '✗ Failed to load model (see console)'
                : '✗ NEXT_PUBLIC_TEACHABLE_MODEL_URL not set')}
          </strong>
        </p>
        <p>
          Session: <strong>{session.id}</strong> —{' '}
          <strong style={s.statusBadge(session.status)}>{session.status}</strong>
        </p>
        {cameraError && <p style={s.error}>{cameraError}</p>}
      </section>

      {/* ── Camera ──────────────────────────────────────────────────────────── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Camera</h2>
        <div style={s.cameraContainer}>
          <Camera onVideoReady={handleVideoReady} onError={handleCameraError} />
        </div>
      </section>

      {/* ── Current Recognition (Phase 2) ────────────────────────────────────── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Current Recognition</h2>

        {recognitionResult ? (
          <div style={s.currentDetection}>
            <div style={s.detectionInfo}>
              <span style={s.detectionCategory}>
                {recognitionResult.primaryCategory}
              </span>
              <span style={s.detectionConfidence}>
                {fmtPct(recognitionResult.priority[0].confidence)}
              </span>
            </div>

            <button
              style={selectionFull ? s.btnDisabled : s.btnAdd}
              onClick={handleAddMaterial}
              disabled={selectionFull}
              title={selectionFull ? `Maximum ${MAX_SELECTION} materials reached` : 'Add to selection'}
            >
              {selectionFull ? `Full (${MAX_SELECTION}/${MAX_SELECTION})` : '+ Add Material'}
            </button>
          </div>
        ) : (
          <p style={s.placeholder}>
            No detection yet — allow camera access and wait for the model.
          </p>
        )}
      </section>

      {/* ── Selected Materials (Phase 2) ─────────────────────────────────────── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Selected Materials</h2>

        <p style={s.selectionCount}>
          {selectedMaterials.length} / {MAX_SELECTION}
        </p>

        {selectedMaterials.length === 0 ? (
          <p style={s.placeholder}>No materials selected yet.</p>
        ) : (
          <ol style={s.selectedList}>
            {selectedMaterials.map((mat, idx) => (
              <li key={mat.id} style={s.selectedItem}>
                <span style={s.selectedRank}>{idx + 1}.</span>
                <span style={s.selectedName}>{mat.name}</span>
                <span style={s.selectedCategory}>({mat.category})</span>
                <span style={s.selectedConf}>{fmtPct(mat.confidence)}</span>
                <button
                  style={s.btnRemove}
                  onClick={() => handleRemoveMaterial(mat.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}

        <div style={s.selectionActions}>
          <button
            style={canMarkReady ? s.btnReady : s.btnDisabled}
            onClick={handleMarkReady}
            disabled={!canMarkReady}
          >
            Mark Ready for Generation
          </button>
          <button
            style={selectedMaterials.length > 0 ? s.btnClear : s.btnDisabled}
            onClick={handleClearSelection}
            disabled={selectedMaterials.length === 0}
          >
            Clear All
          </button>
        </div>
      </section>

      {/* ── Phase 1: Full recognition list ───────────────────────────────────── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Recognition Priority (Phase 1)</h2>

        {recognitionResult ? (
          <ol style={s.priorityList}>
            {recognitionResult.priority.map((item, idx) => (
              <li key={item.category} style={s.priorityItem}>
                <span style={s.rank}>{idx + 1}.</span>
                <span style={s.categoryName}>{item.category}</span>
                <span style={s.confidence}>{fmtPct(item.confidence)}</span>
                <div style={s.barTrack}>
                  <div style={{ ...s.barFill, width: fmtPct(item.confidence) }} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p style={s.placeholder}>Waiting for predictions…</p>
        )}
      </section>

      {/* ── Raw Debug ────────────────────────────────────────────────────────── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Raw Data Debug</h2>

        <h3 style={s.debugLabel}>Exploration Session</h3>
        <pre style={s.codeBlock}>{JSON.stringify(session, null, 2)}</pre>

        <h3 style={s.debugLabel}>Current Material Object</h3>
        <pre style={s.codeBlock}>
          {currentMaterial ? JSON.stringify(currentMaterial, null, 2) : 'null'}
        </pre>

        <h3 style={s.debugLabel}>Recognition Result (Phase 1)</h3>
        <pre style={s.codeBlock}>
          {recognitionResult ? JSON.stringify(recognitionResult, null, 2) : 'null'}
        </pre>

        <h3 style={s.debugLabel}>Raw Teachable Machine Predictions</h3>
        <pre style={s.codeBlock}>
          {rawPredictions ? JSON.stringify(rawPredictions, null, 2) : 'null'}
        </pre>
      </section>
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
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

  // ── Current detection ──
  currentDetection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  detectionInfo: { display: 'flex', alignItems: 'baseline', gap: '0.75rem' },
  detectionCategory: { fontSize: '1.4rem', fontWeight: '700' },
  detectionConfidence: { fontSize: '1rem', color: '#555' },

  // ── Selected materials ──
  selectionCount: {
    fontSize: '0.85rem',
    color: '#888',
    marginBottom: '0.5rem',
  },
  selectedList: { listStyle: 'none', padding: 0, margin: '0 0 1rem' },
  selectedItem: {
    display: 'grid',
    gridTemplateColumns: '1.5rem 7rem 6rem 3.5rem 1fr',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.35rem 0',
    borderBottom: '1px solid #f0f0f0',
  },
  selectedRank: { color: '#aaa', fontSize: '0.85rem' },
  selectedName: { fontWeight: '600' },
  selectedCategory: { color: '#888', fontSize: '0.8rem' },
  selectedConf: { color: '#333', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' },
  selectionActions: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },

  // ── Buttons ──
  btnAdd: {
    padding: '0.4rem 0.9rem',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  btnRemove: {
    padding: '0.25rem 0.6rem',
    background: 'transparent',
    color: '#c00',
    border: '1px solid #c00',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.75rem',
    justifySelf: 'end',
  },
  btnReady: {
    padding: '0.4rem 0.9rem',
    background: '#2a7',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  btnClear: {
    padding: '0.4rem 0.9rem',
    background: 'transparent',
    color: '#666',
    border: '1px solid #ccc',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  btnDisabled: {
    padding: '0.4rem 0.9rem',
    background: '#eee',
    color: '#aaa',
    border: '1px solid #ddd',
    borderRadius: 4,
    cursor: 'not-allowed',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },

  // ── Status badge ──
  statusBadge: (status) => ({
    padding: '0.1rem 0.5rem',
    borderRadius: 4,
    fontSize: '0.8rem',
    background:
      status === SESSION_STATUSES.SELECTING
        ? '#eef'
        : status === SESSION_STATUSES.READY_FOR_GENERATION
        ? '#efe'
        : '#fee',
    color:
      status === SESSION_STATUSES.SELECTING
        ? '#44a'
        : status === SESSION_STATUSES.READY_FOR_GENERATION
        ? '#272'
        : '#a44',
  }),

  // ── Phase 1 priority list ──
  priorityList: { listStyle: 'none', padding: 0, margin: 0 },
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
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#eee', overflow: 'hidden' },
  barFill: {
    height: '100%',
    backgroundColor: '#333',
    borderRadius: 4,
    transition: 'width 0.15s ease',
  },

  // ── Misc ──
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
