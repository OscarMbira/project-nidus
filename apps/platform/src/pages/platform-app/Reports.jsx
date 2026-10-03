/**
 * Report Library (taxonomy §3, Reports). Real hub listing all 10 report types — each also has
 * its own findable sidebar menu item (SQL/v1055_reports_taxonomy_expansion.sql); this page is a
 * single-screen directory for browsing them together. Five of the ten (RAID/Change/Resource/
 * Quality/Testing) deep-link to their existing registers rather than duplicating content; the
 * other four (Project Status, Executive, Schedule, Cost) are new dedicated report pages; Custom
 * Reports links to the existing Report Builder + saved report_templates.
 * Route: /platform/reports
 */
import { useNavigate } from 'react-router-dom';
import {
  FileText, BarChart3, Calendar, DollarSign, ShieldAlert, GitBranch,
  Users, CheckCircle, ClipboardCheck, Sliders,
} from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'

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
  { icon: Sliders, title: 'Custom Reports', description: 'Build and save your own report with the Report Builder', path: '/platform/reports/builder' },
];

export default function Reports() {
  const navigate = useNavigate();
  const { routeKey } = usePlatformProjectId();
  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold">Report Library</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Every report type for this project, in one place — each is also reachable from its own sidebar entry.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.title}
                type="button"
                onClick={() => navigate(`${report.path}${projectSuffix}`)}
                className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <Icon className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-3" />
                <h3 className="text-base font-semibold mb-1">{report.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{report.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
