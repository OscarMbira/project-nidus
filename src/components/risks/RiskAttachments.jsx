/**
 * Risk Attachments Component
 * File attachments for risks
 */

import { useState, useEffect } from 'react'
import { Paperclip, Download, Trash2, Upload, File, FileText, Image, FileSpreadsheet } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { getAttachmentsByRisk, uploadAttachment, deleteAttachment } from '../../services/riskAttachmentService'

export default function RiskAttachments({ riskId }) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [description, setDescription] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const getCurrentUserId = async () => {
      const { data: { user } } = await platformDb.auth.getUser()
      if (user) {
        const { data: userRecord } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('is_deleted', false)
          .single()
        setCurrentUserId(userRecord?.id)
      }
    }
    getCurrentUserId()
  }, [])

  useEffect(() => {
    if (riskId) {
      loadAttachments()
    }
  }, [riskId])

  const loadAttachments = async () => {
    try {
      setLoading(true)
      const result = await getAttachmentsByRisk(riskId)
      if (result.success) {
        setAttachments(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file')
      return
    }

    try {
      setUploading(true)
      const result = await uploadAttachment(riskId, selectedFile, description)
      if (result.success) {
        setSelectedFile(null)
        setDescription('')
        setShowUpload(false)
        loadAttachments()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error uploading attachment:', error)
      alert('Error uploading attachment: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const result = await deleteAttachment(attachmentId)
      if (result.success) {
        loadAttachments()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Error deleting attachment: ' + error.message)
    }
  }

  const getFileIcon = (fileType) => {
    if (!fileType) return File
    if (fileType.startsWith('image/')) return Image
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText
    if (fileType.includes('sheet') || fileType.includes('excel')) return FileSpreadsheet
    return File
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Attachments
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Supporting documents and files for this risk
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Upload className="h-4 w-4" />
          Upload File
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            {selectedFile && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
              placeholder="Brief description of the attachment..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={() => {
                setShowUpload(false)
                setSelectedFile(null)
                setDescription('')
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Paperclip className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No attachments yet</p>
          <button
            onClick={() => setShowUpload(true)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Upload first attachment
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type)
            const isOwner = currentUserId === attachment.uploaded_by

            return (
              <div
                key={attachment.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {attachment.file_name}
                    </p>
                    {attachment.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {attachment.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>Uploaded {formatDate(attachment.uploaded_at)}</span>
                      {attachment.uploaded_by_user && (
                        <>
                          <span>•</span>
                          <span>by {attachment.uploaded_by_user.full_name || attachment.uploaded_by_user.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={attachment.file_path}
                    download={attachment.file_name}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="Download"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
