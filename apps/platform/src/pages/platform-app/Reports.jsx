/**
 * Report Library (taxonomy §3, Reports). Real hub listing all 10 report types — each also has
 * its own findable sidebar menu item (SQL/v1055_reports_taxonomy_expansion.sql); this page is a
 * single-screen directory for browsing them together. Five of the ten (RAID/Change/Resource/
 * Quality/Testing) deep-link to their existing registers rather than duplicating content; the
 * other four (Project Status, Executive, Schedule, Cost) are new dedicated report pages; Custom
 * Reports links to the existing Report Builder + saved report_templates.
 * Route: /platform/reports
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, BarChart3, Calendar, DollarSign, ShieldAlert, GitBranch,
  Users, CheckCircle, ClipboardCheck, Sliders, Plus,
} from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import ViewToggle from '@nidus/ui/ViewToggle';
import { RowActionButton } from '@nidus/ui';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import RowNumberBadge from '@nidus/ui/RowNumberBadge';

const REPORT_TYPES = [
  { icon: FileText, title: 'Project Status Report', description: 'Overview, milestones, top risks, open issues, and recent changes', path: '/platform/reports/status' },
  { icon: BarChart3, title: 'Executive Report', description: 'Budget, schedule, risk, and change performance at a glance', path: '/platform/reports/executive' },
  { icon: Calendar, title: 'Schedule Report', description: 'Milestones and tasks with status and due dates', path: '/platform/reports/schedule' },
  { icon: DollarSign, title: 'Cost Report', description: 'Budget vs actual spend and the cost actuals ledger', path: '/platform/reports/cost' },
  { icon: ShieldAlert, title: 'RAID Report', description: 'Risks, assumptions, issues, and dependencies register', path: '/platform/raid-log' },
  { icon: GitBranch, title: 'Change Report', description: 'Change requests, assessment, decisions, and implementation', path: '/platform/change-requests' },
  { icon: Users, title: 'Resource Report', description: 'Resource directory and allocation across the project', path: '/platform/resources' },
  { icon: CheckCircle, title: 'Quality Report', description: 'Quality register — activities, inspections, and reviews', path: '/pm/controls/quality-register' },
  { icon: ClipboardCheck, title: 'Testing Report', description: 'Test case repository and execution results', path: '/platform/testing/cases' },
  { icon: Sliders, title: 'Custom Reports', description: 'Build and save your own report with the Report Builder', path: '/platform/reports/builder', canEdit: true },
];

export default function Reports() {
  const navigate = useNavigate();
  const { routeKey } = usePlatformProjectId();
  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : '';
  const [viewMode, setViewMode] = useViewMode('report-library', 'list');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: null, direction: null });

  const visibleReports = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = REPORT_TYPES.filter((report) => {
      if (!needle) return true;
      return `${report.title} ${report.description}`.toLowerCase().includes(needle);
    });
    const key = sort.key || 'title';
    const direction = sort.direction || 'asc';
    return [...filtered].sort((a, b) => {
      const left = String(a[key] || '').toLowerCase();
      const right = String(b[key] || '').toLowerCase();
      const compared = left.localeCompare(right);
      return direction === 'desc' ? -compared : compared;
    });
  }, [query, sort]);

  const cycleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key || !prev.direction) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const openReport = (report) => navigate(`${report.path}${projectSuffix}`);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Library</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Every report type for this project, in one place — each is also reachable from its own sidebar entry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/platform/reports/builder${projectSuffix}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create report
          </button>
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Report library layout" />
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search reports"
        aria-label="Search reports"
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      {viewMode === 'list' ? (
        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <TableHeaderCell sortable sortDirection={sort.key === 'title' ? sort.direction : null} onSort={() => cycleSort('title')}>
                  Report
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={sort.key === 'description' ? sort.direction : null} onSort={() => cycleSort('description')}>
                  Description
                </TableHeaderCell>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {visibleReports.map((report, index) => {
                const Icon = report.icon;
                return (
                  <tr
                    key={report.title}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => openReport(report)}
                  >
                    <TableRowNumberCell number={getDisplayRowNumber(index)} className="text-gray-700 dark:text-gray-200" />
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        {report.title}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{report.description}</td>
                    <td className="px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1">
                        <RowActionButton variant="view" label={`View ${report.title}`} onClick={() => openReport(report)} />
                        {report.canEdit && (
                          <RowActionButton variant="edit" label={`Edit ${report.title}`} onClick={() => openReport(report)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleReports.map((report, index) => {
            const Icon = report.icon;
            return (
              <div
                key={report.title}
                className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm transition-colors"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                  <div className="inline-flex items-center gap-1">
                    <RowActionButton variant="view" label={`View ${report.title}`} onClick={() => openReport(report)} />
                    {report.canEdit && (
                      <RowActionButton variant="edit" label={`Edit ${report.title}`} onClick={() => openReport(report)} />
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => openReport(report)} className="text-left w-full focus:outline-none focus:ring-2 focus:ring-purple-500 rounded">
                  <Icon className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-3" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{report.title}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{report.description}</p>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
