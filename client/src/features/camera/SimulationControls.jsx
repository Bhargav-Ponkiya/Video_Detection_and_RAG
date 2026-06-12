import { CAMERAS } from './cameras.config.js';

const BUTTONS = [
  {
    severity: 'RED',
    title: 'Simulate Human',
    desc: 'Force a RED alert',
    cls: 'bg-red-500/5 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10 dark:hover:bg-red-500/15 hover:border-red-500/40 hover:shadow-xs shadow-red-500/5',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
  },
  {
    severity: 'YELLOW',
    title: 'Simulate Animal / Bird',
    desc: 'Force a YELLOW alert',
    cls: 'bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 hover:border-amber-500/40 hover:shadow-xs shadow-amber-500/5',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 13c3-1 5-4 8-4 2 0 4 1 4 3 0 3-3 5-6 5-2 0-3-1-3-2m9-9l3 1-2 2" />
    ),
  },
  {
    severity: 'GREEN',
    title: 'Normal',
    desc: 'Reset to GREEN',
    cls: 'bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:shadow-xs shadow-emerald-500/5',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 13l4 4L19 7" />
    ),
  },
];

/**
 * @param {object} props
 * @param {string} props.target          'all' or a camera id
 * @param {(t:string)=>void} props.onTargetChange
 * @param {(severity:string)=>void} props.onSimulate
 * @param {number} props.durationSec
 */
export default function SimulationControls({
  cameras = CAMERAS,
  target,
  onTargetChange,
  onSimulate,
  durationSec = 5,
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Target select */}
      <select
        value={target}
        onChange={(e) => onTargetChange(e.target.value)}
        className="h-7 w-auto cursor-pointer rounded-lg border border-ops-border bg-ops-bg px-2 text-[11px] font-medium text-ops-text focus:outline-none focus:ring-1 focus:ring-sky-500"
        aria-label="Simulation target camera"
      >
        <option value="all">All feeds</option>
        {cameras.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {BUTTONS.map((b) => (
        <button
          key={b.severity}
          type="button"
          onClick={() => onSimulate(b.severity)}
          title={`${b.title} (~${durationSec}s)`}
          className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition-all hover:scale-[1.03] ${b.cls}`}
          aria-label={b.title}
        >
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {b.icon}
          </svg>
          <span className="hidden sm:inline">{b.title.split(' ').slice(-1)[0]}</span>
        </button>
      ))}
    </div>
  );
}
