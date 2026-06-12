import { useEffect, useRef, useState } from 'react';

// Dropdown multi-select: choose which camera feeds are shown on the wall.
// Only the checked cameras are rendered in the grid (fewer tiles = faster
// in-browser inference, too).

const DOT = {
  RED: 'bg-red-400 animate-pulse-rec',
  YELLOW: 'bg-amber-400',
  GREEN: 'bg-emerald-400',
};

/**
 * @param {object} props
 * @param {Array<{id,name,location}>} props.cameras   all available cameras
 * @param {string[]} props.visibleIds                 currently shown ids
 * @param {(ids:string[])=>void} props.onChange
 * @param {(id:string)=>('RED'|'YELLOW'|'GREEN'|undefined)} props.statusOf
 */
export default function CameraSelector({ cameras, visibleIds, onChange, statusOf }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const toggle = (id) =>
    onChange(visibleIds.includes(id) ? visibleIds.filter((x) => x !== id) : [...visibleIds, id]);

  const allOn = visibleIds.length === cameras.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost px-3 py-1.5 text-xs"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 5h7v7H4zM13 5h7v4h-7zM13 12h7v7h-7zM4 14h7v5H4z" />
        </svg>
        Feeds
        <span className="rounded-md bg-ops-bg/70 px-1.5 py-0.5 font-mono text-[10px] text-sky-600">
          {visibleIds.length}/{cameras.length}
        </span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-2 w-72 animate-fade-in rounded-xl border border-ops-border bg-ops-card shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-ops-border/60 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ops-text-muted">
              Camera Feeds
            </span>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => onChange(cameras.map((c) => c.id))}
                disabled={allOn}
                className="font-bold text-sky-600 transition hover:text-sky-500 disabled:opacity-40"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={visibleIds.length === 0}
                className="font-bold text-ops-text-muted transition hover:text-ops-text disabled:opacity-40"
              >
                None
              </button>
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
            {cameras.map((c) => {
              const on = visibleIds.includes(c.id);
              const sev = statusOf?.(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-ops-panel/80">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 shrink-0 rounded border-ops-border bg-ops-panel accent-sky-500 cursor-pointer"
                    />
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[sev] || 'bg-slate-400/60'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-bold text-ops-text">
                        {c.name}
                      </span>
                      <span className="block truncate text-[10px] text-ops-text-muted">{c.location}</span>
                    </span>
                    {on && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
