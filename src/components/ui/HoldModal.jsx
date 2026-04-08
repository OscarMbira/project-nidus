/**
 * HoldModal Component
 *
 * Modal dialog for adding notes when putting a record on hold.
 * Shows completion status and expiry information.
 *
 * @version v201
 * @created 2026-01-31
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, PauseCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { getEntityLabel } from '../../config/draftQueueConfig';

/**
 * HoldModal Component
 *
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function} props.onConfirm - Callback with hold reason when confirmed
 * @param {function} props.onCancel - Callback when cancelled
 * @param {boolean} [props.isLoading] - Loading state
 * @param {string} props.entityType - Entity type
 * @param {object} props.completion - Completion info { percentage, total, completed }
 * @param {number} props.expiryDays - Days until draft expires
 * @param {number} props.draftCount - Current user's draft count
 * @param {number} props.maxDrafts - Maximum allowed drafts
 */
export function HoldModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  entityType,
  completion = { percentage: 0, total: 0, completed: 0 },
  expiryDays = 14,
  draftCount = 0,
  maxDrafts = 15
}) {
  const [holdReason, setHoldReason] = useState('');
  const textareaRef = useRef(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset reason when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHoldReason('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(holdReason.trim() || null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  const entityLabel = getEntityLabel(entityType);
  const remainingSlots = maxDrafts - draftCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <PauseCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Put {entityLabel} on Hold
              </h3>
              <p className="text-sm text-gray-400">
                Save your progress and continue later
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Progress Summary */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm font-medium text-white">
                {completion.completed} of {completion.total} fields
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  completion.percentage >= 80
                    ? 'bg-green-500'
                    : completion.percentage >= 50
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <div className="mt-1 text-right">
              <span className="text-xs text-gray-500">
                {completion.percentage}% complete
              </span>
            </div>
          </div>

          {/* Hold Reason */}
          <div>
            <label
              htmlFor="holdReason"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Why are you putting this on hold? (Optional)
            </label>
            <textarea
              ref={textareaRef}
              id="holdReason"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="e.g., Waiting for budget approval from finance..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg
                text-white placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                resize-none"
            />
            <div className="mt-1 text-right">
              <span className="text-xs text-gray-500">
                {holdReason.length}/500
              </span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Expiry Info */}
            <div className="flex items-start gap-2 bg-gray-900/50 rounded-lg p-3">
              <Clock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-300">Expires in</p>
                <p className="text-sm text-white">{expiryDays} days</p>
              </div>
            </div>

            {/* Draft Slots */}
            <div className="flex items-start gap-2 bg-gray-900/50 rounded-lg p-3">
              <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                remainingSlots <= 3 ? 'text-amber-400' : 'text-gray-400'
              }`} />
              <div>
                <p className="text-xs font-medium text-gray-300">Draft slots</p>
                <p className={`text-sm ${
                  remainingSlots <= 3 ? 'text-amber-400' : 'text-white'
                }`}>
                  {remainingSlots} of {maxDrafts} left
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-300
              hover:text-white hover:bg-gray-700
              rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2
              bg-amber-600 hover:bg-amber-700
              text-white text-sm font-medium rounded-lg
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4" />
                <span>Put on Hold</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HoldModal;
