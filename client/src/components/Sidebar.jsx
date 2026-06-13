import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Clock from './Clock.jsx';
import { useTheme } from './ThemeProvider.jsx';

const NAV = [
  {
    to: '/monitor',
    label: 'Camera Monitor',
    sub: 'Feature 1',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M15 10l4.55-2.27A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    ),
  },
  {
    to: '/rag',
    label: 'Document RAG',
    sub: 'Feature 2',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
];

function Logo({ isCollapsed }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-indigo-600 shadow-md shadow-sky-500/25 ring-1 ring-sky-500/50">
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-ops-panel animate-pulse-rec shadow-glow-red" />
      </div>
      <div className={`leading-tight transition-all duration-300 origin-left ${isCollapsed ? 'w-0 opacity-0 scale-90 pointer-events-none' : 'w-auto opacity-100 scale-100'}`}>
        <div className="text-sm font-extrabold tracking-tight text-ops-text">SENTINEL</div>
        <div className="text-[10px] font-bold tracking-wider text-ops-text-muted">OPS CONSOLE</div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sentinel_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sentinel_sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <aside 
      className={`relative hidden md:flex h-screen shrink-0 flex-col border-r border-ops-border bg-ops-panel shadow-xs transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Absolute toggle button on the right border */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-ops-border bg-ops-panel text-ops-text-muted shadow-xs transition-transform duration-200 hover:text-ops-text hover:scale-110 active:scale-95"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        <svg 
          className={`h-3.5 w-3.5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Top section: Logo/branding */}
      <div className={`flex h-[4.5rem] items-center border-b border-ops-border px-5 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
        <Logo isCollapsed={isCollapsed} />
      </div>

      {/* Middle section: Navigation links */}
      <nav className="flex-1 space-y-1.5 px-3 py-6">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl py-3 transition-all duration-200 cursor-pointer border ${
                isCollapsed ? 'justify-center px-0' : 'px-4'
              } ${
                isActive
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 shadow-xs'
                  : 'text-ops-text-muted hover:bg-ops-bg hover:text-ops-text border-transparent'
              }`
            }
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {item.icon}
            </svg>
            <div className={`flex flex-col leading-tight transition-all duration-350 origin-left ${
              isCollapsed ? 'w-0 opacity-0 scale-90 pointer-events-none absolute' : 'w-auto opacity-100 scale-100'
            }`}>
              <span className="font-bold text-sm tracking-tight whitespace-nowrap">{item.label}</span>
              <span className="text-[10px] font-medium opacity-70 mt-0.5 whitespace-nowrap">{item.sub}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section: Clock & ThemeToggle */}
      <div className="border-t border-ops-border p-3 space-y-3 bg-ops-bg/20">
        <div className={`flex items-center gap-3 rounded-xl border border-ops-border/50 bg-ops-bg/40 shadow-xs transition-all duration-300 ${
          isCollapsed ? 'flex-col justify-center p-2' : 'justify-between p-3'
        }`}>
          <div className={`flex flex-col leading-none transition-all duration-300 origin-left ${
            isCollapsed ? 'w-0 opacity-0 scale-90 pointer-events-none absolute' : 'w-auto opacity-100 scale-100'
          }`}>
            <span className="text-[9px] font-extrabold tracking-wider text-ops-text-muted/80 uppercase select-none">
              System Time
            </span>
            <span className="mt-1">
              <Clock />
            </span>
          </div>
          <ThemeToggle isCollapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
}

function ThemeToggle({ isCollapsed }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ops-border/60 bg-ops-panel/40 text-ops-text-muted transition-colors hover:bg-ops-panel hover:text-ops-text cursor-pointer"
      title={isCollapsed ? "Toggle theme" : undefined}
    >
      {isDark ? (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="5" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
