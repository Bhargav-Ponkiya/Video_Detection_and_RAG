import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../../components/Badge.jsx';

import { CAMERAS } from './cameras.config.js';
import CameraCard from './CameraCard.jsx';
import CameraSelector from './CameraSelector.jsx';
import AlertLog from './AlertLog.jsx';
import useCocoModel from './useCocoModel.js';
import { SEVERITY_META } from './detectionClasses.js';

const MAX_ALERTS = 50;
const SIM_DURATION_MS = 5000;

export default function CameraMonitor() {
  const { model, status: modelStatus } = useCocoModel();

  const [visibleIds, setVisibleIds] = useState(CAMERAS.map((c) => c.id));
  const [webcamCardId, setWebcamCardId] = useState(null);
  const [simTarget, setSimTarget] = useState('all');
  const [overrides, setOverrides] = useState({}); // { [cameraId]: {severity,label,matched} }
  const [alerts, setAlerts] = useState([]);
  const [severities, setSeverities] = useState({}); // live per-camera severity
  const [signals, setSignals] = useState({}); // { [cameraId]: hasLiveSource }
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);

  const simTimers = useRef({});
  const lastAlertTimes = useRef({}); // { [cameraId]: timestamp }

  const visibleCameras = useMemo(
    () => CAMERAS.filter((c) => visibleIds.includes(c.id)),
    [visibleIds]
  );

  // Drop a hidden camera's webcam ownership and reset a now-hidden sim target.
  useEffect(() => {
    if (webcamCardId && !visibleIds.includes(webcamCardId)) setWebcamCardId(null);
    if (simTarget !== 'all' && !visibleIds.includes(simTarget)) setSimTarget('all');
  }, [visibleIds, webcamCardId, simTarget]);

  const handleToggleWebcam = useCallback((id) => {
    setWebcamCardId((cur) => (cur === id ? null : id));
  }, []);

  const handleSourceState = useCallback((id, ok) => {
    setSignals((prev) => (prev[id] === ok ? prev : { ...prev, [id]: ok }));
  }, []);

  // Append an alert on severity *transition* (de-duped by the card already).
  const handleSeverity = useCallback((payload) => {
    setSeverities((prev) => ({ ...prev, [payload.cameraId]: payload.severity }));
    if (payload.severity === 'GREEN') return; // GREEN resets are noise

    // Cooldown per-camera for live alerts (5 seconds) to prevent looping/flicker noise
    const now = Date.now();
    const lastTime = lastAlertTimes.current[payload.cameraId] || 0;
    if (!payload.simulated && (now - lastTime < 5000)) {
      return; // Skip logging alert
    }
    lastAlertTimes.current[payload.cameraId] = now;

    setAlerts((prev) => {
      const entry = { id: `${payload.cameraId}-${now}`, ...payload, at: now };
      return [entry, ...prev].slice(0, MAX_ALERTS);
    });
  }, []);

  // Fire a simulation across the targeted (visible) cameras; auto-clear after a few s.
  const handleSimulate = useCallback(
    (severity) => {
      const targets = simTarget === 'all' ? visibleIds : [simTarget];
      const meta = SEVERITY_META[severity];
      const payload = { severity, label: meta.label, matched: [] };

      setOverrides((prev) => {
        const next = { ...prev };
        targets.forEach((id) => {
          next[id] = payload;
        });
        return next;
      });

      targets.forEach((id) => {
        if (simTimers.current[id]) clearTimeout(simTimers.current[id]);
        simTimers.current[id] = setTimeout(() => {
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          delete simTimers.current[id];
        }, SIM_DURATION_MS);
      });
    },
    [simTarget, visibleIds]
  );

  useEffect(() => {
    const timers = simTimers.current;
    return () => Object.values(timers).forEach((t) => clearTimeout(t));
  }, []);

  const statusOf = useCallback(
    (id) => overrides[id]?.severity || severities[id],
    [overrides, severities]
  );

  // Summary counts over the *visible* cameras (matches what's on screen).
  const counts = useMemo(() => {
    const c = { RED: 0, YELLOW: 0, GREEN: 0 };
    visibleIds.forEach((id) => {
      const sev = overrides[id]?.severity || severities[id];
      if (sev && c[sev] !== undefined) c[sev] += 1;
    });
    return c;
  }, [overrides, severities, visibleIds]);

  const anySignal = useMemo(() => Object.values(signals).some(Boolean), [signals]);



  const modelBadge =
    modelStatus === 'ready'
      ? { tone: 'green', text: 'Model ready' }
      : modelStatus === 'loading'
        ? { tone: 'sky', text: 'Loading model…' }
        : { tone: 'amber', text: 'Model offline — sim only' };

  // Grid cols/rows to fill the space completely
  const numCams = visibleCameras.length;
  const gridCols = numCams <= 1 ? 'grid-cols-1' : 'grid-cols-2';
  const gridRows =
    numCams <= 2 ? 'grid-rows-1' :
    numCams <= 4 ? 'grid-rows-2' :
    'grid-rows-3';

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-ops-bg">

      {/* ── Premium Top Header ─────────────────────────────────── */}
      <header className="relative z-30 flex shrink-0 flex-col md:flex-row md:items-center justify-between border-b border-ops-border bg-ops-panel px-4 md:px-6 py-3 gap-3">
        {/* Left Side: Page Title and AI Status */}
        <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-ops-text uppercase select-none leading-none">
                Camera Monitor
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] md:text-[9px] font-bold tracking-wider uppercase border leading-none ${
                modelStatus === 'ready'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs'
                  : modelStatus === 'loading'
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 shadow-xs animate-pulse'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}>
                <span className={`h-1 w-1 rounded-full ${
                  modelStatus === 'ready' ? 'bg-emerald-500' :
                  modelStatus === 'loading' ? 'bg-sky-500 animate-ping' :
                  'bg-amber-500'
                }`} />
                {modelStatus === 'ready' ? 'Ready' : modelStatus === 'loading' ? 'Loading…' : 'Offline'}
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-ops-text-muted mt-0.5 font-medium">
              Live browser-based computer vision surveillance wall & alerts
            </p>
          </div>

          {/* Mobile Actions: Notifications drawer + control panel toggle */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setShowAlertsDrawer(true)}
              className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-ops-border bg-ops-panel text-ops-text-muted shadow-xs active:scale-95 transition-all cursor-pointer"
              aria-label="Alert Feed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {alerts.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-ops-panel animate-pulse-rec">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Controls Toggle */}
            <button
              type="button"
              onClick={() => setShowControlsPanel(!showControlsPanel)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border shadow-xs active:scale-95 transition-all cursor-pointer ${
                showControlsPanel
                  ? 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                  : 'bg-ops-panel text-ops-text-muted border-ops-border'
              }`}
              aria-label="Controls"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop Controls (hidden on mobile) */}
        <div className="hidden md:flex flex-wrap items-center gap-4">
          {/* Live threat status dashboard */}
          <div className="flex items-center gap-4 bg-ops-bg/40 border border-ops-border/70 rounded-xl px-4 py-1.5 shadow-inner">
            {/* HUMANS */}
            <div className="flex items-center gap-2 border-r border-ops-border/40 pr-4">
              <span className="text-[10px] font-mono font-bold text-ops-text-muted uppercase tracking-wider select-none">HUMANS:</span>
              <span className="font-mono text-xs font-black text-red-500 tabular-nums">{counts.RED}</span>
            </div>
            {/* ANIMALS */}
            <div className="flex items-center gap-2 border-r border-ops-border/40 pr-4">
              <span className="text-[10px] font-mono font-bold text-ops-text-muted uppercase tracking-wider select-none">ANIMALS:</span>
              <span className="font-mono text-xs font-black text-amber-500 tabular-nums">{counts.YELLOW}</span>
            </div>
            {/* CLEAR */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-ops-text-muted uppercase tracking-wider select-none">CLEAR:</span>
              <span className="font-mono text-xs font-black text-emerald-500 tabular-nums">{counts.GREEN}</span>
            </div>
          </div>

          <div className="h-5 w-px bg-ops-border" />

          {/* Action and simulation controllers */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-ops-bg/40 rounded-xl border border-ops-border p-1">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ops-text-muted pl-1.5 select-none">Simulate:</span>
              <div className="flex items-center gap-1">
                <SimTriggerBtn severity="RED" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />} label="Human" color="red" onSimulate={handleSimulate} durationSec={SIM_DURATION_MS / 1000} />
                <SimTriggerBtn severity="YELLOW" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 13c3-1 5-4 8-4 2 0 4 1 4 3 0 3-3 5-6 5-2 0-3-1-3-2m9-9l3 1-2 2" />} label="Animal" color="amber" onSimulate={handleSimulate} durationSec={SIM_DURATION_MS / 1000} />
                <SimTriggerBtn severity="GREEN" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 13l4 4L19 7" />} label="Clear" color="green" onSimulate={handleSimulate} durationSec={SIM_DURATION_MS / 1000} />
              </div>

              <select
                value={simTarget}
                onChange={(e) => setSimTarget(e.target.value)}
                className="h-6 cursor-pointer rounded border border-ops-border bg-ops-panel px-1.5 font-mono text-[9px] text-ops-text focus:outline-none focus:ring-1 focus:ring-sky-500"
                aria-label="Simulation target camera"
              >
                <option value="all">All Feeds</option>
                {visibleCameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <CameraSelector
              cameras={CAMERAS}
              visibleIds={visibleIds}
              onChange={setVisibleIds}
              statusOf={statusOf}
            />
          </div>
        </div>
      </header>

      {/* Mobile Collapsible Controls Panel */}
      <AnimatePresence>
        {showControlsPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b border-ops-border bg-ops-panel/95 backdrop-blur-md px-4 py-3 flex flex-col gap-3 z-30 shrink-0"
          >
            {/* Mobile Stats Row */}
            <div className="flex items-center justify-around bg-ops-bg/40 border border-ops-border/70 rounded-xl px-2 py-1.5 shadow-inner select-none">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-rec" />
                <span className="text-[9px] font-mono font-bold text-ops-text-muted uppercase">HUMANS</span>
                <span className="font-mono text-xs font-black text-red-500 tabular-nums">{counts.RED}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="text-[9px] font-mono font-bold text-ops-text-muted uppercase">ANIMALS</span>
                <span className="font-mono text-xs font-black text-amber-500 tabular-nums">{counts.YELLOW}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono font-bold text-ops-text-muted uppercase">CLEAR</span>
                <span className="font-mono text-xs font-black text-emerald-500 tabular-nums">{counts.GREEN}</span>
              </div>
            </div>

            {/* Mobile Simulation Control Panel */}
            <div className="flex flex-col gap-2 bg-ops-bg/40 p-2.5 rounded-xl border border-ops-border/60">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ops-text-muted select-none">Simulate Threat:</span>
                <select
                  value={simTarget}
                  onChange={(e) => setSimTarget(e.target.value)}
                  className="h-6 cursor-pointer rounded border border-ops-border bg-ops-panel px-1.5 font-mono text-[9px] text-ops-text focus:outline-none"
                  aria-label="Simulation target camera"
                >
                  <option value="all">All Feeds</option>
                  {visibleCameras.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleSimulate("RED")}
                  className="flex h-7 items-center justify-center rounded-lg border border-red-200 dark:border-red-800 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 font-bold text-[10px] transition-all cursor-pointer active:scale-95"
                >
                  Human
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate("YELLOW")}
                  className="flex h-7 items-center justify-center rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-200 font-bold text-[10px] transition-all cursor-pointer active:scale-95"
                >
                  Animal
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate("GREEN")}
                  className="flex h-7 items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 font-bold text-[10px] transition-all cursor-pointer active:scale-95"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Mobile Feeds Selector */}
            <div className="flex items-center justify-between border-t border-ops-border/40 pt-2 shrink-0">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ops-text-muted select-none">Active Feeds:</span>
              <CameraSelector
                cameras={CAMERAS}
                visibleIds={visibleIds}
                onChange={setVisibleIds}
                statusOf={statusOf}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">

        {/* Camera container */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {visibleCameras.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 select-none">
              <p className="text-sm font-semibold text-ops-text">No feeds selected</p>
              <p className="mt-1 text-xs text-ops-text-muted">
                Use the <span className="text-sky-500 font-bold">Feeds</span> selector in the control panel.
              </p>
              <button
                type="button"
                onClick={() => setVisibleIds(CAMERAS.map((c) => c.id))}
                className="btn-ghost mt-4 px-3 py-1.5 text-xs rounded-xl"
              >
                Show all cameras
              </button>
            </div>
          ) : (
            <>
              {/* Desktop View: Grid Layout */}
              <div className={`hidden md:grid h-full gap-0 ${gridCols} ${gridRows}`}>
                {visibleCameras.map((cam) => (
                  <div key={cam.id} className="min-h-0 overflow-hidden border border-ops-border/40">
                    <CameraCard
                      camera={cam}
                      model={model}
                      modelStatus={modelStatus}
                      override={overrides[cam.id] || null}
                      useWebcam={webcamCardId === cam.id}
                      onToggleWebcam={handleToggleWebcam}
                      onSeverity={handleSeverity}
                      onSourceState={handleSourceState}
                    />
                  </div>
                ))}
              </div>

              {/* Mobile View: Scrollable List Layout */}
              <div className="flex md:hidden flex-col gap-4 overflow-y-auto p-4 h-full">
                {visibleCameras.map((cam) => (
                  <div key={cam.id} className="w-full shrink-0 aspect-video rounded-xl overflow-hidden border border-ops-border/40 shadow-xs">
                    <CameraCard
                      camera={cam}
                      model={model}
                      modelStatus={modelStatus}
                      override={overrides[cam.id] || null}
                      useWebcam={webcamCardId === cam.id}
                      onToggleWebcam={handleToggleWebcam}
                      onSeverity={handleSeverity}
                      onSourceState={handleSourceState}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop Sidebar: alert log */}
        <div className="hidden w-64 shrink-0 border-l border-ops-border bg-ops-panel lg:flex lg:flex-col xl:w-72">
          <AlertLog alerts={alerts} onClear={() => setAlerts([])} />
        </div>
      </div>

      {/* Mobile Alert Log Drawer */}
      <AnimatePresence>
        {showAlertsDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAlertsDrawer(false)}
              className="fixed inset-0 z-50 bg-black md:hidden"
            />
            {/* Drawer sheet */}
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-50 h-[82vh] rounded-t-3xl border-t border-ops-border bg-ops-panel shadow-2xl flex flex-col md:hidden overflow-hidden"
            >
              {/* Drag bar indicator */}
              <div className="flex justify-center py-2.5 shrink-0 select-none">
                <div className="h-1.5 w-12 rounded-full bg-ops-border" />
              </div>
              
              {/* Drawer Action Row */}
              <div className="px-4 pb-2.5 flex justify-between items-center border-b border-ops-border shrink-0 select-none">
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ops-text-muted">Live Security Feed</span>
                <button
                  onClick={() => setShowAlertsDrawer(false)}
                  className="text-xs font-bold text-sky-500 hover:text-sky-400 py-1 px-3 border border-ops-border rounded-xl bg-ops-bg active:scale-95 cursor-pointer"
                >
                  Close
                </button>
              </div>
              
              <div className="flex-1 min-h-0">
                <AlertLog alerts={alerts} onClear={() => setAlerts([])} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const SIM_COLORS = {
  red:   { btn: 'border-red-200 dark:border-red-800 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900', dot: 'bg-red-500' },
  amber: { btn: 'border-amber-200 dark:border-amber-800 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900', dot: 'bg-amber-500' },
  green: { btn: 'border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900', dot: 'bg-emerald-500' },
};

function SimTriggerBtn({ severity, icon, label, color, onSimulate, durationSec }) {
  const c = SIM_COLORS[color];
  return (
    <button
      type="button"
      onClick={() => onSimulate(severity)}
      title={`Simulate ${label} (~${durationSec}s)`}
      className={`flex h-6 items-center gap-1 rounded border px-2 text-[10px] font-bold transition-all hover:scale-[1.04] active:scale-95 ${c.btn}`}
    >
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {icon}
      </svg>
      {label}
    </button>
  );
}

function TelemetryDashboard({ counts, modelStatus }) {
  return (
    <div className="flex items-center gap-3 bg-ops-bg/30 border border-ops-border/70 rounded-xl p-1 px-2.5 mx-3 shadow-inner">
      {/* Group Title/Icon */}
      <div className="flex flex-col pr-2 border-r border-ops-border/60">
        <span className="font-mono text-[7px] font-black tracking-widest text-ops-text-muted uppercase">SYSTEM</span>
        <span className="font-mono text-[9px] font-extrabold text-sky-500 uppercase tracking-wider">STATS</span>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-3">
        {[
          { label: 'HUMAN', count: counts.RED, color: 'text-red-500', dot: 'bg-red-500', pulse: true },
          { label: 'ANIMAL/BIRD', count: counts.YELLOW, color: 'text-amber-500', dot: 'bg-amber-500', pulse: false },
          { label: 'CLEAR', count: counts.GREEN, color: 'text-emerald-500', dot: 'bg-emerald-500', pulse: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 border-r border-ops-border/40 pr-3 last:border-r-0 last:pr-0">
            <span className={`h-2 w-2 rounded-full ${item.dot} ${item.pulse && item.count > 0 ? 'animate-pulse-rec' : ''}`} />
            <div className="flex flex-col leading-none">
              <span className="font-mono text-[7px] font-black tracking-widest text-ops-text-muted">{item.label}</span>
              <span className={`mt-1 font-mono text-xs font-black tabular-nums ${item.color}`}>
                {item.count}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="h-5 w-px bg-ops-border/60" />

      {/* Model status */}
      <div className="flex items-center gap-2 pl-0.5">
        <div className={`h-2 w-2 rounded-full ${
          modelStatus === 'ready' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' :
          modelStatus === 'loading' ? 'bg-sky-500 animate-pulse-rec' :
          'bg-amber-500'
        }`} />
        <div className="flex flex-col leading-none">
          <span className="font-mono text-[7px] font-black tracking-widest text-ops-text-muted uppercase">COCO-SSD</span>
          <span className={`mt-1 font-mono text-[10px] font-black uppercase ${
            modelStatus === 'ready' ? 'text-emerald-500' :
            modelStatus === 'loading' ? 'text-sky-500' :
            'text-amber-500'
          }`}>
            {modelStatus === 'ready' ? 'Ready' : modelStatus === 'loading' ? 'Loading…' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
