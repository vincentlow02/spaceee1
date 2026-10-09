'use client';

import { useState } from 'react';
import { emptyMaterialSelection, resolveMaterialSelection, selectLibraryMaterial, removeLibraryMaterial } from './materialSelectionState.js';

export function useMaterialSelection(liveState, cameraAvailable) {
  const [overrides, setOverrides] = useState(emptyMaterialSelection);
  const selection = resolveMaterialSelection(overrides, liveState, cameraAvailable);
  return {
    selection,
    selectLibrary: (position, id) => setOverrides(current => selectLibraryMaterial(current, position, id)),
    removeLibrary: position => setOverrides(current => removeLibraryMaterial(current, position)),
    clearSelection: () => setOverrides(emptyMaterialSelection()),
  };
}
