/**
 * Lesson Type Badge Component
 * Visual badge for lesson scope (project/corporate/both)
 */

import { Building2, FolderKanban, Network } from 'lucide-react';

export default function LessonTypeBadge({ scope }) {
  const getBadgeConfig = (scope) => {
    switch (scope) {
      case 'project':
        return {
          label: 'Project',
          icon: FolderKanban,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        };
      case 'corporate':
        return {
          label: 'Corporate',
          icon: Building2,
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
        };
      case 'programme':
        return {
          label: 'Programme',
          icon: Network,
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
        };
      case 'both_project_corporate':
        return {
          label: 'Project & Corporate',
          icon: Building2,
          className: 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900 dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-200'
        };
      case 'both_project_programme':
        return {
          label: 'Project & Programme',
          icon: Network,
          className: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200'
        };
      default:
        return {
          label: 'Project',
          icon: FolderKanban,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
    }
  };

  const config = getBadgeConfig(scope);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
