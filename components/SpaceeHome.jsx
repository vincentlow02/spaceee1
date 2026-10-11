'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveRecognition } from '@/features/recognition/useLiveRecognition';
import { useSpaceGeneration } from '@/features/exploration/useSpaceGeneration';
import { createMaterialSlots } from '@/features/materials/materialViewModel';
import { useMaterialSelection } from '@/features/materials/useMaterialSelection';
import { createMaterialSelectionSnapshot, getMaterialSelectionEligibility } from '@/features/materials/materialSelectionState';
import { getMaterialById } from '@/lib/materials/materials';
import GenerationExperience from './GenerationExperience';
import WorkspaceShell from './workspace/WorkspaceShell';
import CameraRecognitionPanel from './workspace/CameraRecognitionPanel';
import MaterialComposer from './workspace/MaterialComposer';
import MaterialLibrary from './workspace/MaterialLibrary';
import styles from './SpaceeHome.module.css';

const EMPTY_SECTIONS = {
  projects: {title:'Projects',description:'Saved spaces and exploration history will live here. Project storage is not connected yet.'},
  inspiration: {title:'Inspiration',description:'A place to revisit spatial ideas. No inspiration library has been connected yet.'},
};

export default function SpaceeHome({headingClassName,navigationFontClassName}) {
  const {liveState,status,error,videoRef,onVideoReady,onCameraError,resetRecognition} = useLiveRecognition();
  const [cameraStarted,setCameraStarted] = useState(false);
  const [cameraKey,setCameraKey] = useState(0);
  const [cameraStatus,setCameraStatus] = useState('idle');
  const [activePosition,setActivePosition] = useState(null);
  const [activeSection,setActiveSection] = useState('home');
  const [description,setDescription] = useState('');
  const [selectionNotice,setSelectionNotice] = useState('');
  const {generation,generate,retry,reset,isPending} = useSpaceGeneration();
  const {selection,selectLibrary,removeLibrary,clearSelection} = useMaterialSelection(liveState, cameraStatus === 'active' && status === 'running' && !error);
  const introRef = useRef(null);
  const sectionHeadingRef = useRef(null);
  const eligibility = getMaterialSelectionEligibility(selection, liveState);
  const readyToGenerate = eligibility.eligible;
  const isWorkspace = activeSection === 'home' || activeSection === 'materials';
  const section = EMPTY_SECTIONS[activeSection];
  const materials = createMaterialSlots(selection.map((entry,index) => ({...entry,position:index+1})));
  const recognizedCount = materials.filter(slot => slot.material).length;
  const composerHint = selectionNotice || (eligibility.reason === 'duplicate-material' ? 'Use a different material at each position.' : activePosition ? `Select or drop a material in Slot ${activePosition}.` : recognizedCount < 3 ? 'Choose three different materials using Camera or Library.' : '');

  useEffect(() => {if (activeSection !== 'home' && activeSection !== 'materials') sectionHeadingRef.current?.focus({preventScroll:true});},[activeSection]);

  function addLibraryMaterial(materialId, targetPosition) {
    if (isPending() || generation.status !== 'idle') return;
    if (!getMaterialById(materialId)) {setSelectionNotice('This material is not in the Library.'); return;}
    const position = targetPosition ?? activePosition ?? (selection.findIndex(slot => !slot.materialId) + 1 || null);
    if (!position) {setSelectionNotice('Select a slot to replace, or drag the material onto that slot.'); return;}
    selectLibrary(position, materialId);
    // Keep the Library workflow moving: after a successful placement, make
    // the next empty slot the target while still allowing direct slot drops.
    const nextEmptyPosition = selection.findIndex((slot, index) =>
      index + 1 !== position && !slot.materialId,
    ) + 1;
    setActivePosition(nextEmptyPosition || null);
    setSelectionNotice('');
  }

  function generateSpace() {
    if (isPending() || !readyToGenerate) return;
    return generate(createMaterialSelectionSnapshot(selection, liveState),description);
  }

  function clearAll() {
    if (isPending()) return;
    resetRecognition();
    clearSelection();
    setSelectionNotice('');
    setCameraStarted(false);
    setCameraStatus('idle');
    setActivePosition(null);
    setDescription('');
    reset();
  }

  function exploreAgain() {
    reset();
    setActivePosition(null);
    setActiveSection('home');
    requestAnimationFrame(() => introRef.current?.focus({preventScroll:true}));
  }

  return <div className={navigationFontClassName}>
    <WorkspaceShell activeSection={activeSection} onNavigate={setActiveSection} contentLayout={isWorkspace ? 'creation' : 'default'} materialPanel={activeSection === 'materials' && generation.status === 'idle' ? <MaterialLibrary targetPosition={activePosition} selectedMaterialIds={selection.filter(slot => slot.source === 'library').map(slot => slot.materialId)} onClose={() => setActiveSection('home')} /> : null}>
      {/* Keep recognition mounted across workspace navigation and generation. */}
      <div className={`${styles.homeContent} ${activeSection === 'materials' ? styles.libraryWorkspace : ''}`} hidden={!isWorkspace || generation.status !== 'idle'}>
        <header className={styles.intro}>
          <h1 ref={introRef} tabIndex={-1} className={headingClassName} data-node-id="119:11">Create a space<br />from real materials</h1>
          <p data-node-id="119:13">Place three materials on the platform, or choose from Materials.</p>
        </header>
        <CameraRecognitionPanel cameraStarted={cameraStarted} cameraKey={cameraKey} cameraStatus={cameraStatus} recognitionStatus={status} videoRef={videoRef} activePosition={activePosition} onEnableCamera={() => setCameraStarted(true)} onVideoReady={onVideoReady} onCameraError={onCameraError} onCameraStatusChange={setCameraStatus} error={error} onRestart={() => {resetRecognition(); setCameraStatus('idle'); setCameraStarted(true); setCameraKey(key => key + 1);}} />
        <MaterialComposer materials={materials} activePosition={activePosition} onSelectPosition={position => {setActivePosition(position); setSelectionNotice('');}} onDropMaterial={addLibraryMaterial} onRemoveLibrary={position => {removeLibrary(position); setSelectionNotice('');}} requirement={description} onRequirementChange={setDescription} onClear={clearAll} onGenerate={generateSpace} canGenerate={readyToGenerate} canClear={cameraStarted || recognizedCount > 0 || Boolean(description)} hint={composerHint} />
      </div>
      <div className={styles.generationContent} hidden={!isWorkspace || generation.status === 'idle'}>
        {generation.status !== 'idle' && <GenerationExperience generation={generation} headingClassName={headingClassName} onRetry={retry} onExplore={exploreAgain} />}
      </div>
      {section && <section className={styles.emptySection}><span>WORKSPACE</span><h1 ref={sectionHeadingRef} tabIndex={-1} className={headingClassName}>{section.title}</h1><p>{section.description}</p><button onClick={() => setActiveSection('home')}>Back to Home</button></section>}
    </WorkspaceShell>
  </div>;
}
