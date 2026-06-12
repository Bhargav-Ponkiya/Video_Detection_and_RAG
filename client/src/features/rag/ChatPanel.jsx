import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import { askQuestion } from '../../lib/api.js';

const EXAMPLES = [
  'Summarize this document in three bullet points.',
  'What are the key findings or conclusions?',
  'List any dates, names, or figures mentioned.',
];

let mid = 0;
const nextId = () => `m${++mid}`;

/**
 * @param {object} props
 * @param {string|null} props.documentId      scope, null = all docs
 * @param {string} props.scopeLabel           human label of the scope
 * @param {boolean} props.hasDocuments
 */
export default function ChatPanel({ documentId, scopeLabel, hasDocuments }) {
  const [messages, setMessages] = useState([]); // {id, role, text, sources?, error?}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    const userMsg = { id: nextId(), role: 'user', text: q };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askQuestion({ question: q, documentId, topK: 5 });
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text: res?.answer || 'No answer returned.',
          sources: res?.sources || [],
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text: err.message || 'Something went wrong. The backend may be waking up — try again.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border-0 bg-transparent rounded-none" style={{background: 'inherit'}}>
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-ops-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h8M8 14h5m-9 6l3-2h7a3 3 0 003-3V7a3 3 0 00-3-3H6a3 3 0 00-3 3v9a3 3 0 003 3z" />
            </svg>
          </span>
          <h2 className="text-sm font-bold text-ops-text">Ask your documents</h2>
        </div>
        <Badge tone="sky" dot>
          {scopeLabel}
        </Badge>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <EmptyState hasDocuments={hasDocuments} onPick={send} />
        ) : (
          messages.map((m) => <Message key={m.id} msg={m} />)
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ops-text-muted">
            <Spinner className="h-4 w-4" />
            <span>Searching context &amp; generating answer…</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="border-t border-ops-border/60 bg-ops-panel/20 p-4">
        <div className="flex items-end gap-2.5 rounded-2xl border border-ops-border bg-ops-panel px-3 py-2.5 focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/10 transition-all duration-200">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={hasDocuments ? 'Ask a question about your documents…' : 'Upload a document first…'}
            className="flex-1 resize-none bg-transparent py-1 px-1 text-sm text-ops-text placeholder:text-ops-text-muted/70 focus:outline-none max-h-32 min-h-[24px]"
            disabled={!hasDocuments || loading}
            aria-label="Question"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn bg-linear-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10 hover:shadow-lg hover:shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] py-2 px-3.5 rounded-xl cursor-pointer"
            aria-label="Send question"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <span className="text-xs font-bold tracking-tight">Ask</span>
          </button>
        </div>
        <p className="mt-2 px-1 text-[10px] font-medium text-ops-text-muted/80">
          Grounded RAG answers. Press Enter to submit.
        </p>
      </form>
    </section>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
            isUser
              ? 'rounded-br-sm bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
              : msg.error
                ? 'rounded-bl-sm border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 text-red-800 dark:text-red-300'
                : 'rounded-bl-sm border border-ops-border/70 bg-ops-panel/95 text-ops-text shadow-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{msg.text}</p>
        </div>
        {!isUser && msg.sources?.length > 0 && <Sources sources={msg.sources} />}
      </div>
    </motion.div>
  );
}

function Sources({ sources }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 px-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ops-text-muted/95 transition hover:bg-ops-panel hover:text-ops-text cursor-pointer border border-ops-border/40"
        aria-expanded={open}
      >
        <svg
          className={`h-3.5 w-3.5 text-sky-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
        {sources.length} source{sources.length === 1 ? '' : 's'} referenced
      </button>

      {open && (
        <ul className="mt-2 space-y-2">
          {sources.map((s, i) => (
            <li
              key={`${s.documentId}-${s.chunkIndex}-${i}`}
              className="rounded-xl border border-ops-border/70 bg-ops-panel/50 p-3.5 shadow-xs"
            >
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-ops-border/40 pb-1.5">
                <span className="truncate font-mono text-[10px] font-bold text-ops-text flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-ops-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {s.filename}
                  <span className="text-ops-text-muted font-normal">· chunk {s.chunkIndex}</span>
                </span>
                {typeof s.score === 'number' && (
                  <Badge tone="green" className="font-extrabold px-2 py-0.5 text-[9px]">{(s.score * 100).toFixed(0)}% Match</Badge>
                )}
              </div>
              <p className="line-clamp-4 text-[11px] leading-relaxed text-ops-text-muted font-medium">
                "{s.snippet}"
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ hasDocuments, onPick }) {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-sky-500/20 to-indigo-500/10 ring-1 ring-sky-500/30">
        <svg className="h-6 w-6 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M8 10h8M8 14h5m-9 6l3-2h7a3 3 0 003-3V7a3 3 0 00-3-3H6a3 3 0 00-3 3v9a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 className="mt-3 text-base font-bold text-ops-text">
        {hasDocuments ? 'Ask anything about your documents' : 'Upload a document to begin'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-ops-text-muted font-medium">
        {hasDocuments
          ? 'Questions are answered with cited passages from your sources.'
          : 'Once a PDF, TXT, or MD file is ingested, you can chat with it here.'}
      </p>

      {hasDocuments && (
        <div className="mt-6 flex w-full max-w-md flex-col gap-2.5">
          <p className="text-[10px] font-bold tracking-widest text-ops-text-muted uppercase text-center">Suggested Prompts</p>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onPick(ex)}
              className="group flex w-full items-center gap-3 rounded-xl border border-ops-border/60 bg-ops-panel/50 px-4 py-3 text-left text-xs text-ops-text hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/40 hover:bg-ops-panel transition-all duration-200 hover:scale-[1.01] hover:shadow-xs cursor-pointer"
            >
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-500 group-hover:bg-sky-500/20 transition-colors">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold">{ex}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
