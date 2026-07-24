/**
 * useDraftQueue Hook
 *
 * Custom hook for managing draft/hold queue functionality in forms.
 * Provides auto-save, draft lifecycle management, and state tracking.
 *
 * @version v201
 * @created 2026-01-31
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveDraft,
  getDraft,
  resumeDraft,
  deleteDraft,
  updateDraft,
  checkExistingDraft,
  getDraftStats,
  checkDraftLimit,
  calculateCompletion,
  getExpiryConfig,
  MAX_ACTIVE_DRAFTS,
  AUTO_SAVE_DEBOUNCE_MS
} from '../services/draftQueueService';

/**
 * Hook for managing draft queue operations
 *
 * @param {string} entityType - Type of entity (project, benefit, issue, etc.)
 * @param {string|null} entityId - Entity ID for edit mode, null for create
 * @param {object} options - Additional options
 * @returns {object} Draft queue state and actions
 */
export function useDraftQueue(entityType, entityId = null, options = {}) {
  const {
    organisationId = null,
    projectId = null,
    projectTypeId = null,
    formRoute = null,
    autoSaveEnabled = true,
    autoSaveInterval = AUTO_SAVE_DEBOUNCE_MS
  } = options;

  // State
  const [isDraft, setIsDraft] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [draftCount, setDraftCount] = useState(0);
  const [canCreateDraft, setCanCreateDraft] = useState(true);
  const [expiryDays, setExpiryDays] = useState(14);
  const [existingDraftInfo, setExistingDraftInfo] = useState(null);

  // Refs for debouncing
  const autoSaveTimeoutRef = useRef(null);
  const lastFormDataRef = useRef(null);
  const isMountedRef = useRef(true);

  // Load initial state
  useEffect(() => {
    isMountedRef.current = true;
    loadInitialState();

    return () => {
      isMountedRef.current = false;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [entityType, entityId]);

  /**
   * Load initial draft state and stats
   */
  const loadInitialState = async () => {
    try {
      // Get draft stats
      const stats = await getDraftStats();
      if (isMountedRef.current) {
        setDraftCount(stats.active_drafts || 0);
        setCanCreateDraft((stats.active_drafts || 0) < MAX_ACTIVE_DRAFTS);
      }

      // Get expiry config
      const expiry = await getExpiryConfig(organisationId, projectTypeId, entityType);
      if (isMountedRef.current) {
        setExpiryDays(expiry);
      }

      // Check for existing draft
      const existing = await checkExistingDraft(entityType, entityId);
      if (isMountedRef.current && existing) {
        setExistingDraftInfo(existing);
      }
    } catch (error) {
      console.error('Error loading draft state:', error);
    }
  };

  /**
   * Refresh draft stats
   */
  const refreshStats = useCallback(async () => {
    try {
      const stats = await getDraftStats();
      if (isMountedRef.current) {
        setDraftCount(stats.active_drafts || 0);
        setCanCreateDraft((stats.active_drafts || 0) < MAX_ACTIVE_DRAFTS);
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  }, []);

  /**
   * Save form data as draft
   *
   * @param {object} formData - Current form state
   * @param {object} saveOptions - Additional save options
   * @returns {Promise<object>} Saved draft
   */
  const saveDraftHandler = useCallback(async (formData, saveOptions = {}) => {
    const { holdReason, entityTitle } = saveOptions;

    setSaveStatus('saving');

    try {
      const saved = await saveDraft(entityType, formData, entityId, {
        organisationId,
        projectId,
        projectTypeId,
        holdReason,
        entityTitle,
        formRoute
      });

      if (isMountedRef.current) {
        setDraftId(saved.id);
        setIsDraft(true);
        setLastSaved(new Date());
        setSaveStatus('saved');
        await refreshStats();
      }

      return saved;
    } catch (error) {
      if (isMountedRef.current) {
        setSaveStatus('error');
      }
      throw error;
    }
  }, [entityType, entityId, organisationId, projectId, projectTypeId, formRoute, refreshStats]);

  /**
   * Resume an existing draft
   *
   * @param {string} resumeDraftId - Draft ID to resume (optional, uses existing if not provided)
   * @returns {Promise<object>} Draft form data
   */
  const resumeDraftHandler = useCallback(async (resumeDraftId = null) => {
    const targetId = resumeDraftId || existingDraftInfo?.draft_id || draftId;
    if (!targetId) {
      throw new Error('No draft ID to resume');
    }

    try {
      const draft = await resumeDraft(targetId);

      if (isMountedRef.current) {
        setDraftId(draft.id);
        setIsDraft(true);
        setExistingDraftInfo(null);
        await refreshStats();
      }

      return draft.form_data;
    } catch (error) {
      console.error('Error resuming draft:', error);
      throw error;
    }
  }, [draftId, existingDraftInfo, refreshStats]);

  /**
   * Delete current draft
   *
   * @param {string} deleteDraftId - Draft ID to delete (optional)
   * @returns {Promise<boolean>} True if deleted
   */
  const deleteDraftHandler = useCallback(async (deleteDraftId = null) => {
    const targetId = deleteDraftId || draftId;
    if (!targetId) {
      throw new Error('No draft ID to delete');
    }

    try {
      await deleteDraft(targetId);

      if (isMountedRef.current) {
        if (targetId === draftId) {
          setDraftId(null);
          setIsDraft(false);
        }
        if (targetId === existingDraftInfo?.draft_id) {
          setExistingDraftInfo(null);
        }
        await refreshStats();
      }

      return true;
    } catch (error) {
      console.error('Error deleting draft:', error);
      throw error;
    }
  }, [draftId, existingDraftInfo, refreshStats]);

  /**
   * Auto-save handler with debouncing
   *
   * @param {object} formData - Current form state
   */
  const autoSave = useCallback((formData) => {
    if (!autoSaveEnabled || !draftId) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Store latest form data
    lastFormDataRef.current = formData;

    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current || !draftId) return;

      setSaveStatus('saving');

      try {
        await updateDraft(draftId, lastFormDataRef.current);

        if (isMountedRef.current) {
          setLastSaved(new Date());
          setSaveStatus('saved');
        }
      } catch (error) {
        console.error('Auto-save error:', error);
        if (isMountedRef.current) {
          setSaveStatus('error');
        }
      }
    }, autoSaveInterval);
  }, [draftId, autoSaveEnabled, autoSaveInterval]);

  /**
   * Check for existing draft (manual check)
   *
   * @returns {Promise<object|null>} Existing draft info or null
   */
  const checkExistingDraftHandler = useCallback(async () => {
    try {
      const existing = await checkExistingDraft(entityType, entityId);
      if (isMountedRef.current) {
        setExistingDraftInfo(existing);
      }
      return existing;
    } catch (error) {
      console.error('Error checking existing draft:', error);
      return null;
    }
  }, [entityType, entityId]);

  /**
   * Get completion percentage for form data
   *
   * @param {object} formData - Form data
   * @returns {object} { percentage, total, completed }
   */
  const getCompletion = useCallback((formData) => {
    return calculateCompletion(entityType, formData);
  }, [entityType]);

  /**
   * Get expiry days for current context
   *
   * @returns {number} Expiry days
   */
  const getExpiryDaysHandler = useCallback(() => {
    return expiryDays;
  }, [expiryDays]);

  /**
   * Dismiss existing draft notification
   */
  const dismissExistingDraft = useCallback(() => {
    setExistingDraftInfo(null);
  }, []);

  /**
   * Force refresh of all draft data
   */
  const refresh = useCallback(async () => {
    await loadInitialState();
  }, []);

  return {
    // State
    isDraft,
    draftId,
    lastSaved,
    saveStatus,
    draftCount,
    canCreateDraft,
    expiryDays,
    existingDraftInfo,
    remainingSlots: MAX_ACTIVE_DRAFTS - draftCount,

    // Actions
    saveDraft: saveDraftHandler,
    resumeDraft: resumeDraftHandler,
    deleteDraft: deleteDraftHandler,
    autoSave,

    // Utilities
    checkExistingDraft: checkExistingDraftHandler,
    getCompletion,
    getExpiryDays: getExpiryDaysHandler,
    dismissExistingDraft,
    refresh,
    refreshStats,

    // Constants
    MAX_ACTIVE_DRAFTS
  };
}

export default useDraftQueue;
