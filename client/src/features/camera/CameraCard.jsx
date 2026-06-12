import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Badge from '../../components/Badge.jsx';
import useObjectDetection from './useObjectDetection.js';
import { PERSON_CLASSES, ANIMAL_CLASSES } from './detectionClasses.js';

const BORDER = {
  RED: 'border-red-500/70 shadow-glow-red',
  YELLOW: 'border-amber-500/70 shadow-glow-amber',
  GREEN: 'border-emerald-500/40 shadow-glow-green',
};

const BOX_COLOR = {
  RED: '#ef4444',
  YELLOW: '#f59e0b',
  GREEN: '#22c55e',
};

/**
 * One camera tile.
 *
 * @param {object} props
 * @param {{id,name,location,src}} props.camera
 * @param {object|null} props.model
 * @param {string} props.modelStatus            'loading'|'ready'|'error'
 * @param {{severity:string}|null} props.override  forced severity (simulation) or null
 * @param {boolean} props.useWebcam             this card owns the webcam
 * @param {(id:string)=>void} props.onToggleWebcam
 * @param {(payload)=>void} props.onSeverity    reports severity transitions to parent
 */
export default function CameraCard({
  camera,
  model,
  modelStatus,
  override,
  useWebcam,
  onToggleWebcam,
  onSeverity,
  onSourceState,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastSeverityRef = useRef(null);

  const [videoError, setVideoError] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  const sourceLive = useWebcam ? streamReady && !videoError : !videoError;

  // Detection runs against the real pixel source (file or webcam) when not simulating.
  const detectionEnabled = !override && sourceLive && modelStatus === 'ready';
  const { predictions, severity: detected } = useObjectDetection({
    videoRef,
    model,
    enabled: detectionEnabled,
  });

  // Effective severity: simulation override wins; else detection; else GREEN/idle.
  const effective = override
    ? { severity: override.severity, label: override.label, matched: override.matched || [] }
    : detected || { severity: sourceLive ? 'GREEN' : null, label: 'All clear', matched: [] };

  const severity = effective.severity;

  // --- Webcam binding -------------------------------------------------------
  useEffect(() => {
    if (!useWebcam) {
      // release any held stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStreamReady(false);
      return undefined;
    }

    let cancelled = false;
    setVideoError(false);

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStreamReady(true);
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) setVideoError(true);
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStreamReady(false);
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };
  }, [useWebcam]);

  // --- Report severity transitions up (de-duped) ----------------------------
  // Key on severity + simulated so that (a) a steady detection only logs once,
  // and (b) a Simulate click always registers as a distinct event even if it
  // matches the color already showing.
  useEffect(() => {
    if (!severity) return;
    const key = `${severity}:${override ? 'sim' : 'live'}`;
    if (lastSeverityRef.current === key) return;
    lastSeverityRef.current = key;
    onSeverity?.({
      cameraId: camera.id,
      cameraName: camera.name,
      location: camera.location,
      severity,
      label: effective.label,
      matched: effective.matched,
      simulated: !!override,
      at: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, override]);

  // Report whether this feed currently has a live source (file or webcam) so
  // the page can drive the setup checklist. Reports false when the tile unmounts.
  useEffect(() => {
    onSourceState?.(camera.id, sourceLive);
    return () => onSourceState?.(camera.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLive, camera.id]);

  // --- Draw bounding boxes overlay ------------------------------------------
  // We use object-contain on the <video>, so the video is letterboxed inside
  // the display container. We must translate bbox coords (in video-pixel space)
  // to display-pixel space, accounting for the letterbox offset & scale.
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');

    // Match canvas display size exactly (NOT the video's natural resolution)
    const dw = canvas.clientWidth;
    const dh = canvas.clientHeight;
    if (canvas.width !== dw) canvas.width = dw;
    if (canvas.height !== dh) canvas.height = dh;

    ctx.clearRect(0, 0, dw, dh);

    if (override || !predictions.length) return;

    const vw = video.videoWidth || dw;
    const vh = video.videoHeight || dh;

    // Compute how object-contain places the video inside the display rect
    const videoAR = vw / vh;
    const displayAR = dw / dh;
    let renderedW, renderedH, offsetX, offsetY;
    if (videoAR > displayAR) {
      // Video is wider than display → letterboxed top & bottom
      renderedW = dw;
      renderedH = dw / videoAR;
      offsetX = 0;
      offsetY = (dh - renderedH) / 2;
    } else {
      // Video is taller than display → pillarboxed left & right
      renderedH = dh;
      renderedW = dh * videoAR;
      offsetX = (dw - renderedW) / 2;
      offsetY = 0;
    }

    const scaleX = renderedW / vw;
    const scaleY = renderedH / vh;

    predictions
      .filter((p) => p.score >= 0.5)
      .forEach((p) => {
        const [bx, by, bw, bh] = p.bbox;
        // Map to display coordinates
        const dx = offsetX + bx * scaleX;
        const dy = offsetY + by * scaleY;
        const dbw = bw * scaleX;
        const dbh = bh * scaleY;

        let color = '#38bdf8';
        if (PERSON_CLASSES.includes(p.class)) {
          color = BOX_COLOR.RED;
        } else if (ANIMAL_CLASSES.includes(p.class)) {
          color = BOX_COLOR.YELLOW;
        }
        const lw = Math.max(1.5, dw * 0.003);
        ctx.lineWidth = lw;
        ctx.strokeStyle = color;
        ctx.strokeRect(dx, dy, dbw, dbh);

        // Label background + text
        const tag = `${p.class} ${(p.score * 100) | 0}%`;
        const fontSize = Math.max(10, dw * 0.018);
        ctx.font = `bold ${fontSize}px ui-monospace, monospace`;
        const tw = ctx.measureText(tag).width;
        const th = fontSize + 6;
        const labelY = dy > th + 2 ? dy - th : dy + dbh;
        ctx.fillStyle = color;
        ctx.fillRect(dx, labelY, tw + 10, th);
        ctx.fillStyle = '#000';
        ctx.fillText(tag, dx + 5, labelY + th - 4);
      });
  }, [predictions, override, severity]);

  const showPlaceholder = !useWebcam && videoError;
  const showWebcamError = useWebcam && videoError;
  const camNum = camera.id.replace(/[^0-9]/g, '');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`group flex h-full flex-col overflow-hidden rounded-xl border-2 transition-all duration-300 w-full bg-ops-card ${
        severity ? BORDER[severity] : 'border-ops-border'
      }`}
    >
      {/* Video stage — flex-1 so it fills the grid cell height, object-contain shows full frame */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {!showPlaceholder ? (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            muted
            loop={!useWebcam}
            autoPlay
            playsInline
            {...(!useWebcam ? { src: camera.src } : {})}
            onError={() => setVideoError(true)}
            onLoadedData={() => setVideoError(false)}
          />
        ) : (
          <NoSignal camNum={camNum} />
        )}

        {showWebcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ops-card">
            <div className="text-center">
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="font-mono text-[10px] font-bold tracking-widest text-ops-text uppercase">Webcam Error</p>
              <p className="mt-0.5 text-[10px] text-ops-text-muted">Permission denied or no camera.</p>
            </div>
          </div>
        )}

        {/* bounding boxes overlay — pointer-events:none, no blur */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Top overlay: camera name + REC indicator — solid pill */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <div className="rounded-md bg-black/75 px-2 py-1 border border-white/10">
            <div className="font-mono text-[11px] font-bold tracking-wide text-white leading-tight">
              {camera.name}
            </div>
            <div className="text-[9px] text-white/60 leading-tight">{camera.location}</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-black/75 px-2 py-1 border border-white/10">
            <span
              className={`h-2 w-2 rounded-full ${sourceLive ? 'bg-red-500 animate-pulse-rec' : 'bg-slate-500'}`}
            />
            <span className="font-mono text-[10px] font-bold tracking-widest text-white/80">
              {sourceLive ? 'REC' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Bottom overlay: severity badge — solid pill */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2">
          <div>
            {severity ? (
              <Badge severity={severity} />
            ) : (
              <Badge tone="neutral">No feed</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {modelStatus === 'loading' && !override && sourceLive && (
              <span className="rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] text-sky-400 border border-white/10">
                loading model…
              </span>
            )}
            {modelStatus === 'error' && !override && (
              <span className="rounded-md bg-black/75 px-2 py-0.5 font-mono text-[10px] text-amber-400 border border-white/10">
                model offline
              </span>
            )}
            {override && (
              <span className="rounded-md bg-sky-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                SIM
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer controls — fully solid */}
      <div className="flex items-center justify-between gap-2 border-t border-ops-border bg-ops-card px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-ops-text-muted min-w-0">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${matchedDot(effective)}`} />
          <span className="truncate">
            {effective.matched?.length
              ? effective.matched.join(', ')
              : sourceLive
                ? 'monitoring…'
                : 'standby'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleWebcam(camera.id)}
          className={`btn shrink-0 px-2.5 py-1 text-xs ${
            useWebcam
              ? 'bg-sky-600 text-white ring-0'
              : 'btn-ghost'
          }`}
          aria-pressed={useWebcam}
          aria-label={useWebcam ? `Stop webcam on ${camera.name}` : `Use webcam on ${camera.name}`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.55-2.27A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {useWebcam ? 'Webcam on' : 'Webcam'}
        </button>
      </div>
    </motion.div>
  );
}

function matchedDot(effective) {
  if (effective.severity === 'RED') return 'bg-red-400';
  if (effective.severity === 'YELLOW') return 'bg-amber-400';
  if (effective.severity === 'GREEN') return 'bg-emerald-400';
  return 'bg-slate-600';
}

function NoSignal({ camNum }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ops-card overflow-hidden">
      {/* Dot grid pattern */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.4) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />

      <div className="relative z-10 text-center animate-fade-in">
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <p className="font-mono text-[10px] font-bold tracking-widest text-ops-text uppercase">Feed Standby</p>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-ops-text-muted">
          Cam {camNum || 'N'} · No Source
        </p>
      </div>
    </div>
  );
}
