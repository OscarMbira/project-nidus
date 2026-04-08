/**
 * Risk Status Badge Component
 * Status indicator for risks
 */

import { Clock, Eye, CheckCircle, XCircle, AlertCircle, FileCheck, Zap } from 'lucide-react';

export default function RiskStatusBadge({ status }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'identified':
        return {
          label: 'Identified',
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
      case 'assessing':
        return {
          label: 'Assessing',
          icon: Eye,
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        };
      case 'responding':
        return {
          label: 'Responding',
          icon: Zap,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        };
      case 'monitoring':
        return {
          label: 'Monitoring',
          icon: Eye,
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
        };
      case 'occurred':
        return {
          label: 'Occurred',
          icon: AlertCircle,
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
      case 'closed':
        return {
          label: 'Closed',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        };
      case 'expired':
        return {
          label: 'Expired',
          icon: XCircle,
          className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
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
