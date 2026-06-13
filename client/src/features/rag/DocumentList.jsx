import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../components/Toast.jsx';
import { deleteDocument } from '../../lib/api.js';

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function FileIcon({ name }) {
  const ext = name?.split('.').pop()?.toUpperCase() || 'DOC';
  const tone =
    ext === 'PDF'
      ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
      : ext === 'MD'
      ? 'text-sky-500 bg-sky-500/10 border-sky-500/20'
      : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-extrabold border shadow-xs tracking-wider ${tone}`}>
      {ext}
    </span>
  );
}

/**
 * @param {object} props
 * @param {Array} props.documents
 * @param {boolean} props.loading
 * @param {string|null} props.selectedId   null = All documents
 * @param {(id:string|null)=>void} props.onSelect
 * @param {()=>void} props.onChanged       refetch after delete
 */
export default function DocumentList({ documents, loading, selectedId, onSelect, onChanged, showUpload, onToggleUpload }) {
  const toast = useToast();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (doc) => {
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      toast.success(`Deleted "${doc.filename}".`);
      if (selectedId === doc.id) onSelect(null);
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const isAll = selectedId == null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border-t border-ops-border/60 bg-ops-panel/30">
      <header className="flex items-center justify-between border-b border-ops-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-ops-text">Documents Database</h2>
          <Badge tone="sky">{documents.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Spinner className="h-4 w-4" />}
          <button
            type="button"
            onClick={onToggleUpload}
            className={`rounded-lg p-1 text-ops-text-muted hover:bg-ops-panel hover:text-ops-text transition-all duration-200 cursor-pointer ${
              showUpload ? 'rotate-45 text-sky-500 bg-sky-500/10' : ''
            }`}
            title="Upload Document"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {/* "All documents" scope option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-200 ${
            isAll
              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/30 shadow-xs'
              : 'hover:bg-ops-panel/60 text-ops-text-muted hover:text-ops-text'
          }`}
          aria-pressed={isAll}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ops-text">All documents</span>
            <span className="block text-xs text-ops-text-muted">Global knowledge base scope</span>
          </span>
          {isAll && <Dot />}
        </button>

        {documents.length === 0 && !loading ? (
          <p className="px-3 py-6 text-center text-xs text-ops-text-muted">
            No documents yet — upload one to get started.
          </p>
        ) : (
          <motion.ul 
            className="flex flex-col gap-1.5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            <AnimatePresence initial={false}>
            {documents.map((doc) => {
              const active = selectedId === doc.id;
              const deleting = deletingId === doc.id;
              return (
                <motion.li 
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 ${
                      active
                        ? 'bg-sky-500/10 ring-1 ring-inset ring-sky-500/30 shadow-xs'
                        : 'hover:bg-ops-panel/60 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(doc.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-pressed={active}
                    >
                      <FileIcon name={doc.filename} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ops-text">
                          {doc.filename}
                        </span>
                        <span className="block text-[11px] text-ops-text-muted font-medium mt-0.5">
                          {doc.numChunks} chunk{doc.numChunks === 1 ? '' : 's'}
                          {fmtDate(doc.createdAt) ? ` · ${fmtDate(doc.createdAt)}` : ''}
                        </span>
                      </span>
                      {active && <Dot />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      disabled={deleting}
                      className="shrink-0 rounded-lg p-1.5 text-ops-text-muted opacity-100 md:opacity-0 transition hover:bg-red-500/15 hover:text-red-600 focus:opacity-100 md:group-hover:opacity-100 disabled:opacity-60 cursor-pointer"
                      aria-label={`Delete ${doc.filename}`}
                    >
                      {deleting ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-1.99-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.li>
              );
            })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  );
}

function Dot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
    </span>
  );
}
