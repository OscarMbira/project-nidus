/**
 * DraftLimitWarning Component
 *
 * Warning component displayed when user is approaching or has reached
 * the maximum draft limit (15 active drafts).
 *
 * @version v201
 * @created 2026-01-31
 */

import React from 'react';
import { AlertTriangle, Folder, X } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * DraftLimitWarning Component
 *
 * @param {object} props - Component props
 * @param {number} props.count - Current draft count
 * @param {number} [props.max] - Maximum allowed drafts
 * @param {boolean} [props.dismissible] - Can be dismissed
 * @param {function} [props.onDismiss] - Callback when dismissed
 * @param {string} [props.variant] - Variant: 'inline', 'banner', 'toast'
 * @param {string} [props.className] - Additional CSS classes
 */
export function DraftLimitWarning({
  count = 0,
  max = 15,
  dismissible = false,
  onDismiss,
  variant = 'inline',
  className = ''
}) {
  const remaining = max - count;
  const percentage = Math.round((count / max) * 100);

  // Don't show if plenty of slots remaining
  if (remaining > 5) return null;

  // Determine urgency level
  let urgency;
  if (remaining <= 0) {
    urgency = 'critical';
  } else if (remaining <= 2) {
    urgency = 'high';
  } else {
    urgency = 'medium';
  }

  // Urgency styles
  const urgencyStyles = {
    critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-400',
      title: 'text-red-400',
      text: 'text-red-300'
    },
    high: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      title: 'text-amber-400',
      text: 'text-amber-300'
    },
    medium: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      title: 'text-amber-400',
      text: 'text-gray-300'
    }
  };

  const styles = urgencyStyles[urgency];

  // Variant-specific rendering
  if (variant === 'banner') {
    return (
      <div
        className={`
          ${styles.bg} ${styles.border}
          border rounded-lg p-4
          ${className}
        `}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <h4 className={`font-medium ${styles.title}`}>
              {remaining <= 0
                ? 'Draft Limit Reached'
                : `Only ${remaining} Draft Slot${remaining > 1 ? 's' : ''} Remaining`}
            </h4>
            <p className={`mt-1 text-sm ${styles.text}`}>
              {remaining <= 0
                ? 'You have reached the maximum of 15 active drafts. Please resume or delete existing drafts to create new ones.'
                : `You have ${count} of ${max} draft slots used. Consider resuming or deleting drafts you no longer need.`}
            </p>

            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    remaining <= 0
                      ? 'bg-red-500'
                      : remaining <= 2
                      ? 'bg-amber-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {count}/{max}
              </span>
            </div>

            {/* Action link */}
            <div className="mt-3">
              <Link
                to="/app/drafts"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300"
              >
                <Folder className="w-4 h-4" />
                <span>Manage Drafts</span>
              </Link>
            </div>
          </div>

          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div
        className={`
          ${styles.bg} ${styles.border}
          border rounded-lg p-3
          shadow-lg
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${styles.icon} flex-shrink-0`} />
          <span className={`text-sm ${styles.text}`}>
            {remaining <= 0
              ? 'Draft limit reached (15/15)'
              : `${remaining} draft slot${remaining > 1 ? 's' : ''} left`}
          </span>
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-2 p-0.5 text-gray-400 hover:text-white rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1
        ${styles.bg} ${styles.border}
        border rounded-full
        ${className}
      `}
    >
      <AlertTriangle className={`w-3.5 h-3.5 ${styles.icon}`} />
      <span className={`text-xs font-medium ${styles.text}`}>
        {remaining <= 0
          ? 'Limit reached'
          : `${remaining} slot${remaining > 1 ? 's' : ''} left`}
      </span>
    </div>
  );
}

/**
 * DraftLimitMeter Component
 *
 * Visual meter showing draft usage
 *
 * @param {object} props - Component props
 * @param {number} props.count - Current draft count
 * @param {number} [props.max] - Maximum allowed drafts
 * @param {boolean} [props.showText] - Show text labels
 * @param {string} [props.className] - Additional CSS classes
 */
export function DraftLimitMeter({
  count = 0,
  max = 15,
  showText = true,
  className = ''
}) {
  const percentage = Math.round((count / max) * 100);
  const remaining = max - count;

  // Determine color
  let barColor;
  if (remaining <= 0) {
    barColor = 'bg-red-500';
  } else if (remaining <= 3) {
    barColor = 'bg-amber-500';
  } else if (remaining <= 5) {
    barColor = 'bg-amber-500';
  } else {
    barColor = 'bg-blue-500';
  }

  return (
    <div className={className}>
      {showText && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Draft Slots</span>
          <span className={`text-xs font-medium ${
            remaining <= 3 ? 'text-amber-400' : 'text-gray-300'
          }`}>
            {count}/{max}
          </span>
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default DraftLimitWarning;
