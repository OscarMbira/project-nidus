/**
 * HoldButton Component
 *
 * Reusable "Put on Hold" button for all create/edit forms.
 * Triggers the HoldModal for adding notes before saving draft.
 *
 * @version v201
 * @created 2026-01-31
 */

import React, { useState } from 'react';
import { PauseCircle, Loader2 } from 'lucide-react';
import HoldModal from './HoldModal';
import { useDraftQueue } from '../../hooks/useDraftQueue';

/**
 * HoldButton Component
 *
 * @param {object} props - Component props
 * @param {string} props.entityType - Type of entity (project, benefit, etc.)
 * @param {string} [props.entityId] - Entity ID for edit mode
 * @param {object} props.formData - Current form state
 * @param {string} [props.projectTypeId] - Project type UUID
 * @param {string} [props.organisationId] - Organisation UUID
 * @param {string} [props.projectId] - Project UUID
 * @param {string} [props.formRoute] - Route to resume editing
 * @param {function} [props.onHoldComplete] - Callback after successful hold
 * @param {function} [props.onError] - Callback on error
 * @param {boolean} [props.disabled] - Disable the button
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.size] - Button size: 'sm', 'md', 'lg'
 * @param {string} [props.variant] - Button variant: 'secondary', 'outline', 'ghost'
 */
export function HoldButton({
  entityType,
  entityId = null,
  formData,
  projectTypeId = null,
  organisationId = null,
  projectId = null,
  formRoute = null,
  onHoldComplete,
  onError,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'secondary'
}) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    saveDraft,
    draftCount,
    canCreateDraft,
    remainingSlots,
    expiryDays,
    getCompletion
  } = useDraftQueue(entityType, entityId, {
    organisationId,
    projectId,
    projectTypeId,
    formRoute
  });

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };

  // Variant classes
  const variantClasses = {
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border border-gray-500',
    outline: 'bg-transparent hover:bg-gray-700 text-gray-300 border border-gray-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300'
  };

  const handleClick = () => {
    if (!canCreateDraft && !entityId) {
      // Can't create new draft if at limit
      onError?.('Maximum active drafts limit (15) reached. Please resume or delete existing drafts.');
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async (holdReason) => {
    setIsLoading(true);

    try {
      const saved = await saveDraft(formData, {
        holdReason,
        entityTitle: null // Will be extracted from formData
      });

      // Clear loading and close modal before callback so UI never stays stuck on "Saving..."
      setIsLoading(false);
      setShowModal(false);
      onHoldComplete?.(saved);
    } catch (error) {
      console.error('Error saving draft:', error);
      const message = error?.message || 'Failed to save draft';
      setIsLoading(false);
      onError?.(message);
      if (typeof onError !== 'function') {
        alert(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const completion = getCompletion(formData);
  const isButtonDisabled = disabled || isLoading || (!canCreateDraft && !entityId);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isButtonDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-lg
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PauseCircle className="w-4 h-4" />
        )}
        <span>Put on Hold</span>

        {/* Show remaining slots warning */}
        {remainingSlots <= 3 && remainingSlots > 0 && (
          <span className="text-amber-400 text-xs ml-1">
            ({remainingSlots} left)
          </span>
        )}
      </button>

      {/* Hold Modal */}
      <HoldModal
        isOpen={showModal}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={isLoading}
        entityType={entityType}
        completion={completion}
        expiryDays={expiryDays}
        draftCount={draftCount}
        maxDrafts={15}
      />
    </>
  );
}

export default HoldButton;
