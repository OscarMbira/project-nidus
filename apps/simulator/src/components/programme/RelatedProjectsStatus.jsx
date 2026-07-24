import { FolderKanban, CheckCircle, Clock, PauseCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function RelatedProjectsStatus({ projects = [] }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No projects in programme</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'active':
        return Clock;
      case 'on_hold':
        return PauseCircle;
      case 'cancelled':
        return XCircle;
      default:
        return FolderKanban;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'active':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'on_hold':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Related Projects Status
        </h3>
        <FolderKanban className="h-5 w-5 text-gray-400" />
      </div>

      <div className="space-y-3">
        {projects.map((proj) => {
          const project = proj.project || {};
          const status = project.project_status || 'unknown';
          const StatusIcon = getStatusIcon(status);
          const priority = proj.programme_priority || 'medium';

          return (
            <div
              key={proj.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <StatusIcon className={`h-5 w-5 ${getStatusColor(status)} rounded-full p-1`} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {project.project_name || 'Unknown Project'}
                  </h4>
                  {project.project_code && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {project.project_code}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {priority && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(priority)}`}>
                    {priority}
                  </span>
                )}
                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(status)}`}>
                  {status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Total Projects:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {projects.length}
          </span>
        </div>
      </div>
    </div>
  );
}

