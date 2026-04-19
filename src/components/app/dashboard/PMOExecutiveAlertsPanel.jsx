/**
 * Executive alerts strip for Platform PMO dashboard (Overview tab).
 * v475 — theme-aware, compact tiles driven by getExecutiveAlerts / getPmoExtendedMetrics.
 * RAG: each metric carries rag red|amber|green from mapSeverityToRag; panel shows overall worst RAG.
 */
import { memo } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import RagStatusBadge from '../../ui/RagStatusBadge';
import { mapSeverityToRag, worstRagFromAlertItems } from '../../../services/dashboardService';

/** Shell: neutral surface; color comes from border-l + count text */
function severityCardClass(sev) {
  const base =
    'rounded-xl border shadow-sm backdrop-blur-sm bg-white/95 border-slate-200/90 dark:border-slate-600/50 dark:bg-slate-900/65';
  if (sev === 'danger') {
    return `${base} border-l-4 border-l-rose-500`;
  }
  if (sev === 'warning') {
    return `${base} border-l-4 border-l-amber-400`;
  }
  return `${base} border-l-4 border-l-sky-500`;
}

function severityCountClass(sev) {
  if (sev === 'danger') return 'text-rose-600 dark:text-rose-200';
  if (sev === 'warning') return 'text-amber-600 dark:text-amber-200';
  return 'text-sky-600 dark:text-sky-200';
}

function severityIconClass(sev) {
  if (sev === 'danger') return 'text-rose-500 dark:text-rose-400/90';
  if (sev === 'warning') return 'text-amber-500 dark:text-amber-400/90';
  return 'text-sky-500 dark:text-sky-400/90';
}

const PMOExecutiveAlertsPanel = memo(function PMOExecutiveAlertsPanel({
  alertsPayload,
  loading,
  extendedLoadError = null,
}) {
  const items = alertsPayload?.items || [];

  if (loading) {
    return (
      <div
        className="mb-8 rounded-2xl border border-slate-200 bg-slate-100/80 p-4 sm:p-5 animate-pulse min-h-[120px] dark:border-slate-600/40 dark:bg-slate-950/40"
        aria-hidden
      />
    );
  }

  if (extendedLoadError) {
    return (
      <section
        className="mb-8 rounded-xl border border-amber-700/60 bg-amber-950/25 px-4 py-3 text-sm text-amber-100 dark:text-amber-200"
        aria-label="Executive alerts"
      >
        <p className="font-medium text-amber-50 dark:text-amber-100">Executive alerts unavailable</p>
        <p className="mt-1 text-amber-200/90 dark:text-amber-300/90">{extendedLoadError}</p>
      </section>
    );
  }

  const attention = items.filter((i) => i.count > 0 && i.severity !== 'ok');
  const overallRag = alertsPayload?.overallRag ?? worstRagFromAlertItems(attention);

  if (attention.length === 0) {
    return (
      <section
        className="mb-8 rounded-xl border border-emerald-800/60 bg-emerald-950/25 px-4 py-3 flex flex-wrap items-center gap-3 text-emerald-100 dark:text-emerald-200"
        aria-label="Executive alerts"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        <p className="text-sm font-medium">No executive exceptions on the current snapshot.</p>
        <RagStatusBadge rag="green" size="sm" className="shrink-0" />
      </section>
    );
  }

  return (
    <section
      className="mb-8 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/90 p-4 sm:p-5 shadow-sm dark:border-slate-600/35 dark:from-slate-950/60 dark:via-slate-950/45 dark:to-slate-950/70"
      aria-label="Executive alerts"
    >
      <div className="flex items-start gap-3 mb-4 text-gray-900 dark:text-gray-100">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-400/25 dark:bg-amber-400/10 dark:ring-amber-400/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Executive alerts</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Snapshot RAG — worst of {attention.length} active exception type(s)
            </p>
          </div>
          <RagStatusBadge rag={overallRag} size="sm" className="shrink-0" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {attention.map((row) => (
          <div
            key={row.id}
            className={`px-3.5 py-3 flex items-start gap-2.5 text-sm text-slate-100 dark:text-slate-100 ${severityCardClass(row.severity)}`}
          >
            <Info
              className={`h-4 w-4 mt-0.5 shrink-0 ${severityIconClass(row.severity)}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <RagStatusBadge
                  rag={row.rag || mapSeverityToRag(row.severity)}
                  size="sm"
                  className="shrink-0"
                />
                <span className="font-medium leading-snug text-slate-800 dark:text-slate-200">{row.label}</span>
              </div>
              <div
                className={`text-xl font-semibold tabular-nums mt-1 ${severityCountClass(row.severity)}`}
              >
                {row.count}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

PMOExecutiveAlertsPanel.displayName = 'PMOExecutiveAlertsPanel';

export default PMOExecutiveAlertsPanel;
