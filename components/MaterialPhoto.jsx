'use client';

/* Product cutouts are dynamic local assets, displayed without cropping. */
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { getMaterialPresentation } from '@/features/materials/materialPresentation';
import { resolveTemporaryMaterialInformation } from '@/features/materials/temporaryMaterialInformation';

export default function MaterialPhoto({ materialId, material, className, placeholderClassName }) {
  const { imageSrc } = material || getMaterialPresentation(materialId);
  const [failed, setFailed] = useState(false);
  if (!imageSrc || failed) return <span className={placeholderClassName} aria-label="Product photo not supplied yet">Photo<br />coming soon</span>;
  return <img className={className} src={imageSrc} alt={material?.name || resolveTemporaryMaterialInformation(materialId).name} onError={() => setFailed(true)} />;
}
