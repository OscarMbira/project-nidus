/**
 * Quick Actions Component
 *
 * Displays quick action buttons for common tasks
 * Shows PMO-specific actions for PMO admins
 */

import { FolderPlus, ListPlus, Bell, FileText, Users, Settings, FolderKanban, UserPlus, AlertTriangle, Pause, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuickActions({ isOrgAdmin = false }) {
  const navigate = useNavigate();

  const commonActions = [
    {
      id: 'create-project',
      label: 'Create Project',
      description: 'Start a new project',
      icon: FolderPlus,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/platform/projects/create',
    },
    {
      id: 'create-task',
      label: 'Create Task',
      description: 'Add a new task',
      icon: ListPlus,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/platform/tasks/create',
    },
    {
      id: 'view-notifications',
      label: 'Notifications',
      description: 'View your notifications',
      icon: Bell,
      color: 'bg-yellow-600 hover:bg-yellow-700',
      path: '/platform/notifications',
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      description: 'Create a new report',
      icon: FileText,
      color: 'bg-purple-600 hover:bg-purple-700',
      path: '/platform/reports/builder',
    },
    {
      id: 'manage-team',
      label: 'Manage Teams',
      description: 'View and edit teams',
      icon: Users,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/platform/teams',
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Organization settings',
      icon: Settings,
      color: 'bg-gray-600 hover:bg-gray-700',
      path: '/platform/pmo-admin/settings',
    },
  ];

  const pmoActions = [
    {
      id: 'create-programme',
      label: 'Create Programme',
      description: 'Start a new programme',
      icon: FolderKanban,
      color: 'bg-blue-600 hover:bg-blue-700',
      path: '/platform/programmes/create',
      pmoOnly: true,
    },
    {
      id: 'assign-executive',
      label: 'Assign Executive',
      description: 'Assign executive to project',
      icon: UserPlus,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      path: '/platform/pmo-admin/assign-executive',
      pmoOnly: true,
    },
    {
      id: 'assign-pm',
      label: 'Assign PM',
      description: 'Assign project manager',
      icon: UserCheck,
      color: 'bg-green-600 hover:bg-green-700',
      path: '/platform/pmo-admin/assign-pm',
      pmoOnly: true,
    },
    {
      id: 'raise-exception',
      label: 'Raise Exception',
      description: 'Raise project exception',
      icon: AlertTriangle,
      color: 'bg-red-600 hover:bg-red-700',
      path: '/platform/pmo-admin/raise-exception',
      pmoOnly: true,
    },
    {
      id: 'suspend-project',
      label: 'Suspend Project',
      description: 'Suspend a project',
      icon: Pause,
      color: 'bg-orange-600 hover:bg-orange-700',
      path: '/platform/pmo-admin/suspend-project',
      pmoOnly: true,
    },
  ];

  const actions = isOrgAdmin ? [...commonActions, ...pmoActions] : commonActions;

  const handleActionClick = (path) => {
    navigate(path);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action.path)}
            className={`${action.color} text-white rounded-lg p-4 transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-2 min-h-[120px]`}
          >
            <action.icon className="w-8 h-8" />
            <div className="text-center">              <div className="text-sm font-semibold">{action.label}</div>
              <div className="text-xs opacity-80 mt-1">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
