/**
 * Document Status Management Modal
 * 
 * Allows PMO to update document status with:
 * - Status update form
 * - Comments field
 * - Status transition validation
 * - Audit trail display
 * - Option to upload new version
 */

import { useState, memo } from 'react';
import { X, Upload, Save } from 'lucide-react';
import { 
  updateProjectDocument,
  submitDocumentForApproval,
  approveDocument,
  rejectDocument,
  DOCUMENT_STATUS
} from '../../../services/documentGovernanceService';
import FileUploadDropzone from './FileUploadDropzone';
import { uploadProjectDocument } from '../../../services/documentStorageService';
import { createDocumentVersion } from '../../../services/documentGovernanceService';
import toast from 'react-hot-toast';

const DocumentStatusModal = memo(function DocumentStatusModal({
  document,
  onClose,
  onUpdate
}) {
  const [status, setStatus] = useState(document?.status || DOCUMENT_STATUS.NOT_STARTED);
  const [comments, setComments] = useState('');
  const [approverId, setApproverId] = useState(document?.approver_user_id || '');
  const [uploadingNewVersion, setUploadingNewVersion] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Handle status-specific actions
      if (status === DOCUMENT_STATUS.SUBMITTED && document.status !== DOCUMENT_STATUS.SUBMITTED) {
        if (!approverId) {
          toast.error('Please select an approver');
          return;
        }
        await submitDocumentForApproval(document.id, approverId, comments);
      } else if (status === DOCUMENT_STATUS.APPROVED && document.status !== DOCUMENT_STATUS.APPROVED) {
        if (!approverId) {
          toast.error('Please select an approver');
          return;
        }
        await approveDocument(document.id, approverId, comments);
      } else if (status === DOCUMENT_STATUS.REJECTED && document.status !== DOCUMENT_STATUS.REJECTED) {
        if (!approverId) {
          toast.error('Please select an approver');
          return;
        }
        if (!comments) {
          toast.error('Please provide a rejection reason');
          return;
        }
        await rejectDocument(document.id, approverId, comments);
      } else {
        // General status update
        await updateProjectDocument(document.id, {
          status,
          comments,
          approver_user_id: approverId || null
        });
      }

      // Upload new version if file selected
      if (selectedFile && uploadingNewVersion) {
        const currentVersion = document.current_version || 1;
        const newVersion = currentVersion + 1;
        
        const uploadResult = await uploadProjectDocument(
          selectedFile,
          document.project_id,
          document.document_type_id,
          newVersion
        );

        await createDocumentVersion(document.id, {
          version_number: newVersion,
          file_path: uploadResult.path,
          file_name: uploadResult.filename,
          file_size: uploadResult.size,
          file_type: uploadResult.mimeType,
          file_extension: uploadResult.extension,
          uploaded_by: document.owner_user_id,
          change_summary: comments || 'New version uploaded'
        });

        // Update document with new version info
        await updateProjectDocument(document.id, {
          file_path: uploadResult.path,
          file_name: uploadResult.filename,
          file_size: uploadResult.size,
          file_type: uploadResult.mimeType,
          file_extension: uploadResult.extension,
          current_version: newVersion
        });
      }

      toast.success('Document updated successfully');
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (err) {
      console.error('Error updating document:', err);
      toast.error(err.message || 'Failed to update document');
    } finally {
      setSaving(false);
    }
  };

  const canTransitionTo = (newStatus) => {
    const current = document.status;
    
    // Allow same status
    if (current === newStatus) return true;
    
    // Allow transitions
    const allowedTransitions = {
      [DOCUMENT_STATUS.NOT_STARTED]: [DOCUMENT_STATUS.DRAFT],
      [DOCUMENT_STATUS.DRAFT]: [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.NOT_STARTED],
      [DOCUMENT_STATUS.SUBMITTED]: [DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.REJECTED, DOCUMENT_STATUS.DRAFT],
      [DOCUMENT_STATUS.REJECTED]: [DOCUMENT_STATUS.DRAFT],
      [DOCUMENT_STATUS.APPROVED]: [] // Approved is final
    };

    return allowedTransitions[current]?.includes(newStatus) || false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Update Document Status
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document
            </h3>
            <p className="text-lg text-gray-900 dark:text-white">
              {document?.title || document?.document_types?.name}
            </p>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Object.values(DOCUMENT_STATUS).map(s => (
                <option key={s} value={s} disabled={!canTransitionTo(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                  {!canTransitionTo(s) && s !== document.status ? ' (Invalid transition)' : ''}
                </option>
              ))}
            </select>
            {!canTransitionTo(status) && status !== document.status && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Invalid status transition. Current status: {document.status}
              </p>
            )}
          </div>

          {/* Approver (for submitted/approved/rejected) */}
          {(status === DOCUMENT_STATUS.SUBMITTED || 
            status === DOCUMENT_STATUS.APPROVED || 
            status === DOCUMENT_STATUS.REJECTED) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Approver User ID
              </label>
              <input
                type="text"
                value={approverId}
                onChange={(e) => setApproverId(e.target.value)}
                placeholder="Enter approver user UUID"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comments {status === DOCUMENT_STATUS.REJECTED && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              placeholder={status === DOCUMENT_STATUS.REJECTED ? 'Rejection reason (required)' : 'Add comments...'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required={status === DOCUMENT_STATUS.REJECTED}
            />
          </div>

          {/* Upload New Version */}
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={uploadingNewVersion}
                onChange={(e) => setUploadingNewVersion(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload New Version
              </span>
            </label>
            {uploadingNewVersion && (
              <FileUploadDropzone
                onFilesSelected={(files) => setSelectedFile(files[0])}
                maxFiles={1}
                className="mt-2"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canTransitionTo(status)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default DocumentStatusModal;
