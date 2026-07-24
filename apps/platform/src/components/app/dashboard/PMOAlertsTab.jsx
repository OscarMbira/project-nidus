/**
 * Expanded alerts view for PMO dashboard (?tab=alerts). v475
 * Shows RAG (Red/Amber/Green) per metric and overall snapshot RAG.
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import RagStatusBadge from '../../ui/RagStatusBadge';
import { mapSeverityToRag, worstRagFromAlertItems } from '../../../services/dashboardService';

const PMOAlertsTab = memo(function PMOAlertsTab({
  organizationId,
  analyticsBundle,
  analyticsStatus = 'idle',
  extendedAnalyticsLoading = false,
}) {
  const items = analyticsBundle?.extended?.alerts?.items || [];
  const active = items.filter((i) => i.count > 0);
  const overallRag =
    analyticsBundle?.extended?.alerts?.overallRag ?? worstRagFromAlertItems(items);

  if (
    analyticsStatus === 'loading' ||
    analyticsStatus === 'idle' ||
    (analyticsStatus === 'ok' && extendedAnalyticsLoading)
  ) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-8 min-h-[200px] animate-pulse" />
    );
  }

  if (analyticsStatus === 'error' || !organizationId) {
    return (
      <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
        Alerts could not be loaded. Open the Overview tab to refresh the dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-gray-900 dark:text-gray-100">
          <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
          <h2 className="text-lg font-semibold">All exception alerts</h2>
          <RagStatusBadge rag={overallRag} size="sm" />
        </div>
        <Link
          to="/platform/projects"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Projects <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Snapshot RAG (worst of all rows): <span className="font-medium text-gray-800 dark:text-gray-200">{overallRag}</span>.
        {' '}
        {active.length} alert type(s) with a non-zero count. Resolve underlying records in the relevant modules.
      </p>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80">
        {items.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
          >
            <span className="flex flex-wrap items-center gap-2 min-w-0">
              <RagStatusBadge rag={row.rag || mapSeverityToRag(row.severity)} size="sm" className="shrink-0" />
              <span className="font-medium">{row.label}</span>
            </span>
            <span
              className={`tabular-nums font-semibold rounded px-2 py-0.5 ${
                row.count > 0
                  ? row.severity === 'danger'
                    ? 'bg-red-950/50 text-red-200'
                    : row.severity === 'warning'
                      ? 'bg-amber-950/50 text-amber-200'
                      : 'bg-slate-800 text-slate-200'
                  : 'bg-slate-800/50 text-slate-500'
              }`}
            >
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});

PMOAlertsTab.displayName = 'PMOAlertsTab';

export default PMOAlertsTab;
