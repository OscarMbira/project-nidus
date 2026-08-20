import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Paperclip, Camera, X, Download, ZoomIn, ZoomOut, RotateCw, FileText, History, Trash2, RefreshCw } from 'lucide-react'
import { getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import {
  deleteDocumentAttachment,
  formatFileSizeLabel,
  getAttachmentSignedUrl,
  isImageMimeType,
  listAttachmentVersionHistory,
  listDocumentAttachments,
  replaceDocumentAttachment,
  restoreAttachmentVersion,
  updateAttachmentCaption,
  uploadDocumentAttachment,
  validateAttachmentFile,
  DEFAULT_MAX_FILES,
} from '@nidus/shared/services/processTemplateAttachmentService'

/** Full-size preview modal for one attachment version — same pattern as AttachmentField.jsx's (v863). */
function AttachmentPreviewModal({ attachment, db, onClose }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const isImage = isImageMimeType(attachment?.mime_type)
  const isPdf = attachment?.mime_type === 'application/pdf'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttachmentSignedUrl(db, attachment.storage_path).then((result) => {
      if (cancelled) return
      if (result.success) setUrl(result.data)
      else toast.error(result.message || 'Failed to load preview')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [attachment.storage_path, db])

  const handleDownload = () => {
    if (!url) return
    const link = window.document.createElement('a')
    link.href = url
    link.download = attachment.file_name || 'attachment'
    link.style.display = 'none'
    window.document.body.appendChild(link)
    link.click()
    setTimeout(() => window.document.body.removeChild(link), 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="m-4 flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {attachment.file_name} <span className="text-gray-500 dark:text-gray-400">· v{attachment.version_number}{attachment.is_current ? ' (current)' : ''}</span>
          </h2>
          <div className="flex items-center gap-1">
            {isImage && (
              <>
                <button type="button" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700" title="Zoom in">
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                </button>
                <button type="button" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700" title="Zoom out">
                  <ZoomOut className="h-4 w-4 text-gray-500" />
                </button>
                <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700" title="Rotate">
                  <RotateCw className="h-4 w-4 text-gray-500" />
                </button>
              </>
            )}
            <button type="button" onClick={handleDownload} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700" title="Download">
              <Download className="h-4 w-4 text-gray-500" />
            </button>
            <button type="button" onClick={onClose} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700" title="Close">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : !url ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Preview unavailable
            </div>
          ) : isImage ? (
            <div className="flex h-full items-center justify-center overflow-auto">
              <img
                src={url}
                alt={attachment.caption || attachment.file_name}
                className="max-h-full max-w-full object-contain"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}
              />
            </div>
          ) : isPdf ? (
            <iframe src={url} title={attachment.file_name} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12" />
              <p>Preview not available for this file type.</p>
              <button type="button" onClick={handleDownload} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VersionHistoryDropdown({ attachment, db, onRestore, onPreview, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listAttachmentVersionHistory(db, attachment.attachment_group_id).then((result) => {
      if (cancelled) return
      if (result.success) setHistory(result.data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [attachment.attachment_group_id, db])

  return (
    <div className="absolute z-20 mt-1 w-64 rounded border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Version history</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <p className="px-1 py-2 text-xs text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {history.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <button type="button" onClick={() => onPreview(v)} className="flex-1 truncate text-left text-gray-700 dark:text-gray-200">
                v{v.version_number}{v.is_current ? ' (current)' : ''} · {new Date(v.uploaded_at).toLocaleDateString()}
              </button>
              {!v.is_current && (
                <button
                  type="button"
                  onClick={() => onRestore(v.version_number)}
                  className="shrink-0 text-blue-500 hover:text-blue-400"
                  title="Restore this version"
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AttachmentThumbnail({ attachment, db, disabled, onOpenPreview, onReplace, onDelete }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [captionValue, setCaptionValue] = useState(attachment.caption || '')
  const isImage = isImageMimeType(attachment.mime_type)

  useEffect(() => {
    if (!isImage) return
    let cancelled = false
    getAttachmentSignedUrl(db, attachment.storage_path).then((result) => {
      if (!cancelled && result.success) setThumbUrl(result.data)
    })
    return () => { cancelled = true }
  }, [attachment.storage_path, db, isImage])

  return (
    <div className="relative flex w-40 flex-col gap-1 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => onOpenPreview(attachment)}
        className="flex h-24 w-full items-center justify-center overflow-hidden rounded bg-gray-100 dark:bg-gray-800"
        title="Preview"
      >
        {isImage && thumbUrl ? (
          <img src={thumbUrl} alt={attachment.caption || attachment.file_name} className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-8 w-8 text-gray-400" />
        )}
      </button>
      <p className="truncate text-[11px] text-gray-600 dark:text-gray-300" title={attachment.file_name}>
        {attachment.file_name}
      </p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        {attachment.display_id || 'v' + attachment.version_number} · {formatFileSizeLabel(attachment.file_size)}
      </p>
      {disabled ? (
        attachment.caption ? (
          <p className="text-[11px] italic text-gray-500 dark:text-gray-400 truncate" title={attachment.caption}>{attachment.caption}</p>
        ) : null
      ) : (
        <input
          type="text"
          value={captionValue}
          onChange={(e) => setCaptionValue(e.target.value)}
          onBlur={() => {
            if (captionValue !== (attachment.caption || '')) {
              updateAttachmentCaption(db, { attachmentGroupId: attachment.attachment_group_id, caption: captionValue }).then((result) => {
                if (!result.success) toast.error(result.message || 'Failed to save caption')
              })
            }
          }}
          placeholder="Caption (optional)"
          className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Version history"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          {historyOpen && (
            <VersionHistoryDropdown
              attachment={attachment}
              db={db}
              onClose={() => setHistoryOpen(false)}
              onPreview={(v) => { setHistoryOpen(false); onOpenPreview(v) }}
              onRestore={(versionNumber) => { setHistoryOpen(false); onReplace(null, { restoreVersionNumber: versionNumber }) }}
            />
          )}
        </div>
        {!disabled && (
          <div className="flex items-center gap-2">
            <label className="cursor-pointer text-gray-400 hover:text-blue-500" title="Replace">
              <RefreshCw className="h-3.5 w-3.5" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) onReplace(file)
                }}
              />
            </label>
            <button type="button" onClick={onDelete} className="text-gray-400 hover:text-red-500" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Document-level Attachments panel for process_templates documents (v867). Unlike
 * AttachmentField.jsx (v863, field-level), this has no `field.accept`/`maxFiles`
 * config and no field_key — one gallery per document, keyed by templateNodeId.
 */
export default function DocumentAttachmentsPanel({ db, templateNodeId, disabled = false, mode = 'platform' }) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewTarget, setPreviewTarget] = useState(null)
  const [error, setError] = useState(null)
  const userIdRef = useRef(null)

  const maxFiles = DEFAULT_MAX_FILES

  const refresh = useCallback(async () => {
    if (!db || !templateNodeId) return
    setLoading(true)
    const result = await listDocumentAttachments(db, templateNodeId)
    if (result.success) setAttachments(result.data)
    setLoading(false)
  }, [db, templateNodeId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    getCurrentUserInternalUserId().then((id) => { userIdRef.current = id })
  }, [])

  const handleUpload = useCallback(async (file) => {
    if (!db || !templateNodeId) return
    const validationError = validateAttachmentFile(file, { maxFiles, currentCount: attachments.length })
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }
    setError(null)
    setUploading(true)
    const result = await uploadDocumentAttachment(db, {
      templateNodeId, file, uploadedByUserId: userIdRef.current, mode,
    })
    setUploading(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to upload attachment')
      return
    }
    setAttachments((prev) => [...prev, result.data])
    toast.success(`Attached ${result.data.display_id || result.data.file_name}`)
  }, [db, templateNodeId, maxFiles, attachments, mode])

  const handleUploadMany = useCallback(async (files) => {
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop -- sequential so validation counts stay accurate
      await handleUpload(file)
    }
  }, [handleUpload])

  const handleReplace = useCallback(async (attachmentGroupId, file, { restoreVersionNumber } = {}) => {
    setUploading(true)
    const result = restoreVersionNumber
      ? await restoreAttachmentVersion(db, { attachmentGroupId, versionNumber: restoreVersionNumber, uploadedByUserId: userIdRef.current })
      : await replaceDocumentAttachment(db, { attachmentGroupId, file, uploadedByUserId: userIdRef.current, mode })
    setUploading(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to update attachment')
      return
    }
    setAttachments((prev) => prev.map((a) => (a.attachment_group_id === attachmentGroupId ? result.data : a)))
    toast.success(restoreVersionNumber ? 'Version restored' : 'Attachment replaced')
  }, [db, mode])

  const handleDelete = useCallback(async (attachmentGroupId) => {
    if (!window.confirm('Delete this attachment (all versions)?')) return
    const result = await deleteDocumentAttachment(db, { attachmentGroupId, deletedByUserId: userIdRef.current })
    if (!result.success) {
      toast.error(result.message || 'Failed to delete attachment')
      return
    }
    setAttachments((prev) => prev.filter((a) => a.attachment_group_id !== attachmentGroupId))
    toast.success('Attachment deleted')
  }, [db])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length) handleUploadMany(files)
  }, [disabled, handleUploadMany])

  const handlePaste = useCallback((e) => {
    if (disabled) return
    const items = Array.from(e.clipboardData?.items || [])
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean)
    if (files.length) {
      e.preventDefault()
      handleUploadMany(files)
    }
  }, [disabled, handleUploadMany])

  if (!templateNodeId) return null

  const atMax = attachments.length >= maxFiles

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Attachments</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Attach supporting images or files to this document — e.g. a process-flow diagram for clarity.
        </p>
      </div>

      <div
        onPaste={handlePaste}
        tabIndex={disabled ? undefined : 0}
        className="space-y-2 rounded border border-dashed border-gray-300 p-3 outline-none focus:border-blue-400 dark:border-gray-700 dark:focus:border-blue-500"
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <AttachmentThumbnail
                key={attachment.attachment_group_id}
                attachment={attachment}
                db={db}
                disabled={disabled}
                onOpenPreview={setPreviewTarget}
                onReplace={(file, opts) => handleReplace(attachment.attachment_group_id, file, opts)}
                onDelete={() => handleDelete(attachment.attachment_group_id)}
              />
            ))}
          </div>
        )}

        {!disabled && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-wrap items-center gap-3 rounded p-2 text-xs transition-colors ${
              dragOver ? 'bg-blue-50 dark:bg-blue-950/30' : ''
            }`}
          >
            <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${atMax || uploading ? 'pointer-events-none opacity-50' : ''}`}>
              <Paperclip className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Add file'}
              <input
                type="file"
                multiple
                className="hidden"
                disabled={atMax || uploading}
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  e.target.value = ''
                  if (files.length) handleUploadMany(files)
                }}
              />
            </label>
            <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${atMax || uploading ? 'pointer-events-none opacity-50' : ''}`}>
              <Camera className="h-3.5 w-3.5" />
              Camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={atMax || uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) handleUpload(file)
                }}
              />
            </label>
            <span className="text-gray-400 dark:text-gray-500">
              or drag & drop, or paste (Ctrl+V) here · {attachments.length}/{maxFiles}
            </span>
          </div>
        )}

        {loading && <p className="text-xs text-gray-400 dark:text-gray-500">Loading attachments…</p>}
        {!loading && attachments.length === 0 && disabled && (
          <p className="text-xs text-gray-400 dark:text-gray-500">No attachments.</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {previewTarget && (
        <AttachmentPreviewModal attachment={previewTarget} db={db} onClose={() => setPreviewTarget(null)} />
      )}
    </div>
  )
}
