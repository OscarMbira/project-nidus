/**
 * Risk Status Badge Component
 * Status indicator for risks
 *
 * Avoid blue/purple/violet text classes — BrandingContext remaps those to the
 * org primary colour, which can be unreadable on dark table rows.
 */

import { Clock, Eye, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react';

export default function RiskStatusBadge({ status }) {
  const getStatusConfig = (rawStatus) => {
    const normalized = String(rawStatus || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    switch (normalized) {
      case 'identified':
        return {
          label: 'Identified',
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
        };
      case 'assessing':
        return {
          label: 'Assessing',
          icon: Eye,
          className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200'
        };
      case 'responding':
        return {
          label: 'Responding',
          icon: Zap,
          className: 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200'
        };
      case 'monitoring':
        return {
          label: 'Monitoring',
          icon: Eye,
          className: 'bg-teal-100 text-teal-900 dark:bg-teal-900/50 dark:text-teal-200'
        };
      case 'occurred':
        return {
          label: 'Occurred',
          icon: AlertCircle,
          className: 'bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200'
        };
      case 'closed':
        return {
          label: 'Closed',
          icon: CheckCircle,
          className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'
        };
      case 'expired':
        return {
          label: 'Expired',
          icon: XCircle,
          className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
        };
      default:
        return {
          label: rawStatus || 'Unknown',
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${config.className}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {config.label}
    </span>
  );
}
