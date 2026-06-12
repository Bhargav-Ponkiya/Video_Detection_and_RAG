import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function timeOf(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const SEV = {
  RED: { 
    strip: 'bg-red-500',     
    icon: 'text-red-500',     
    label: 'HUMAN',
    cardBg: 'bg-red-500/5 dark:bg-red-500/10',
    border: 'border-red-500/15 dark:border-red-500/20',
    tagBg: 'bg-red-500/10',
    tagColor: 'text-red-600 dark:text-red-400',
    tagRing: 'ring-red-500/20',
    dotBg: 'bg-red-500'
  },
  YELLOW: { 
    strip: 'bg-amber-500',   
    icon: 'text-amber-500',   
    label: 'ANIMAL',
    cardBg: 'bg-amber-500/5 dark:bg-amber-500/10',
    border: 'border-amber-500/15 dark:border-amber-500/20',
    tagBg: 'bg-amber-500/10',
    tagColor: 'text-amber-600 dark:text-amber-400',
    tagRing: 'ring-amber-500/20',
    dotBg: 'bg-amber-500'
  },
  GREEN: { 
    strip: 'bg-emerald-500', 
    icon: 'text-emerald-500', 
    label: 'CLEAR',
    cardBg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    border: 'border-emerald-500/15 dark:border-emerald-500/20',
    tagBg: 'bg-emerald-500/10',
    tagColor: 'text-emerald-600 dark:text-emerald-400',
    tagRing: 'ring-emerald-500/20',
    dotBg: 'bg-emerald-500'
  },
};

function SeverityIcon({ severity }) {
  if (severity === 'RED') return (
    <svg className="h-4 w-4 text-red-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  if (severity === 'YELLOW') return (
    <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9l-7.5 13A2 2 0 004.5 20h15a2 2 0 001.7-3l-7.5-13a2 2 0 00-3.4 0z" />
    </svg>
  );
  return (
    <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function AlertLog({ alerts, onClear }) {
  const scrollRef = useRef(null);

  // Auto-scroll to top when a new alert arrives (newest first)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [alerts.length]);

  return (
    <section className="flex h-full flex-col overflow-hidden bg-ops-panel">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-ops-border px-5 py-4 bg-ops-panel/50 backdrop-blur-xs select-none">
        <div className="flex items-center gap-3">
          <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-ops-bg border border-ops-border/70 shadow-xs">
            <svg className="h-4.5 w-4.5 text-ops-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {alerts.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xs font-black tracking-widest text-ops-text uppercase">Alert Feed</h2>
            <p className="font-mono text-[9px] text-ops-text-muted/95 mt-0.5">
              {alerts.length} event{alerts.length !== 1 ? 's' : ''} logged
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!alerts.length}
          className="flex h-7 items-center gap-1.5 rounded-lg border border-ops-border bg-ops-bg px-3 text-[10px] font-bold text-ops-text hover:border-ops-border/80 hover:bg-ops-panel transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer"
          aria-label="Clear alert log"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </button>
      </header>

      {/* Events list */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-ops-bg/10">
        {alerts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center select-none animate-fade-in">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-dashed border-ops-border bg-ops-panel/50 text-ops-text-muted">
              <svg className="h-6 w-6 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="mt-4 text-xs font-extrabold text-ops-text uppercase tracking-wider">Feed Standby</h3>
            <p className="mt-1.5 text-[10px] leading-relaxed text-ops-text-muted max-w-[200px] font-medium">
              Real-time threat alerts and simulations will stream here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 p-4">
            <AnimatePresence initial={false}>
              {alerts.map((a) => {
                const s = SEV[a.severity] || SEV.GREEN;
                return (
                  <motion.li
                    key={a.id}
                    layoutId={a.id}
                    initial={{ opacity: 0, y: -12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`group relative flex gap-3.5 rounded-xl border p-4 transition-all duration-200 ${s.cardBg} ${s.border} hover:shadow-xs`}
                  >
                    {/* Color highlight bar */}
                    <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${s.strip}`} />

                    {/* Left Icon Panel */}
                    <div className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-ops-panel shadow-xs border border-ops-border/40">
                      <SeverityIcon severity={a.severity} />
                    </div>

                    {/* Info Section */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[11px] font-extrabold tracking-tight text-ops-text truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                          {a.cameraName}
                        </span>
                        {a.simulated && (
                          <span className="shrink-0 rounded-md bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 font-mono text-[8px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                            SIMULATED
                          </span>
                        )}
                      </div>
                      
                      {a.location && (
                        <div className="font-mono text-[9px] text-ops-text-muted mt-0.5">
                          Location: {a.location}
                        </div>
                      )}

                      <div className="mt-1 truncate font-mono text-[10px] font-bold text-ops-text-muted/90 uppercase tracking-wide">
                        {a.label}{a.matched?.length ? ` · ${a.matched.join(', ')}` : ''}
                      </div>

                      {/* Footer Badge row */}
                      <div className="mt-3.5 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest border ${s.tagColor} ${s.tagBg} ${s.tagRing}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dotBg}`} />
                          {s.label}
                        </span>
                        <span className="font-mono text-[9px] text-ops-text-muted font-bold tabular-nums">
                          {timeOf(a.at)}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
