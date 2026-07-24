/**
 * Quick actions tailored to Portfolio / Programmes / Projects dashboard tabs.
 * Theme-aware: solid CTAs with consistent contrast in light and dark mode.
 */
import {
  Briefcase,
  Plus,
  LayoutDashboard,
  FolderOpen,
  FileBarChart,
  Tags,
  Layers,
  GitBranch,
  Target,
  CalendarClock,
  FolderKanban,
  ListChecks,
  PauseCircle,
  Users,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BTN =
  'rounded-lg p-4 transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[112px] text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 hover:scale-[1.02] active:scale-[0.98]';

const ACTIONS = {
  portfolio: [
    {
      id: 'pf-new',
      label: 'New portfolio',
      description: 'Create a portfolio',
      icon: Plus,
      path: '/platform/portfolio/create',
      className: `${BTN} bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500`,
    },
    {
      id: 'pf-list',
      label: 'All portfolios',
      description: 'Browse the register',
      icon: Briefcase,
      path: '/platform/portfolio',
      className: `${BTN} bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500`,
    },
    {
      id: 'pf-dash',
      label: 'Portfolio dashboard',
      description: 'Roll-up view',
      icon: LayoutDashboard,
      path: '/platform/portfolio/dashboard',
      className: `${BTN} bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500`,
    },
    {
      id: 'pf-projects',
      label: 'Portfolio projects',
      description: 'Projects in portfolios',
      icon: FolderOpen,
      path: '/platform/portfolio/projects',
      className: `${BTN} bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500`,
    },
    {
      id: 'pf-reports',
      label: 'Portfolio reports',
      description: 'Reporting hub',
      icon: FileBarChart,
      path: '/platform/portfolio/reports',
      className: `${BTN} bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500`,
    },
    {
      id: 'pf-categories',
      label: 'Portfolio categories',
      description: 'PMO taxonomy',
      icon: Tags,
      path: '/platform/pmo-admin/portfolio-categories',
      className: `${BTN} bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500`,
      pmoOnly: true,
    },
  ],
  programmes: [
    {
      id: 'pg-new',
      label: 'New programme',
      description: 'Create a programme',
      icon: Plus,
      path: '/platform/programme/create',
      className: `${BTN} bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500`,
    },
    {
      id: 'pg-list',
      label: 'All programmes',
      description: 'Browse the register',
      icon: Layers,
      path: '/platform/programme',
      className: `${BTN} bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500`,
    },
    {
      id: 'pg-dash',
      label: 'Programme dashboard',
      description: 'Cross-programme view',
      icon: LayoutDashboard,
      path: '/platform/programme/dashboard',
      className: `${BTN} bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500`,
    },
    {
      id: 'pg-deps',
      label: 'Dependencies',
      description: 'Programme dependencies',
      icon: GitBranch,
      path: '/platform/programme/dependencies',
      className: `${BTN} bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500`,
    },
    {
      id: 'pg-benefits',
      label: 'Benefits',
      description: 'Benefits register',
      icon: Target,
      path: '/platform/programme/benefits',
      className: `${BTN} bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500`,
    },
    {
      id: 'pg-timeline',
      label: 'Timeline',
      description: 'Schedule overview',
      icon: CalendarClock,
      path: '/platform/programme/timeline',
      className: `${BTN} bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500`,
    },
  ],
  projects: [
    {
      id: 'pj-new',
      label: 'New project',
      description: 'Create a project',
      icon: Plus,
      path: '/platform/projects/create',
      className: `${BTN} bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500`,
    },
    {
      id: 'pj-list',
      label: 'All projects',
      description: 'Full project list',
      icon: FolderKanban,
      path: '/platform/projects',
      className: `${BTN} bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500`,
    },
    {
      id: 'pj-tasks',
      label: 'Tasks',
      description: 'Work and assignments',
      icon: ListChecks,
      path: '/platform/tasks',
      className: `${BTN} bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500`,
    },
    {
      id: 'pj-hold',
      label: 'On hold',
      description: 'Suspended / drafts',
      icon: PauseCircle,
      path: '/platform/projects/on-hold',
      className: `${BTN} bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500`,
    },
    {
      id: 'pj-teams',
      label: 'Teams',
      description: 'People and roles',
      icon: Users,
      path: '/platform/teams',
      className: `${BTN} bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500`,
    },
    {
      id: 'pj-notify',
      label: 'Notifications',
      description: 'Alerts and updates',
      icon: Bell,
      path: '/platform/notifications',
      className: `${BTN} bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500`,
    },
  ],
};

const TITLES = {
  portfolio: 'Portfolio quick actions',
  programmes: 'Programmes quick actions',
  projects: 'Projects quick actions',
};

export default function PMOScopeQuickActions({ scope, isOrgAdmin = false }) {
  const navigate = useNavigate();
  const raw = ACTIONS[scope];
  if (!raw) return null;

  const actions = raw.filter((a) => (a.pmoOnly ? isOrgAdmin : true));

  return (
    <div className="space-y-3 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{TITLES[scope]}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            onClick={() => navigate(action.path)}
            className={action.className}
          >
            <action.icon className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 opacity-95" aria-hidden />
            <div className="text-center px-0.5">              <div className="text-xs sm:text-sm font-semibold leading-tight">{action.label}</div>
              <div className="text-[10px] sm:text-xs opacity-90 mt-1 leading-snug">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
