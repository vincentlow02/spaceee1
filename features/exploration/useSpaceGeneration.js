'use client';

import { useEffect, useRef, useState } from 'react';

/** Snapshot-only generation. Live recognition and provider details stay outside. */
export function useSpaceGeneration() {
  const [generation,setGeneration] = useState({status:'idle'});
  const requestRef = useRef(null);
  const snapshotRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(),[]);

  async function generate(snapshot) {
    if (requestRef.current || !snapshot) return;
    snapshotRef.current = snapshot;
    const controller = new AbortController();
    requestRef.current = controller;
    setGeneration({status:'generating',snapshot});
    try {
      const response = await fetch('/api/generate-space',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({snapshot}),signal:controller.signal,
      });
      const result = await response.json();
      if (!response.ok || typeof result.imageUrl !== 'string' || !result.imageUrl.trim()) throw new Error(result.error || 'Generation failed. Please try again.');
      setGeneration({status:'success',imageUrl:result.imageUrl,snapshot});
    } catch (failure) {
      if (failure.name !== 'AbortError') setGeneration({status:'error',error:failure.message,snapshot});
    } finally {if (requestRef.current === controller) requestRef.current = null;}
  }

  function retry() { return generate(snapshotRef.current); }
  function reset() {
    if (requestRef.current) return;
    snapshotRef.current = null;
    setGeneration({status:'idle'});
  }

  return {generation,generate,retry,reset,isPending:() => Boolean(requestRef.current)};
}
