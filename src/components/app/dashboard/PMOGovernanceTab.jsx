/**
 * Governance compliance snapshot for PMO dashboard (?tab=governance). v475
 */
import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ExternalLink } from 'lucide-react';
import { platformDb } from '../../../services/supabase/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../../ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const PMOGovernanceTab = memo(function PMOGovernanceTab({
  organizationId,
  analyticsBundle,
  analyticsStatus = 'idle',
}) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const summaryPct = analyticsBundle?.extended?.portfolio?.governanceCompliancePct;

  useEffect(() => {
    let cancelled = false;
    if (!organizationId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: projects, error: e1 } = await platformDb
          .from('projects')
          .select('id, project_name, project_code')
          .eq('account_id', organizationId)
          .eq('is_deleted', false);
        if (e1) throw e1;
        const ids = (projects || []).map((p) => p.id);
        if (!ids.length) {
          if (!cancelled) {
            setRows([]);
            setLoading(false);
          }
          return;
        }
        const { data: comp, error: e2 } = await platformDb
          .from('pmo_document_compliance_view')
          .select(
            'project_id, project_name, compliance_percentage, compliance_status, missing_mandatory_docs, pending_mandatory_docs'
          )
          .in('project_id', ids);
        if (e2) throw e2;
        if (!cancelled) setRows(comp || []);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load governance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (analyticsStatus === 'loading' || analyticsStatus === 'idle' || loading) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-8 min-h-[200px] animate-pulse" />
    );
  }

  if (analyticsStatus === 'error' || !organizationId) {
    return (
      <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
        Governance data could not be loaded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <FileCheck className="h-5 w-5 text-emerald-500" aria-hidden />
          <h2 className="text-lg font-semibold">Governance &amp; document compliance</h2>
        </div>
        <Link
          to="/platform/document-governance"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Document governance <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      {summaryPct != null && (
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Organisation average mandatory compliance:{' '}
          <span className="font-semibold tabular-nums">{summaryPct}%</span>
        </p>
      )}
      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm text-left text-gray-900 dark:text-gray-100">
            <thead className="bg-gray-100 dark:bg-gray-800/80 text-xs uppercase text-gray-600 dark:text-gray-400">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Compliance %</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Missing</th>
                <th className="px-3 py-2">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((r, index) => (
                <tr key={r.project_id} className="bg-white dark:bg-gray-900/60">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-2 font-medium">{r.project_name || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{r.compliance_percentage ?? '—'}</td>
                  <td className="px-3 py-2">{r.compliance_status || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{r.missing_mandatory_docs ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{r.pending_mandatory_docs ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">No project compliance rows returned.</p>
          ) : null}
        </div>
      )}
    </div>
  );
});

PMOGovernanceTab.displayName = 'PMOGovernanceTab';

export default PMOGovernanceTab;
