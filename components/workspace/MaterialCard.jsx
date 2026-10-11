'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MATERIAL_DRAG_TYPE } from '@/features/materials/materialSelectionState';
import styles from './MaterialLibrary.module.css';

export default function MaterialCard({material, selected = false}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const supplierUrl = material.sourceUrl;

  return <article
    className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
    draggable
    onDragStart={event => {
      event.dataTransfer.setData(MATERIAL_DRAG_TYPE, material.id);
      event.dataTransfer.effectAllowed = 'copy';
    }}
    aria-label={`Drag ${material.name} to a material slot`}
  >
    <div className={styles.imageFrame} style={{'--material-image-scale': material.imageScale ?? 1}}>
      {material.imageSrc && !imageFailed
        ? <Image className={styles.productImage} src={material.imageSrc} alt={`${material.name} material surface`} fill sizes="(max-width: 700px) 45vw, 150px" onError={() => setImageFailed(true)} />
        : <div className={styles.imageFallback} role="img" aria-label={`${material.name} image unavailable`}>Image coming soon</div>}
    </div>
    <div className={styles.cardFooter}>
      <span className={styles.supplierLogo} aria-label={`${material.supplier?.name ?? 'Supplier'} logo`}>
        {material.supplier?.logoSrc && !logoFailed
          ? <Image src={material.supplier.logoSrc} alt="" width={21} height={24} unoptimized onError={() => setLogoFailed(true)} />
          : <span aria-hidden="true">{material.supplier?.mark ?? material.supplier?.name?.slice(0, 2).toUpperCase() ?? 'M'}</span>}
      </span>
      <div className={styles.cardNames}>
        {supplierUrl
          ? <a className={styles.name} href={supplierUrl} target="_blank" rel="noopener noreferrer" title="Double-click to open supplier product page" draggable="false" onDragStart={event => {event.preventDefault(); event.stopPropagation();}} onClick={event => {if (event.detail === 1) event.preventDefault();}}>{material.name}</a>
          : <span className={styles.name}>{material.name}</span>}
        {material.japaneseName && <span className={styles.japaneseName}>{material.japaneseName}</span>}
      </div>
      {supplierUrl && <a className={styles.sourceLink} href={supplierUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${material.name} at ${material.supplier?.name ?? 'supplier'} website`}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M5 11 12 4M6 4h6v6" /></svg>
      </a>}
    </div>
  </article>;
}
