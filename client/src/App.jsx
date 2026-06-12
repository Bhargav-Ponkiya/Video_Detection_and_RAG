import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Spinner from './components/Spinner.jsx';
import { ToastProvider } from './components/Toast.jsx';

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

export default function App() {
  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-ops-bg text-ops-text">
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
      </div>
    </ToastProvider>
  );
}
