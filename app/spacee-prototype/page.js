'use client';

import { useState } from 'react';
import { getMockMaterial } from '@/features/materials/mockMaterialCatalog';
import {
  createExplorationSnapshot,
  getDiscoverEligibility,
} from '@/features/recognition/positionRecognition';
import {
  MOCK_POSITION_SCENARIOS,
  createMockPositionRecognition,
} from '@/features/recognition/mockPositionRecognition';

function materialName(materialId) {
  return getMockMaterial(materialId)?.name || 'Unknown material';
}

export default function SpaceePrototypePage() {
  const [scenarioName, setScenarioName] = useState('valid');
  const [liveState, setLiveState] = useState(() => createMockPositionRecognition('valid'));
  const [snapshot, setSnapshot] = useState(null);

  const eligibility = getDiscoverEligibility(liveState);

  function simulateRecognition(nextScenario) {
    setScenarioName(nextScenario);
    setLiveState(createMockPositionRecognition(nextScenario));
  }

  function handleDiscover() {
    if (!eligibility.eligible) return;
    setSnapshot(createExplorationSnapshot(liveState));
  }

  return (
    <main className="spacee-shell">
      <header className="spacee-header">
        <a className="spacee-wordmark" href="#top" aria-label="Spacee home">SPACEE</a>
        <p>Physical material disk / position recognition</p>
        <span>Phase 4A</span>
      </header>

      <section className="spacee-hero position-hero" id="top">
        <p className="spacee-kicker">Position-based recognition contract</p>
        <h1>Position becomes<br /><em>priority.</em></h1>
        <p className="spacee-intro">
          Three fixed positions mirror the future physical material disk. Recognition confidence
          describes certainty only; it never determines material order or priority.
        </p>
        <div className="spacee-flow" aria-label="Phase 4A data flow">
          <span>01 Observe</span><i>→</i><span>02 Validate</span><i>→</i><span>03 Discover</span>
        </div>
      </section>

      <section className="spacee-section" aria-labelledby="disk-heading">
        <div className="spacee-section-heading">
          <div><span>01 / LIVE STATE</span><h2 id="disk-heading">Physical disk mirror</h2></div>
          <p>Position-aware mock feed</p>
        </div>

        <div className="disk-stage">
          <div className="disk-ring" aria-hidden="true"><i /><i /><i /></div>
          <div className="position-grid">
            {liveState.positions.map((entry) => {
              const isRecognized = entry.status === 'recognized';
              return (
                <article
                  className={`position-card position-card-${entry.position}${isRecognized ? ' is-recognized' : ' is-unknown'}`}
                  key={entry.position}
                >
                  <div className="position-card-heading">
                    <span>Position {entry.position}</span>
                    <small>Priority {entry.position}</small>
                  </div>
                  <strong>{isRecognized ? materialName(entry.materialId) : 'Unknown'}</strong>
                  <code>{entry.materialId || 'no-material-id'}</code>
                  <div className="position-status">
                    <span><i />{entry.status}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="spacee-section mock-controls" aria-labelledby="simulation-heading">
        <div className="spacee-section-heading">
          <div><span>02 / DEVELOPMENT CONTROL</span><h2 id="simulation-heading">Simulate movement</h2></div>
          <p>Temporary mock mechanism</p>
        </div>
        <p className="control-intro">
          These controls simulate future camera updates. They do not represent the final physical interaction.
        </p>
        <div className="scenario-controls">
          {Object.entries(MOCK_POSITION_SCENARIOS).map(([key, scenario]) => (
            <button
              className={scenarioName === key ? 'is-active' : ''}
              type="button"
              key={key}
              aria-pressed={scenarioName === key}
              onClick={() => simulateRecognition(key)}
            >
              <span>{scenario.label}</span>
              <small>{key}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="spacee-section discover-stage" aria-labelledby="discover-heading">
        <div className="spacee-section-heading">
          <div><span>03 / CAPTURE</span><h2 id="discover-heading">Discover arrangement</h2></div>
          <p>Explicit session boundary</p>
        </div>

        <div className={`eligibility-panel${eligibility.eligible ? ' is-ready' : ' is-blocked'}`}>
          <div>
            <span className="readiness-dot" />
            <strong>{eligibility.eligible ? 'Ready to discover' : 'Discover unavailable'}</strong>
            <p>{eligibility.message}</p>
          </div>
          <button type="button" disabled={!eligibility.eligible} onClick={handleDiscover}>
            DISCOVER <span>↗</span>
          </button>
        </div>

        <div className="position-rule">
          <span>Position 1 = Priority 1</span>
          <span>Position 2 = Priority 2</span>
          <span>Position 3 = Priority 3</span>
        </div>
      </section>

      <section className="spacee-result" aria-labelledby="snapshot-heading">
        <div className="spacee-section-heading">
          <div><span>04 / SNAPSHOT</span><h2 id="snapshot-heading">Exploration snapshot</h2></div>
          <p>{snapshot ? 'Captured and immutable' : 'Waiting for DISCOVER'}</p>
        </div>

        {snapshot ? (
          <div className="snapshot-panel">
            <div className="snapshot-meta">
              <span>Session</span><code>{snapshot.sessionId}</code>
              <span>Status</span><strong>{snapshot.status}</strong>
              <span>Created</span><time dateTime={snapshot.createdAt}>{new Date(snapshot.createdAt).toLocaleTimeString()}</time>
            </div>
            <div className="snapshot-materials">
              {snapshot.materials.map((entry) => (
                <article key={entry.position}>
                  <span>Priority {entry.priority}</span>
                  <strong>{materialName(entry.materialId)}</strong>
                  <code>{entry.materialId}</code>
                  <small>Captured from position {entry.position}</small>
                </article>
              ))}
            </div>
            <p className="snapshot-note">
              This snapshot will not change when the live mock recognition state changes above.
            </p>
          </div>
        ) : (
          <div className="snapshot-empty">
            <span>①</span><span>②</span><span>③</span>
            <strong>No exploration captured</strong>
            <p>A valid live arrangement becomes a session only after DISCOVER is pressed.</p>
          </div>
        )}
      </section>

      <footer className="spacee-footer">
        <span>SPACEE / PHASE 4A</span><p>Live recognition is not an exploration session.</p><span>2026</span>
      </footer>
    </main>
  );
}
