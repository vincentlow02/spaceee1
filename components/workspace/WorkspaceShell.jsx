'use client';

/* Figma navigation assets retain their intrinsic SVG dimensions. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import SidebarAccount from './SidebarAccount';
import styles from './WorkspaceShell.module.css';

const NAVIGATION = [
  {id:'home',label:'Home',icon:'home.svg'},
  {id:'projects',label:'Projects',icon:'projects.svg'},
  {id:'materials',label:'Materials',icon:'materials.svg'},
  {id:'inspiration',label:'Inspiration',icon:'inspiration.svg'},
];

export default function WorkspaceShell({children,activeSection,onNavigate,contentLayout = 'default', materialPanel}) {
  const [navigationState,setNavigationState] = useState(() => ({section: activeSection, expanded: activeSection !== 'materials'}));
  // Reset the mode when the page changes, while allowing a manual toggle on this page.
  if (navigationState.section !== activeSection) {
    setNavigationState({section: activeSection, expanded: activeSection !== 'materials'});
  }
  const expanded = navigationState.section === activeSection ? navigationState.expanded : activeSection !== 'materials';
  const [mobileOpen,setMobileOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 701px)');
    function closeOnDesktop(event) { if (event.matches) setMobileOpen(false); }
    desktop.addEventListener('change',closeOnDesktop);
    return () => desktop.removeEventListener('change',closeOnDesktop);
  },[]);

  function navigation(mobile = false) {
    return <nav className={mobile ? 'mt-8 flex flex-col gap-5' : styles.navigation} aria-label="Main navigation">
      {NAVIGATION.map(item => <button key={item.id} className={mobile ? 'flex min-h-9 items-center gap-3 text-left text-sm text-spacee-ink hover:text-spacee-muted focus-visible:outline-2 focus-visible:outline-spacee-muted' : styles.navItem} aria-label={item.label} aria-current={activeSection === item.id ? 'page' : undefined} title={item.label} onClick={() => {onNavigate(item.id); setMobileOpen(false);}}>
        <span className={styles.navIcon}><img src={`/figma/workspace/${item.icon}`} alt="" /></span><span className={mobile ? '' : styles.navLabel}>{item.label}</span>
      </button>)}
    </nav>;
  }

  return <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}><div className={`${styles.shell} ${expanded ? '' : styles.collapsed}`} data-node-id="140:61">
    <aside id="workspace-sidebar" className={styles.sidebar} aria-label="Spaceee sidebar">
      <button className={styles.brand} aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={expanded} onClick={() => setNavigationState({section: activeSection, expanded: !expanded})} data-node-id="140:65">
        <span className={styles.brandName}>Spaceee</span><span className={styles.toggleIcon}><img src="/figma/workspace/sidebar-toggle.svg" alt="" /></span>
      </button>
      {navigation()}
      <div className={styles.accountFooter}><SidebarAccount compact={!expanded} /></div>
    </aside>
    <div className={`${styles.workspace} ${materialPanel ? styles.workspaceWithLibrary : ''}`}>
      {materialPanel && <div className={styles.materialPanel}>{materialPanel}</div>}
      <header className={styles.topBar}>
        <Dialog.Trigger asChild><button className={styles.mobileToggle} aria-label="Open sidebar"><span aria-hidden="true">☰</span><span>Spaceee</span></button></Dialog.Trigger>
      </header>
      <main className={`${styles.main} ${contentLayout === 'canvas' ? styles.canvasMain : ''} ${materialPanel ? styles.withMaterialPanel : ''}`}>{children}</main>
    </div>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
      <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[230px] max-w-[85vw] flex-col overflow-y-auto bg-white px-7 py-7 font-sans text-spacee-ink shadow-xl outline-none">
        <Dialog.Title className="text-xl font-medium">Spaceee</Dialog.Title>
        <Dialog.Description className="sr-only">Navigate your Spaceee workspace.</Dialog.Description>
        <Dialog.Close className="absolute top-6 right-4 flex size-9 items-center justify-center rounded-lg text-2xl text-spacee-muted hover:bg-[#faf9f7]" aria-label="Close sidebar">×</Dialog.Close>
        {navigation(true)}
        <div className="mt-auto pt-6"><SidebarAccount /></div>
      </Dialog.Content>
    </Dialog.Portal>
  </div></Dialog.Root>;
}
