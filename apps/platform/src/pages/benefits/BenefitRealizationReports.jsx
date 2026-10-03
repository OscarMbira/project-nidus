/**
 * Post-Implementation Review (taxonomy §3, Benefits) — list of benefit realization reports
 * for the current project. Rules 40/41/44/61/38.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Plus, LayoutGrid, List as ListIcon, ArrowLeft } from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import { RowActionButton, ExportListMenu } from '@nidus/ui';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import { getBenefitRealizationReports, deleteBenefitRealizationReport } from '../../services/benefitsService';

const REPORT_TYPE_LABELS = {
  benefits_realization: 'Benefits Realization',
  benefits_vs_costs: 'Benefits vs Costs',
  benefits_forecast: 'Benefits Forecast',
  benefits_attribution: 'Benefits Attribution',
  comprehensive: 'Comprehensive',
};

export default function BenefitRealizationReports() {
  const navigate = useNavigate();
  const { projectId } = usePlatformProjectId();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useViewMode('benefit-realization-reports', 'list');
  const { showSuccess, modal: successModal } = useSuccessModal();

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'report_date', direction: 'desc' },
    storageKey: 'benefit-realization-reports-sort',
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setReports(await getBenefitRealizationReports({ project_id: projectId }));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) => r.report_name?.toLowerCase().includes(q) || r.report_description?.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const sortAccessors = useMemo(
    () => ({
      report_name: (r) => r.report_name || '',
      report_type: (r) => r.report_type || '',
      report_status: (r) => r.report_status || '',
      report_date: (r) => r.report_date || '',
    }),
    []
  );
  const sorted = sortedData(filtered, sortAccessors);

  const exportColumns = [
    { key: 'report_name', label: 'Report' },
    { key: 'report_type', label: 'Type' },
    { key: 'report_status', label: 'Status' },
    { key: 'report_date', label: 'Report date' },
  ];

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete report "${row.report_name}"?`)) return;
    await deleteBenefitRealizationReport(row.id);
    showSuccess({ recordId: row.report_name, operation: 'deleted', message: `"${row.report_name}" was deleted.` });
    load();
  };

  if (!projectId || loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading reports…</div>;
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <FileCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post-Implementation Review</h1>
        </div>
        <button onClick={() => navigate('/platform/benefits/realization-reports/create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Report
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="PostImplementationReviews" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No reports yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('report_name')} onSort={() => handleSort('report_name')} className="!normal-case whitespace-nowrap">Report</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('report_type')} onSort={() => handleSort('report_type')} className="!normal-case whitespace-nowrap">Type</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('report_status')} onSort={() => handleSort('report_status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('report_date')} onSort={() => handleSort('report_date')} className="!normal-case whitespace-nowrap">Report date</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.report_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{REPORT_TYPE_LABELS[row.report_type] || row.report_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.report_status}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.report_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View report" onClick={() => navigate(`/platform/benefits/realization-reports/${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit report" onClick={() => navigate(`/platform/benefits/realization-reports/${row.id}/edit`)} />
                        <RowActionButton variant="delete" label="Delete report" onClick={() => handleDelete(row)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((row) => (
              <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.report_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{REPORT_TYPE_LABELS[row.report_type] || row.report_type} · {row.report_status}</div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View report" onClick={() => navigate(`/platform/benefits/realization-reports/${row.id}`)} />
                  <RowActionButton variant="edit" label="Edit report" onClick={() => navigate(`/platform/benefits/realization-reports/${row.id}/edit`)} />
                  <RowActionButton variant="delete" label="Delete report" onClick={() => handleDelete(row)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {successModal}
    </div>
  );
}
