/**
 * ChangeLogAttachments
 * Displays and manages document + screenshot attachments for a single change log entry.
 * Used inside the View and Edit modals of ChangeLog.jsx.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Paperclip, Image, FileText, File, Download, Trash2,
  Upload, Camera, X, Eye, AlertTriangle, Loader2,
} from 'lucide-react'
import {
  fetchAttachments, uploadAttachment, deleteAttachment, getDownloadUrl,
} from '../../services/changeLogService'

const ACCEPTED_DOCS        = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip'
const ACCEPTED_SCREENSHOTS = '.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg'
const ACCEPTED_ALL         = ACCEPTED_DOCS + ',' + ACCEPTED_SCREENSHOTS

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024)       return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function FileIcon({ mimeType, className = 'h-5 w-5' }) {
  if (!mimeType) return <File className={className} />
  if (mimeType.startsWith('image/')) return <Image className={`${className} text-purple-500`} />
  if (mimeType.includes('pdf'))      return <FileText className={`${className} text-red-500`} />
  if (mimeType.includes('word') || mimeType.includes('document'))
                                     return <FileText className={`${className} text-blue-500`} />
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
                                     return <FileText className={`${className} text-green-500`} />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
                                     return <FileText className={`${className} text-orange-500`} />
  return <File className={`${className} text-gray-500`} />
}

// Inline screenshot preview modal
function PreviewModal({ attachment, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="rounded-lg max-w-full max-h-[85vh] object-contain"
        />
        <p className="text-white text-sm text-center mt-2 opacity-75">{attachment.file_name}</p>
      </div>
    </div>
  )
}

export default function ChangeLogAttachments({ logEntryId, readOnly = false }) {
  const [attachments, setAttachments]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [preview, setPreview]           = useState(null)
  const [downloading, setDownloading]   = useState(null)

  const docInputRef  = useRef(null)
  const imgInputRef  = useRef(null)

  useEffect(() => {
    if (logEntryId) load()
  }, [logEntryId])

  const load = async () => {
    setLoading(true)
    const data = await fetchAttachments(logEntryId)
    setAttachments(data)
    setLoading(false)
  }

  const handleUpload = async (e, type) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadError(null)
    setUploading(true)

    for (const file of files) {
      const res = await uploadAttachment(logEntryId, file)
      if (!res.success) {
        setUploadError(res.message)
        break
      }
      setAttachments(prev => [res.data, ...prev])
    }

    // Reset inputs
    if (docInputRef.current)  docInputRef.current.value = ''
    if (imgInputRef.current)  imgInputRef.current.value = ''
    setUploading(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteAttachment(deleteTarget.id, deleteTarget.file_path)
    setDeleting(false)
    if (res.success) {
      setAttachments(prev => prev.filter(a => a.id !== deleteTarget.id))
    } else {
      setUploadError(res.message)
    }
    setDeleteTarget(null)
  }

  const handleDownload = async (att) => {
    setDownloading(att.id)
    const url = await getDownloadUrl(att.file_path)
    setDownloading(null)
    if (url) window.open(url, '_blank')
  }

  const docs        = attachments.filter(a => a.attachment_type === 'document')
  const screenshots = attachments.filter(a => a.attachment_type === 'screenshot')

  return (
    <div className="space-y-4">
      {/* Upload buttons */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            Attach Document
          </button>
          <button
            onClick={() => imgInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Add Screenshot
          </button>
          <input ref={docInputRef} type="file" accept={ACCEPTED_DOCS} multiple className="hidden" onChange={e => handleUpload(e, 'document')} />
          <input ref={imgInputRef} type="file" accept={ACCEPTED_SCREENSHOTS} multiple className="hidden" onChange={e => handleUpload(e, 'screenshot')} />
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          No attachments yet
        </p>
      ) : (
        <div className="space-y-4">
          {/* Documents */}
          {docs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Documents ({docs.length})
              </h4>
              <ul className="space-y-1">
                {docs.map(att => (
                  <AttachmentRow
                    key={att.id}
                    att={att}
                    readOnly={readOnly}
                    downloading={downloading === att.id}
                    onDownload={() => handleDownload(att)}
                    onDelete={() => setDeleteTarget(att)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" /> Screenshots ({screenshots.length})
              </h4>
              {/* Thumbnail grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {screenshots.map(att => (
                  <div key={att.id} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <img
                      src={att.file_url}
                      alt={att.file_name}
                      className="w-full h-24 object-cover cursor-pointer"
                      onClick={() => setPreview(att)}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setPreview(att)}
                        className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:bg-white"
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownload(att)}
                        disabled={downloading === att.id}
                        className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:bg-white"
                        title="Download"
                      >
                        {downloading === att.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Download className="h-3.5 w-3.5" />}
                      </button>
                      {!readOnly && (
                        <button
                          onClick={() => setDeleteTarget(att)}
                          className="p-1.5 rounded-full bg-white/90 text-red-500 hover:bg-white"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate px-1.5 py-0.5 bg-white dark:bg-gray-800">
                      {att.file_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Remove Attachment</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remove this file permanently?</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{deleteTarget.file_name}</p>
            {deleteTarget.file_size && (
              <p className="text-xs text-gray-400 mt-0.5">{formatSize(deleteTarget.file_size)}</p>
            )}
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors">
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot preview */}
      {preview && <PreviewModal attachment={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

// ─── single attachment row ────────────────────────────────────────────────────

function AttachmentRow({ att, readOnly, downloading, onDownload, onDelete }) {
  return (
    <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
      <div className="flex-shrink-0">
        <FileIcon mimeType={att.file_type} className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.file_name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatSize(att.file_size)}
          {att.uploaded_by_user?.full_name && ` · ${att.uploaded_by_user.full_name}`}
          {att.created_at && ` · ${new Date(att.created_at).toLocaleDateString()}`}
        </p>
        {att.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{att.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onDownload} disabled={downloading} title="Download"
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </button>
        {!readOnly && (
          <button onClick={onDelete} title="Remove"
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  )
}
