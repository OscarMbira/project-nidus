/**
 * PMO RAG indicator — Red / Amber / Green with accessible label.
 * Accepts rag: red | amber | yellow (treated as amber) | green.
 */
import { memo } from 'react';

const LABELS = {
  red: 'Red',
  amber: 'Amber',
  green: 'Green',
};

const PILL =
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide';

const STYLES = {
  red: `${PILL} border-red-300/80 bg-red-100 text-red-900 dark:border-red-800/70 dark:bg-red-950/55 dark:text-red-100`,
  amber: `${PILL} border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/45 dark:text-amber-100`,
  green: `${PILL} border-emerald-300/80 bg-emerald-100 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-100`,
};

const DOT = {
  red: 'bg-red-500 shadow-sm shadow-red-500/40',
  amber: 'bg-amber-500 shadow-sm shadow-amber-500/40',
  green: 'bg-emerald-500 shadow-sm shadow-emerald-500/40',
};

function normalizeRag(rag) {
  const r = String(rag || 'green').toLowerCase().trim();
  if (r === 'yellow') return 'amber';
  if (r === 'red' || r === 'amber' || r === 'green') return r;
  return 'green';
}

export const RagStatusBadge = memo(function RagStatusBadge({
  rag,
  size = 'sm',
  showLabel = true,
  className = '',
}) {
  const key = normalizeRag(rag);
  const dotClass = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';

  return (
    <span
      className={`${STYLES[key]} ${className}`.trim()}
      title={`RAG: ${LABELS[key]}`}
      role="status"
    >
      <span
        className={`shrink-0 rounded-full ${dotClass} ${DOT[key]}`}
        aria-hidden
      />
      {showLabel ? <span>{LABELS[key]}</span> : null}
    </span>
  );
});

RagStatusBadge.displayName = 'RagStatusBadge';

export default RagStatusBadge;
