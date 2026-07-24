/**
 * Risk Type Badge Component
 * Visual badge for threat/opportunity
 */

import { AlertTriangle, TrendingUp } from 'lucide-react';

export default function RiskTypeBadge({ riskType }) {
  if (riskType === 'opportunity') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <TrendingUp className="w-3 h-3" />
        Opportunity
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
      <AlertTriangle className="w-3 h-3" />
      Threat
    </span>
  );
}
