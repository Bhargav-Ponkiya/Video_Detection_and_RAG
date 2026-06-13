import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, NavLink } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Spinner from './components/Spinner.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { useTheme } from './components/ThemeProvider.jsx';

// Code-split the pages. The camera page pulls in TensorFlow.js (~2MB), so we only
// load that bundle when the user navigates to /monitor.
const CameraMonitor = lazy(() => import('./features/camera/CameraMonitor.jsx'));
const DocumentRAG = lazy(() => import('./features/rag/DocumentRAG.jsx'));

function PageFallback() {
  return (
    <div className="grid h-full min-h-[60vh] place-items-center">
      <Spinner className="h-6 w-6" label="Loading…" />
    </div>
  );
}

function MobileThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ops-border bg-ops-panel text-ops-text-muted transition-colors hover:text-ops-text shadow-xs cursor-pointer active:scale-95"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="5" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

function MobileNav() {
  return (
    <nav className="flex md:hidden h-16 shrink-0 items-center justify-around border-t border-ops-border bg-ops-panel/80 backdrop-blur-md px-6 py-2 select-none">
      <NavLink
        to="/monitor"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            isActive ? 'text-sky-500' : 'text-ops-text-muted hover:text-ops-text'
          }`
        }
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.27A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>Monitor</span>
      </NavLink>

      <MobileThemeToggle />

      <NavLink
        to="/rag"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            isActive ? 'text-sky-500' : 'text-ops-text-muted hover:text-ops-text'
          }`
        }
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>RAG Chat</span>
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-ops-bg text-ops-text flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden relative flex flex-col">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/monitor" replace />} />
              <Route path="/monitor" element={<CameraMonitor />} />
              <Route path="/rag" element={<DocumentRAG />} />
              <Route path="*" element={<Navigate to="/monitor" replace />} />
            </Routes>
          </Suspense>
        </main>
        <MobileNav />
      </div>
    </ToastProvider>
  );
}
