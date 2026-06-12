import { useRef, useState } from 'react';
import Spinner from '../../components/Spinner.jsx';
import { useToast } from '../../components/Toast.jsx';
import { uploadDocument } from '../../lib/api.js';

const ACCEPT = '.pdf,.txt,.md';
const ALLOWED_EXT = ['pdf', 'txt', 'md'];

/**
 * Drag-and-drop + picker uploader.
 * @param {object} props
 * @param {()=>void} props.onUploaded   called after a successful ingest
 */
export default function DocumentUpload({ onUploaded }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // null | 0..100
  const [busy, setBusy] = useState(false);

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`Unsupported file type ".${ext}". Use PDF, TXT, or MD.`);
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const res = await uploadDocument(file, setProgress);
      const chunks = res?.numChunks ?? 0;
      toast.success(`"${res?.filename || file.name}" ingested — ${chunks} chunk${chunks === 1 ? '' : 's'}.`);
      onUploaded?.(res);
    } catch (err) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all duration-300 ${
        dragging
          ? 'border-sky-500/60 bg-sky-500/5 scale-[1.01]'
          : 'border-ops-border/60 hover:border-sky-500/40 hover:bg-ops-panel/20'
      } ${busy ? 'pointer-events-none opacity-75' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {busy ? (
        <>
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20">
            <Spinner className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-ops-text">
              Ingesting document…
            </p>
            <p className="mt-0.5 text-xs text-ops-text-muted font-medium">
              Generating embeddings {progress != null ? `(${progress}%)` : ''}
            </p>
          </div>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-ops-bg/85 border border-ops-border/50">
            <div
              className="h-full bg-linear-to-r from-sky-400 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20 transition-transform">
            <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6 4.5 4.5 0 0118 15M12 12v9m0-9l-3 3m3-3l3 3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-ops-text">
              Drag &amp; drop document
            </p>
            <p className="mt-0.5 text-xs text-ops-text-muted font-medium">PDF, TXT, or MD formats supported</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-ghost mt-1 px-3.5 py-2 text-xs font-bold tracking-tight rounded-xl"
          >
            Browse files
          </button>
        </>
      )}
    </div>
  );
}
