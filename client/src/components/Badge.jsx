// Status badge. `severity` -> themed; otherwise `tone` for neutral states.

const SEVERITY = {
  RED: {
    label: 'HUMAN',
    cls: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 ring-red-300 dark:ring-red-800',
    dot: 'bg-red-500 dark:bg-red-400',
    pulse: true,
  },
  YELLOW: {
    label: 'ANIMAL',
    cls: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-amber-300 dark:ring-amber-800',
    dot: 'bg-amber-500 dark:bg-amber-400',
    pulse: false,
  },
  GREEN: {
    label: 'CLEAR',
    cls: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-800',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    pulse: false,
  },
};

const TONE = {
  neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-300 dark:ring-slate-600',
  sky:     'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 ring-sky-300 dark:ring-sky-800',
  red:     'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 ring-red-300 dark:ring-red-800',
  amber:   'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-amber-300 dark:ring-amber-800',
  green:   'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-800',
};

export default function Badge({ severity, tone = 'neutral', dot = false, children, className = '' }) {
  if (severity && SEVERITY[severity]) {
    const s = SEVERITY[severity];
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${s.cls} ${className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? 'animate-pulse-rec' : ''}`} />
        {children ?? s.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset ${TONE[tone] || TONE.neutral} ${className}`}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}
