'use client';

/**
 * Camera.jsx
 *
 * Reusable webcam component.
 *
 * Responsibilities:
 *  - Request user camera permission
 *  - Initialise and display the live video stream
 *  - Expose the underlying <video> element via the onVideoReady callback
 *  - Clean up the MediaStream on unmount
 *
 * Props:
 *  - onVideoReady(videoElement): called once the video is playing.
 *                                Pass this element to startPredictionLoop().
 *  - onError(errorMessage):      called if permission is denied or camera fails.
 */

import { useEffect, useRef, useState } from 'react';

export default function Camera({ onVideoReady, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'requesting' | 'active' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      setStatus('requesting');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (cancelled) {
          // Component unmounted while permission was being requested
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;

        // Wait for video metadata to load before signalling readiness
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
        });

        await video.play();
        setStatus('active');

        if (onVideoReady) {
          onVideoReady(video);
        }
      } catch (err) {
        if (cancelled) return;

        const msg =
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access and reload.'
            : `Camera error: ${err.message}`;

        setStatus('error');
        setErrorMessage(msg);
        if (onError) onError(msg);
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      // Stop all tracks to release the camera hardware
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []); // Run once on mount; onVideoReady / onError are stable refs from parent

  return (
    <div className="camera-wrapper">
      {status === 'requesting' && (
        <p className="camera-status">Requesting camera permission…</p>
      )}

      {status === 'error' && (
        <p className="camera-error">{errorMessage}</p>
      )}

      {/* Video element is always in the DOM so the ref is available during setup */}
      <video
        ref={videoRef}
        className="camera-video"
        muted
        playsInline
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />
    </div>
  );
}
