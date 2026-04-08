/**
 * Document Version History Component
 * 
 * Displays version history for a document with:
 * - List of all versions (newest first)
 * - Version number, upload date, uploaded by
 * - File size for each version
 * - Download any previous version
 * - Current/active version highlighted
 */

import { useState, useEffect, memo } from 'react';
import { X, Download, CheckCircle2, File, Clock } from 'lucide-react';
import { getDocumentVersions } from '../../../services/documentGovernanceService';
import { downloadProjectDocument, formatFileSize } from '../../../services/documentStorageService';
import toast from 'react-hot-toast';

const DocumentVersionHistory = memo(function DocumentVersionHistory({
  document,
  onClose
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (document?.id) {
      loadVersions();
    }
  }, [document?.id]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocumentVersions(document.id);
      setVersions(data);
    } catch (err) {
      console.error('Error loading versions:', err);
      setError(err.message || 'Failed to load version history');
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (version) => {
    if (!version.file_path) {
      toast.error('No file available for this version');
      return;
    }

    try {
      const url = await downloadProjectDocument(version.file_path);
      const link = document.createElement('a');
      link.href = url;
      link.download = version.file_name || `document-v${version.version_number}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
      toast.success('Download started');
    } catch (err) {
      console.error('Error downloading version:', err);
      toast.error('Failed to download version');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Version History: {document?.title || document?.document_types?.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading versions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={loadVersions}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg border transition-colors
                    ${version.is_current
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {/* Version Number */}
                  <div className="flex-shrink-0">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-semibold
                      ${version.is_current
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }
                    `}>
                      v{version.version_number}
                    </div>
                  </div>

                  {/* Version Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {version.version_label || `Version ${version.version_number}`}
                      </h4>
                      {version.is_current && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(version.upload_date).toLocaleDateString()} {new Date(version.upload_date).toLocaleTimeString()}
                      </span>
                      {version.uploaded_by_user && (
                        <span>by {version.uploaded_by_user.full_name}</span>
                      )}
                      {version.file_size && (
                        <span>{formatFileSize(version.file_size)}</span>
                      )}
                    </div>
                    {version.change_summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {version.change_summary}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    {version.file_path && (
                      <button
                        onClick={() => handleDownload(version)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Download this version"
                      >
                        <Download className="h-5 w-5 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

export default DocumentVersionHistory;
