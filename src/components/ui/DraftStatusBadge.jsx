/**
 * DraftStatusBadge Component
 *
 * Badge showing draft status (active, resumed, expired, etc.)
 * Used in hold queue lists and form headers.
 *
 * @version v201
 * @created 2026-01-31
 */

import React from 'react';
import {
  Clock,
  Play,
  AlertTriangle,
  CheckCircle,
  Trash2,
  PauseCircle
} from 'lucide-react';

/**
 * DraftStatusBadge Component
 *
 * @param {object} props - Component props
 * @param {string} props.status - Draft status: 'active', 'resumed', 'expired', 'deleted'
 * @param {string} [props.size] - Badge size: 'sm', 'md', 'lg'
 * @param {boolean} [props.showIcon] - Show status icon
 * @param {string} [props.className] - Additional CSS classes
 */
export function DraftStatusBadge({
  status = 'active',
  size = 'sm',
  showIcon = true,
  className = ''
}) {
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  // Status configurations
  const statusConfigs = {
    active: {
      icon: PauseCircle,
      label: 'On Hold',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30'
    },
    resumed: {
      icon: Play,
      label: 'Resumed',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    },
    expired: {
      icon: AlertTriangle,
      label: 'Expired',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30'
    },
    deleted: {
      icon: Trash2,
      label: 'Deleted',
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400',
      borderColor: 'border-gray-500/30'
    },
    completed: {
      icon: CheckCircle,
      label: 'Completed',
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      borderColor: 'border-green-500/30'
    }
  };

  const config = statusConfigs[status] || statusConfigs.active;
  const IconComponent = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-full border
        font-medium
        ${sizeClasses[size]}
        ${config.bgColor}
        ${config.textColor}
        ${config.borderColor}
        ${className}
      `}
    >
      {showIcon && (
        <IconComponent className={iconSizes[size]} />
      )}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * ExpiryBadge Component
 *
 * Shows time until expiry with color coding
 *
 * @param {object} props - Component props
 * @param {Date|string} props.expiresAt - Expiry date
 * @param {string} [props.size] - Badge size
 * @param {string} [props.className] - Additional CSS classes
 */
export function ExpiryBadge({
  expiresAt,
  size = 'sm',
  className = ''
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  // Calculate days remaining
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Determine color based on urgency
  let config;
  if (daysRemaining <= 0) {
    config = {
      label: 'Expired',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30'
    };
  } else if (daysRemaining <= 3) {
    config = {
      label: `${daysRemaining}d left`,
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30'
    };
  } else if (daysRemaining <= 7) {
    config = {
      label: `${daysRemaining}d left`,
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30'
    };
  } else {
    config = {
      label: `${daysRemaining}d left`,
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400',
      borderColor: 'border-gray-500/30'
    };
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-full border
        font-medium
        ${sizeClasses[size]}
        ${config.bgColor}
        ${config.textColor}
        ${config.borderColor}
        ${className}
      `}
      title={`Expires ${expiry.toLocaleDateString()}`}
    >
      <Clock className={iconSizes[size]} />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * CompletionBadge Component
 *
 * Shows completion percentage with progress indicator
 *
 * @param {object} props - Component props
 * @param {number} props.percentage - Completion percentage (0-100)
 * @param {string} [props.size] - Badge size
 * @param {string} [props.className] - Additional CSS classes
 */
export function CompletionBadge({
  percentage = 0,
  size = 'sm',
  className = ''
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm'
  };

  // Determine color based on completion
  let color;
  if (percentage >= 80) {
    color = 'text-green-400';
  } else if (percentage >= 50) {
    color = 'text-amber-400';
  } else {
    color = 'text-blue-400';
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full bg-gray-700/50 border border-gray-600
        font-medium
        ${sizeClasses[size]}
        ${color}
        ${className}
      `}
    >
      {/* Mini progress bar */}
      <div className="w-8 h-1.5 bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            percentage >= 80
              ? 'bg-green-500'
              : percentage >= 50
              ? 'bg-amber-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span>{percentage}%</span>
    </span>
  );
}

export default DraftStatusBadge;
