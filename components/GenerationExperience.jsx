'use client';

import LiveRefinementResult from './refinement/LiveRefinementResult';

/** Keep one continuous refinement surface while generation changes state. */
export default function GenerationExperience({generation,headingClassName,onRetry,onExplore}) {
  return <LiveRefinementResult generation={generation} headingClassName={headingClassName} onRetry={onRetry} onExplore={onExplore}/>;
}
