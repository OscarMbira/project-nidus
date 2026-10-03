/**
 * Document Version History (taxonomy §3, Documents) — the project's capture/retire trail:
 * every process document that was once captured for this project and later retired, with the
 * option to restore it. Rules 40/41/44/38.
 *
 * The current document register (ProjectDocumentsRegisterPage) only tracks a binary
 * is_current (captured) vs archived state — there is no numbered version history anywhere in
 * this app's active document system (confirmed live: the older document_versions/
 * document_governance_stages system has zero rows across every project). This page surfaces
 * that same archived-copy data as the project's document history instead of inventing a new,
 * unused versioning table.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowLeft, RotateCcw } from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import { ExportListMenu } from '@nidus/ui';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js';
import { platformDb } from '@nidus/supabase';
import {
  listArchivedProjectProcessTemplateCopies,
  restoreArchivedProjectProcessTemplate,
} from '@nidus/shared/services/pmTemplateNodeService.js';
import { toProjectDocumentLabel } from '@nidus/shared/utils/projectDocumentNaming.js';

export default function DocumentVersionHistoryPage() {
  const navigate = useNavigate();
  const { projectId } = usePlatformProjectId();
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState(null);
  const [rows, setRows] = useState([]);
  const [restoringId, setRestoringId] = useState(null);
  const { showSuccess, modal: successModal } = useSuccessModal();

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'updated_at', direction: 'desc' },
    storageKey: 'document-version-history-sort',
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const acctId = await getCurrentUserAccountId();
    setAccountId(acctId);
    if (!acctId) {
      setLoading(false);
      return;
    }
    setRows(await listArchivedProjectProcessTemplateCopies(platformDb, { accountId: acctId, projectId }));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const sortAccessors = useMemo(
    () => ({
      name: (r) => toProjectDocumentLabel(r.name) || r.name || '',
      methodology: (r) => r.methodology || '',
      updated_at: (r) => r.updated_at || '',
    }),
    []
  );
  const sorted = sortedData(rows, sortAccessors);

  const exportColumns = [
    { key: 'name', label: 'Document' },
    { key: 'methodology', label: 'Methodology' },
    { key: 'updated_at', label: 'Retired on' },
  ];

  const handleRestore = async (row) => {
    const label = toProjectDocumentLabel(row.name) || row.name;
    if (!window.confirm(`Restore "${label}"? It will move back to Captured on the Documents register.`)) return;
    setRestoringId(row.id);
    try {
      await restoreArchivedProjectProcessTemplate(platformDb, row);
      showSuccess({ recordId: label, operation: 'updated', message: `"${label}" was restored.` });
      load();
    } finally {
      setRestoringId(null);
    }
  };

  if (!projectId || loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading document history…</div>;
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Version History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Documents previously captured for this project, then retired.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end">
          <ExportListMenu columns={exportColumns} data={sorted} baseFilename="DocumentVersionHistory" />
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No retired documents yet — this project's document history will appear here once a captured document is retired.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('name')} onSort={() => handleSort('name')} className="!normal-case whitespace-nowrap">Document</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('methodology')} onSort={() => handleSort('methodology')} className="!normal-case whitespace-nowrap">Methodology</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('updated_at')} onSort={() => handleSort('updated_at')} className="!normal-case whitespace-nowrap">Retired on</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{toProjectDocumentLabel(row.name) || row.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.methodology || 'Common'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRestore(row)}
                        disabled={restoringId === row.id}
                        title="Restore this document"
                        aria-label={`Restore ${toProjectDocumentLabel(row.name) || row.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {successModal}
    </div>
  );
}
