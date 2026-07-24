/**
 * LogoUpload
 * A single image upload slot with preview, upload progress,
 * delete button, and file type/size validation.
 */
import { useState, useRef } from 'react'
import { Upload, Trash2, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadBrandingAsset, deleteBrandingAsset } from '../../services/brandingService'

export default function LogoUpload({
  label,
  description,
  recommendedSize,
  assetType,
  currentUrl,
  accountId,
  maxSizeMB = 2,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
  onUploaded,   // (publicUrl) => void
  onDeleted,    // () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(false)
  const fileRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB} MB`)
      return
    }

    setError(null)
    setSuccess(false)
    setUploading(true)
    try {
      const url = await uploadBrandingAsset(file, accountId, assetType)
      setSuccess(true)
      onUploaded?.(url)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!currentUrl) return
    if (!window.confirm(`Remove the ${label}?`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteBrandingAsset(accountId, assetType)
      onDeleted?.()
    } catch (err) {
      setError(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
          {recommendedSize && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
              Recommended: {recommendedSize}
            </p>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex items-center gap-4">
        <div
          className="w-24 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden flex-shrink-0"
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={label}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <Image className="h-6 w-6 text-gray-400" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`upload-${assetType}`}
          />
          <label
            htmlFor={`upload-${assetType}`}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors
              ${uploading
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</>
            ) : success ? (
              <><CheckCircle className="h-3.5 w-3.5 text-green-300" />Uploaded!</>
            ) : (
              <><Upload className="h-3.5 w-3.5" />Upload</>
            )}
          </label>

          {currentUrl && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Removing…</>
              ) : (
                <><Trash2 className="h-3.5 w-3.5" />Remove</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
