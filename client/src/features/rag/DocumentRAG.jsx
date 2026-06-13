import { useCallback, useEffect, useMemo, useState } from 'react';
import { getHealth, listDocuments } from '../../lib/api.js';
import { useToast } from '../../components/Toast.jsx';
import { motion, AnimatePresence } from 'framer-motion';

import DocumentUpload from './DocumentUpload.jsx';
import DocumentList from './DocumentList.jsx';
import ChatPanel from './ChatPanel.jsx';

export default function DocumentRAG() {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null); // null = all docs
  const [health, setHealth] = useState(null); // {status,db,gemini} | 'down' | null
  const [showUpload, setShowUpload] = useState(false);
  const [showDocsDrawer, setShowDocsDrawer] = useState(false);

  // Auto-show upload zone if there are no documents
  useEffect(() => {
    if (!loading && documents.length === 0) {
      setShowUpload(true);
    }
  }, [loading, documents.length]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      // surface once; banner will also reflect health
      toast.error(err.message || 'Could not load documents.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setHealth(h);
    } catch {
      setHealth('down');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    refresh();
  }, [checkHealth, refresh]);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedId) || null,
    [documents, selectedId]
  );
  const scopeLabel = selectedDoc ? selectedDoc.filename : 'All documents';

  // Banner conditions
  const banner = useMemo(() => {
    if (health === 'down') {
      return {
        tone: 'amber',
        title: 'Backend unreachable',
        msg: 'The RAG API is not responding. Free tiers sleep when idle — it may be waking up. Retry shortly.',
      };
    }
    if (health && (health.db === false || health.gemini === false)) {
      const parts = [];
      if (!health.db) parts.push('database');
      if (!health.gemini) parts.push('Gemini');
      return {
        tone: 'amber',
        title: 'Backend not fully configured',
        msg: `Not ready: ${parts.join(' & ')}. Uploads and answers may fail until configured.`,
      };
    }
    return null;
  }, [health]);



  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── Premium Top Header ─────────────────────────────────── */}
      <header className="relative z-30 flex shrink-0 flex-col md:flex-row md:items-center justify-between border-b border-ops-border bg-ops-panel px-4 md:px-6 py-3.5 gap-3">
        {/* Left Side: Page Title and API Status */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-sm md:text-base font-extrabold tracking-tight text-ops-text uppercase select-none leading-none">
              Document RAG
            </h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] md:text-[9px] font-bold tracking-wider uppercase border leading-none ${
              !health 
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 animate-pulse'
                : health === 'down' 
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                  : (health.db && health.gemini)
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
              <span className={`h-1 w-1 rounded-full ${
                !health ? 'bg-sky-500 animate-ping' :
                health === 'down' ? 'bg-red-500' :
                (health.db && health.gemini) ? 'bg-emerald-500' :
                'bg-amber-500'
              }`} />
              API: {!health ? 'Checking…' : health === 'down' ? 'Offline' : 'Online'}
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-ops-text-muted mt-0.5 font-medium">
            Upload documents and ask questions grounded in database text vectors
          </p>
        </div>

        {/* Right Side: Telemetry Stats & Actions */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {/* Document Ingestion Telemetry Box */}
          <div className="flex items-center gap-3 bg-ops-bg/40 border border-ops-border/70 rounded-xl px-3 py-1 md:py-1.5 shadow-inner">
            {/* Files Ingested */}
            <div className="flex items-center gap-1.5 border-r border-ops-border/40 pr-3">
              <span className="text-[9px] font-mono font-bold text-ops-text-muted uppercase tracking-wider select-none">FILES:</span>
              <span className="font-mono text-xs font-black text-indigo-500 dark:text-indigo-400 tabular-nums">{documents.length}</span>
            </div>
            {/* Total Chunks */}
            <div className="flex items-center gap-1.5 border-r border-ops-border/40 pr-3">
              <span className="text-[9px] font-mono font-bold text-ops-text-muted uppercase tracking-wider select-none">CHUNKS:</span>
              <span className="font-mono text-xs font-black text-sky-500 dark:text-sky-400 tabular-nums">
                {documents.reduce((acc, doc) => acc + (doc.numChunks || 0), 0)}
              </span>
            </div>
            {/* Scope */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold text-ops-text-muted uppercase tracking-wider select-none">SCOPE:</span>
              <span className={`font-mono text-[11px] font-black truncate max-w-[80px] md:max-w-[100px] ${selectedId ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                {selectedDoc ? selectedDoc.filename : 'Global'}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-ops-border hidden md:block" />

          {/* Actions panel */}
          <div className="flex items-center gap-2">
            {/* Mobile Documents Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDocsDrawer(true)}
              className="flex md:hidden h-8 items-center gap-1.5 rounded-xl border border-ops-border bg-ops-panel px-3 text-[10px] font-bold text-ops-text transition active:scale-95 cursor-pointer shadow-xs"
            >
              <svg className="h-3.5 w-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Docs</span>
              <span className="rounded-md bg-ops-bg/70 px-1 py-0.5 font-mono text-[9px] text-sky-600 font-black">
                {documents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { checkHealth(); refresh(); }}
              className="btn-ghost flex h-8 items-center gap-1.5 rounded-xl border border-ops-border px-3 text-[10px] font-bold text-ops-text transition hover:border-ops-border hover:bg-ops-panel cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M5 9a7 7 0 0112-3m2 8a7 7 0 01-12 3" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Banner (conditional) ─────────────────────────────────── */}
      {banner && (
        <div
          className={`shrink-0 flex animate-fade-in items-start gap-3 border-b px-4 py-3 ${
            banner.tone === 'amber'
              ? 'border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300'
              : 'border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300'
          }`}
          role="status"
        >
          <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg ${banner.tone === 'amber' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'}`}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.3 3.9l-7.5 13A2 2 0 004.5 20h15a2 2 0 001.7-3l-7.5-13a2 2 0 00-3.4 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-tight">{banner.title}</p>
            <p className="text-[11px] opacity-90 leading-relaxed">{banner.msg}</p>
          </div>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">

        {/* Left column (Desktop only, hidden on mobile) */}
        <div className="hidden md:flex w-56 shrink-0 flex-col border-r border-ops-border overflow-hidden sm:w-64 lg:w-72 bg-ops-panel">
          {/* Collapsible Upload Panel */}
          <AnimatePresence initial={false}>
            {showUpload && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="shrink-0 border-b border-ops-border/60 p-3 overflow-hidden bg-ops-panel/50"
              >
                <DocumentUpload onUploaded={refresh} />
              </motion.div>
            )}
          </AnimatePresence>
          {/* List — own scroll */}
          <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
            <DocumentList
              documents={documents}
              loading={loading}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChanged={refresh}
              showUpload={showUpload}
              onToggleUpload={() => setShowUpload(!showUpload)}
            />
          </div>
        </div>

        {/* Right column: chat — full height, own scroll inside */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatPanel
            key={selectedId || 'all'}
            documentId={selectedId}
            scopeLabel={scopeLabel}
            hasDocuments={documents.length > 0}
            onToggleDocs={() => setShowDocsDrawer(true)}
          />
        </div>
      </div>

      {/* Mobile Documents slide-in drawer */}
      <AnimatePresence>
        {showDocsDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocsDrawer(false)}
              className="fixed inset-0 z-50 bg-black md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ translateX: '-100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-[82vw] sm:w-[320px] border-r border-ops-border bg-ops-panel shadow-2xl flex flex-col md:hidden overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-4 py-3.5 flex justify-between items-center border-b border-ops-border shrink-0 select-none">
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ops-text-muted">Sources & Ingestion</span>
                <button
                  onClick={() => setShowDocsDrawer(false)}
                  className="text-xs font-bold text-sky-500 hover:text-sky-400 py-1 px-3 border border-ops-border rounded-xl bg-ops-bg active:scale-95 cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Drawer Body containing Upload & List */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Collapsible Upload Panel inside Drawer */}
                <div className="shrink-0 border-b border-ops-border/60 p-3 bg-ops-panel/50">
                  <DocumentUpload onUploaded={refresh} />
                </div>
                
                {/* List inside Drawer */}
                <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
                  <DocumentList
                    documents={documents}
                    loading={loading}
                    selectedId={selectedId}
                    onSelect={(id) => {
                      setSelectedId(id);
                      // Auto-close drawer on mobile when selection changes
                      setShowDocsDrawer(false);
                    }}
                    onChanged={refresh}
                    showUpload={showUpload}
                    onToggleUpload={() => setShowUpload(!showUpload)}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
