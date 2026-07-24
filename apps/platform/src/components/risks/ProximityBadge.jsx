/**
 * Proximity Badge Component
 * Proximity indicator for risks
 */

import { Clock, Calendar, CalendarDays, Globe } from 'lucide-react';

export default function ProximityBadge({ proximity, proximityDate = null }) {
  const getProximityConfig = (proximity) => {
    switch (proximity) {
      case 'imminent':
        return {
          label: 'Imminent',
          icon: Clock,
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
      case 'within_stage':
        return {
          label: 'Within Stage',
          icon: Calendar,
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        };
      case 'within_project':
        return {
          label: 'Within Project',
          icon: CalendarDays,
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        };
      case 'beyond_project':
        return {
          label: 'Beyond Project',
          icon: Globe,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        };
      default:
        return {
          label: proximity || 'Unknown',
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
    }
  };

  const config = getProximityConfig(proximity);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
      {proximityDate && (
        <span className="ml-1 opacity-75">
          ({new Date(proximityDate).toLocaleDateString()})
        </span>
      )}
    </span>
  );
}
