/**
 * Overdue Indicator Component
 * Shows overdue status for entries with target dates
 */

import { AlertCircle } from 'lucide-react';

export default function OverdueIndicator({ targetDate, status, className = '' }) {
  if (!targetDate || status === 'completed' || status === 'cancelled') {
    return null;
  }

  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const isOverdue = target < today;
  const daysOverdue = isOverdue ? Math.floor((today - target) / (1000 * 60 * 60 * 24)) : 0;

  if (!isOverdue) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 text-red-600 text-sm ${className}`}>
      <AlertCircle className="w-4 h-4" />
      <span>Overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}</span>
    </div>
  );
}
