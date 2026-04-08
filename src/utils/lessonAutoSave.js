/**
 * Lesson Auto-Save Utility
 * Handles auto-saving lesson drafts to localStorage and server
 */

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY_PREFIX = 'lesson_draft_';

/**
 * Get storage key for a lesson draft
 */
function getStorageKey(lessonId, projectId) {
  if (lessonId) {
    return `${STORAGE_KEY_PREFIX}${lessonId}`;
  }
  return `${STORAGE_KEY_PREFIX}new_${projectId}`;
}

/**
 * Save lesson draft to localStorage
 */
export function saveDraftToLocalStorage(lessonId, projectId, formData) {
  try {
    const key = getStorageKey(lessonId, projectId);
    const draftData = {
      ...formData,
      savedAt: new Date().toISOString(),
      lessonId,
      projectId
    };
    localStorage.setItem(key, JSON.stringify(draftData));
    return true;
  } catch (error) {
    console.error('Error saving draft to localStorage:', error);
    return false;
  }
}

/**
 * Recover draft from localStorage
 */
export function recoverDraft(lessonId, projectId) {
  try {
    const key = getStorageKey(lessonId, projectId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const draftData = JSON.parse(saved);
      // Only return drafts less than 7 days old
      const savedAt = new Date(draftData.savedAt);
      const daysSinceSaved = (new Date() - savedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceSaved < 7) {
        return draftData;
      } else {
        localStorage.removeItem(key);
      }
    }
    return null;
  } catch (error) {
    console.error('Error recovering draft:', error);
    return null;
  }
}

/**
 * Clear draft from localStorage
 */
export function clearDraft(lessonId, projectId) {
  try {
    const key = getStorageKey(lessonId, projectId);
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing draft:', error);
    return false;
  }
}

/**
 * Enable auto-save to localStorage for lesson form
 */
export function enableAutoSave(lessonId, projectId, formData, onStatusChange) {
  if (!projectId) return () => {}

  let lastSavedData = JSON.stringify(formData)
  let intervalId

  const save = () => {
    try {
      const currentData = JSON.stringify(formData)
      if (currentData === lastSavedData) {
        return // No changes
      }

      // Save to localStorage
      saveDraftToLocalStorage(lessonId, projectId, formData)
      lastSavedData = currentData

      if (onStatusChange) {
        onStatusChange({ saved: true, timestamp: new Date() })
      }
    } catch (error) {
      console.error('Auto-save error:', error)
      if (onStatusChange) {
        onStatusChange({ saved: false, error: error.message, timestamp: new Date() })
      }
    }
  }

  // Save immediately
  save()

  // Set up interval
  intervalId = setInterval(save, AUTO_SAVE_INTERVAL)

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  }
}

/**
 * Check if there's a saved draft for a lesson
 */
export function hasDraft(lessonId, projectId) {
  try {
    const key = getStorageKey(lessonId, projectId);
    return localStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Prompt user to recover draft
 */
export function promptRecoverDraft(lessonId, projectId, onRecover) {
  const draft = recoverDraft(lessonId, projectId);
  if (draft) {
    const savedAt = new Date(draft.savedAt);
    const shouldRecover = confirm(
      `Found a draft saved on ${savedAt.toLocaleString()}. Would you like to recover it?`
    );
    if (shouldRecover) {
      onRecover(draft);
      return true;
    }
  }
  return false;
}

export default {
  saveDraftToLocalStorage,
  recoverDraft,
  clearDraft,
  enableAutoSave,
  hasDraft,
  promptRecoverDraft
}
