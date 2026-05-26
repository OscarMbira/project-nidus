import { useMemo } from 'react';
import { FileText, Calendar, TrendingUp, TrendingDown, Edit2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import ExportListMenu from '../../../components/ui/ExportListMenu';
import SortToolbar from '../../../components/ui/SortToolbar';
import { useSortableTable } from '../../../hooks/useSortableTable';

const END_STAGE_REPORT_COLUMNS = [
  { key: 'document_ref', label: 'Document Ref' },
  { key: 'report_title', label: 'Title' },
  { key: 'approval_status', label: 'Status' },
  { key: 'stage_name', label: 'Stage' }
];

export default function EndStageReportList({ reports, onEdit, onView, onRefresh, onAdd }) {
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'report_date', direction: 'desc' },
    storageKey: 'nidus-end-stage-reports-sort',
  });
  const reportAccessors = useMemo(
    () => ({
      report_title: (r) => r.report_title ?? '',
      stage_name: (r) => r.stage_name ?? '',
      approval_status: (r) => r.approval_status ?? '',
      report_date: (r) => r.report_date ?? '',
    }),
    []
  );
  const displayReports = useMemo(
    () => sortedData(reports || [], reportAccessors),
    [reports, sortedData, reportAccessors]
  );

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'under-review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors.draft;
  };

  if (!reports?.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No End Stage Reports Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your first end stage report to document stage completion and performance
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create End Stage Report
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            End Stage Reports
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {displayReports.length} {displayReports.length === 1 ? 'report' : 'reports'}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={END_STAGE_REPORT_COLUMNS} data={displayReports} baseFilename="EndStageReports" disabled={!displayReports?.length} />
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Report
          </button>
        </div>
      </div>

      <SortToolbar
        columns={[
          { key: 'report_title', label: 'Title' },
          { key: 'stage_name', label: 'Stage' },
          { key: 'approval_status', label: 'Status' },
          { key: 'report_date', label: 'Date' },
        ]}
        getSortDirection={getSortDirectionForColumn}
        onSort={handleSort}
        className="mb-2"
      />

      <div className="grid grid-cols-1 gap-4">
        {displayReports.map((report, index) => (
          <div
            key={report.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {report.report_title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.approval_status)}`}>
                        {report.approval_status?.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(report.report_date).toLocaleDateString()}
                      </span>
                      {report.stage_name && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span>Stage {report.stage_number}: {report.stage_name}</span>
                        </>
                      )}
                      {report.stage_status && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="capitalize">{report.stage_status.replace('-', ' ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {report.schedule_performance_index && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Schedule (SPI)</span>
                        {report.schedule_performance_index >= 1.0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {report.schedule_performance_index.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {report.cost_performance_index && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cost (CPI)</span>
                        {report.cost_performance_index >= 1.0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {report.cost_performance_index.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {report.quality_performance_percentage !== null && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Quality</span>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {report.quality_performance_percentage.toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Objectives Met */}
                {report.stage_objectives_met !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    {report.stage_objectives_met ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">
                      {report.stage_objectives_met ? 'Objectives met' : 'Objectives not fully met'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onView && (
                  <button
                    onClick={() => onView(report)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="View report"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}
                {(report.approval_workflow_status === 'draft' || report.approval_status === 'draft' || report.approval_workflow_status === 'rejected') && onEdit && (
                  <button
                    onClick={() => onEdit(report)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Edit report"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
