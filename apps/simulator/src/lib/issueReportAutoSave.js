/**
 * Issue Report Auto-Save Utilities
 * Handles automatic saving of draft reports
 */

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const STORAGE_PREFIX = 'issue_report_draft_';

/**
 * Enable auto-save for a report form
 */
export function enableAutoSave(reportId, formData, onSave) {
  if (!reportId) {
    // Save to localStorage as draft for new reports
    return enableLocalStorageAutoSave(formData, onSave);
  }

  // Save to server for existing reports
  return enableServerAutoSave(reportId, formData, onSave);
}

/**
 * Auto-save to localStorage (for new reports)
 */
function enableLocalStorageAutoSave(formData, onSave) {
  const storageKey = `${STORAGE_PREFIX}new_${Date.now()}`;
  
  // Save initial state
  localStorage.setItem(storageKey, JSON.stringify({
    formData,
    timestamp: new Date().toISOString()
  }));

  const interval = setInterval(() => {
    try {
      const currentData = {
        formData,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(currentData));
      
      if (onSave) {
        onSave({ saved: true, local: true });
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }, AUTO_SAVE_INTERVAL);

  return () => {
    clearInterval(interval);
    // Optionally clean up localStorage after successful save
    // localStorage.removeItem(storageKey);
  };
}

/**
 * Auto-save to server (for existing reports)
 */
function enableServerAutoSave(reportId, formData, onSave) {
  let lastSavedData = JSON.stringify(formData);
  
  const interval = setInterval(async () => {
    try {
      const currentDataString = JSON.stringify(formData);
      
      // Only save if data has changed
      if (currentDataString !== lastSavedData) {
        const { updateIssueReport } = await import('../services/issueReportService');
        
        // Only update if status is still draft
        if (formData.report_status === 'draft') {
          await updateIssueReport(reportId, formData);
          lastSavedData = currentDataString;
          
          if (onSave) {
            onSave({ saved: true, timestamp: new Date().toISOString() });
          }
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      if (onSave) {
        onSave({ saved: false, error: error.message });
      }
    }
  }, AUTO_SAVE_INTERVAL);

  return () => clearInterval(interval);
}

/**
 * Recover draft from localStorage
 */
export function recoverDraft() {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
    
    if (keys.length === 0) return null;
    
    // Get most recent draft
    const latestKey = keys.sort().reverse()[0];
    const draftData = JSON.parse(localStorage.getItem(latestKey));
    
    return {
      formData: draftData.formData,
      timestamp: draftData.timestamp,
      storageKey: latestKey
    };
  } catch (error) {
    console.error('Error recovering draft:', error);
    return null;
  }
}

/**
 * Clear draft from localStorage
 */
export function clearDraft(storageKey = null) {
  try {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    } else {
      // Clear all drafts
      const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
      keys.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
}

/**
 * Get auto-save status indicator component data
 */
export function getAutoSaveStatus(saved, error, timestamp) {
  if (error) {
    return {
      status: 'error',
      message: 'Save failed',
      color: 'red'
    };
  }

  if (saved) {
    return {
      status: 'saved',
      message: timestamp ? `Saved ${formatTimeAgo(timestamp)}` : 'Saved',
      color: 'green'
    };
  }

  return {
    status: 'saving',
    message: 'Saving...',
    color: 'orange'
  };
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default {
  enableAutoSave,
  recoverDraft,
  clearDraft,
  getAutoSaveStatus
};
