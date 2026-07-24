/**
 * Lesson Status Badge Component
 * Status indicator for lessons
 */

import { Clock, Eye, CheckCircle, XCircle, AlertCircle, FileCheck } from 'lucide-react';

export default function LessonStatusBadge({ status }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'logged':
        return {
          label: 'Logged',
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
      case 'under_review':
        return {
          label: 'Under Review',
          icon: Eye,
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        };
      case 'action_required':
        return {
          label: 'Action Required',
          icon: AlertCircle,
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        };
      case 'action_taken':
        return {
          label: 'Action Taken',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        };
      case 'closed':
        return {
          label: 'Closed',
          icon: FileCheck,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
      default:
        return {
          label: status || 'Unknown',
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
