/**
 * AutoSaveIndicator Component
 *
 * Visual indicator showing auto-save status for draft forms.
 * Shows saving, saved, and error states with appropriate styling.
 *
 * @version v201
 * @created 2026-01-31
 */

import React from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * AutoSaveIndicator Component
 *
 * @param {object} props - Component props
 * @param {string} props.status - Save status: 'idle', 'saving', 'saved', 'error'
 * @param {Date} [props.lastSaved] - Last saved timestamp
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showText] - Show text label
 * @param {string} [props.size] - Size: 'sm', 'md', 'lg'
 */
export function AutoSaveIndicator({
  status = 'idle',
  lastSaved = null,
  className = '',
  showText = true,
  size = 'sm'
}) {
  // Size classes
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Format last saved time
  const formatLastSaved = (date) => {
    if (!date) return null;

    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  // Status configurations
  const statusConfigs = {
    idle: {
      icon: Cloud,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      text: 'Not saved',
      animate: false
    },
    saving: {
      icon: Loader2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      text: 'Saving...',
      animate: true
    },
    saved: {
      icon: Check,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      text: lastSaved ? `Saved ${formatLastSaved(lastSaved)}` : 'Saved',
      animate: false
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      text: 'Save failed',
      animate: false
    }
  };

  const config = statusConfigs[status] || statusConfigs.idle;
  const IconComponent = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-2 py-1 rounded-full
        ${config.bgColor}
        ${className}
      `}
      title={config.text}
    >
      <IconComponent
        className={`
          ${iconSizes[size]}
          ${config.color}
          ${config.animate ? 'animate-spin' : ''}
        `}
      />
      {showText && (
        <span className={`${textSizes[size]} ${config.color} font-medium`}>
          {config.text}
        </span>
      )}
    </div>
  );
}

/**
 * Compact version of AutoSaveIndicator (icon only)
 */
export function AutoSaveIcon({ status = 'idle', className = '' }) {
  return (
    <AutoSaveIndicator
      status={status}
      showText={false}
      size="sm"
      className={className}
    />
  );
}

/**
 * Inline text version of AutoSaveIndicator
 */
export function AutoSaveText({
  status = 'idle',
  lastSaved = null,
  className = ''
}) {
  const statusTexts = {
    idle: { text: 'Draft', color: 'text-gray-500' },
    saving: { text: 'Saving...', color: 'text-blue-400' },
    saved: {
      text: lastSaved
        ? `Saved ${formatRelativeTime(lastSaved)}`
        : 'Saved',
      color: 'text-green-400'
    },
    error: { text: 'Save failed', color: 'text-red-400' }
  };

  const config = statusTexts[status] || statusTexts.idle;

  return (
    <span className={`text-xs ${config.color} ${className}`}>
      {status === 'saving' && (
        <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />
      )}
      {config.text}
    </span>
  );
}

// Helper function for relative time
function formatRelativeTime(date) {
  if (!date) return '';

  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default AutoSaveIndicator;
