import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardPaste, Trash2, Upload } from 'lucide-react'
import {
  getSavedSignature,
  saveSignatureImage,
  deleteSavedSignature,
  getSignatureSignedUrl,
  peekSignatureDisplayUrl,
  validateSignatureFile,
  USER_SIGNATURES_BUCKET,
} from '@nidus/shared/services/processTemplateSignatoryService'
import { normalizeImageFile, fileFromClipboardData } from '@nidus/shared/utils/imageFileUtils'
import ZoomableImage from './ZoomableImage'

/**
 * "Signature" section for the My Profile page (v894) — view/replace/remove the
 * saved signature that SignatureCaptureControl already reuses automatically
 * wherever a process-template document is signed (v868). This is the first
 * place a user can manage it without needing to go sign a document first.
 */
export default function ProfileSignatureSection({ db, accountId }) {
  const [saved, setSaved] = useState(null)
  const [signedUrl, setSignedUrl] = useState(null)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const pasteBoxRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getSavedSignature(db).then((result) => {
      if (cancelled) return
      if (result.success) setSaved(result.data)
    })
    return () => { cancelled = true }
  }, [db])

  useEffect(() => {
    let cancelled = false
    if (!saved?.storage_path) {
      setSignedUrl(null)
      return undefined
    }
    const bucket = saved.storage_bucket || USER_SIGNATURES_BUCKET
    const cached = peekSignatureDisplayUrl(saved.storage_path, bucket)
    if (cached) setSignedUrl(cached)
    getSignatureSignedUrl(db, saved.storage_path, 86400, bucket).then((result) => {
      if (!cancelled && result.success) setSignedUrl(result.data)
    })
    return () => { cancelled = true }
  }, [db, saved])

  const applyFile = async (file) => {
    const normalized = normalizeImageFile(file, 'signature.png')
    const validationError = validateSignatureFile(normalized)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setBusy(true)
    try {
      const result = await saveSignatureImage(db, normalized, accountId)
      if (!result.success) {
        toast.error(result.message || 'Failed to save signature')
        return
      }
      setSaved(result.data)
      setShowPasteHint(false)
      toast.success('Signature updated')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    try {
      const result = await deleteSavedSignature(db)
      if (!result.success) {
        toast.error(result.message || 'Failed to remove signature')
        return
      }
      setSaved(null)
      setSignedUrl(null)
      toast.success('Signature removed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!showPasteHint) return undefined
    const applyPaste = async (event) => {
      event.preventDefault()
      event.stopPropagation()
      const file = await fileFromClipboardData(event.clipboardData, 'signature')
      if (!file) {
        toast.error('Clipboard does not contain an image. Copy a signature image, then paste again.')
        return
      }
      applyFile(file)
    }
    document.addEventListener('paste', applyPaste, true)
    const focusTimer = window.setTimeout(() => pasteBoxRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('paste', applyPaste, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPasteHint])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Signature</h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Used automatically as your default when you sign a document elsewhere in the system.
      </p>
      {signedUrl ? (
        <div className="mb-3 flex justify-center overflow-visible rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
          <ZoomableImage
            src={signedUrl}
            alt="Your saved signature"
            imgClassName="max-h-24 max-w-full object-contain"
            hoverPreviewClassName="max-h-64 max-w-md object-contain"
            priority
          />
        </div>
      ) : (
        <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">No signature saved yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <Upload className="h-3.5 w-3.5" />
          {busy ? 'Saving…' : saved ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) applyFile(file)
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowPasteHint(true)}
          className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Paste
        </button>
        {saved && (
          <button
            type="button"
            disabled={busy}
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
      {showPasteHint && (
        <div
          ref={pasteBoxRef}
          tabIndex={0}
          role="textbox"
          aria-label="Paste signature image"
          className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Copy a signature image, click this box, then press Ctrl+V (or Cmd+V).
        </div>
      )}
      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">PNG, JPEG, GIF, SVG, or WEBP — up to 2MB.</p>
    </div>
  )
}
