'use client';

import { useState } from 'react';
import { getLibraryMaterials } from '@/lib/materials/materials';
import MaterialCard from './MaterialCard';
import styles from './MaterialLibrary.module.css';

const CATEGORIES = ['All', 'Wood', 'Stone', 'Fabric', 'Metal', 'Plastic'];

export default function MaterialLibrary({onClose, targetPosition, selectedMaterialIds = []}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const searchTerm = query.trim().toLowerCase();
  const materials = getLibraryMaterials().filter(material => [material.name, material.japaneseName, material.supplier?.name, material.sourceName, material.productCode].some(value => value?.toLowerCase().includes(searchTerm)) && (category === 'All' || material.category?.toLowerCase() === category.toLowerCase()));
  return <section className={styles.library} aria-label="Material Library">
    <header className={styles.header}><h2>Materials Library</h2><button type="button" onClick={onClose} aria-label="Close Material Library">×</button></header>
    <div className={styles.categories} role="group" aria-label="Material categories">{CATEGORIES.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <label className={styles.search}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input aria-label="Search materials" placeholder="Search materials..." value={query} onChange={event => setQuery(event.target.value)} /></label>
    <ul className={styles.grid}>{materials.map(material => <li key={material.id}><MaterialCard material={material} selected={selectedMaterialIds.includes(material.id)} /></li>)}</ul>
    {materials.length === 0 && <p className={styles.empty} role="status">{query ? 'No matching materials.' : 'Material categories are not populated yet.'}</p>}
    <p className={styles.hint}>{targetPosition ? `Drag a material to Slot ${targetPosition}.` : 'Drag a material into any slot.'}</p>
  </section>;
}
