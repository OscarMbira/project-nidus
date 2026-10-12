import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardPaste, PenLine, Upload } from 'lucide-react'
import { getSavedSignature, saveSignatureImage, validateSignatureFile, peekSignatureDisplayUrl, USER_SIGNATURES_BUCKET } from '@nidus/shared/services/processTemplateSignatoryService'

function guessImageMime(file) {
  if (file?.type && String(file.type).startsWith('image/')) return file.type
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.svg') || name.endsWith('.svg+xml')) return 'image/svg+xml'
  return 'image/png'
}

export function normalizeSignatureFile(file, fallbackName = 'pasted-signature.png') {
  if (!file) return null
  const type = guessImageMime(file)
  const name = file.name && !/^image\.(png|jpe?g|gif|webp)$/i.test(file.name)
    ? file.name
    : fallbackName
  if (file.type === type && file.name === name) return file
  return new File([file], name, { type })
}

async function fileFromSavedSignatureRow(db, row) {
  if (!row?.storage_path) return null
  const bucket = row.storage_bucket || USER_SIGNATURES_BUCKET
  const peeked = peekSignatureDisplayUrl(row.storage_path, bucket)
  if (peeked && typeof fetch === 'function') {
    try {
      const response = await fetch(peeked)
      if (response.ok) {
        const blob = await response.blob()
        return new File([blob], row.file_name || 'signature.png', { type: row.mime_type || blob.type || 'image/png' })
      }
    } catch {
      // Fall through to a storage download.
    }
  }
  if (!db?.storage?.from) return null
  const { data, error } = await db.storage.from(bucket).download(row.storage_path)
  if (error || !data) return null
  return new File([data], row.file_name || 'signature.png', { type: row.mime_type || 'image/png' })
}

export function fileFromDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const mime = match[1]
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1] || 'png'
  return new File([bytes], `pasted-signature.${ext}`, { type: mime })
}

function isLikelyImageItem(item) {
  if (!item || item.kind !== 'file') return false
  const type = String(item.type || '')
  return type.startsWith('image/') || type === ''
}

/**
 * Convert a paste event's clipboardData into an image File, or null.
 * Handles Windows/Chrome quirks: empty MIME types, HTML <img> data URLs, files list.
 */
export async function fileFromClipboardData(clipboardData) {
  if (!clipboardData) return null

  const items = clipboardData.items
  if (items) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      if (!isLikelyImageItem(item)) continue
      const file = item.getAsFile?.()
      if (file) return normalizeSignatureFile(file)
    }
  }

  const files = clipboardData.files
  if (files) {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      if (!file) continue
      const type = String(file.type || '')
      if (type.startsWith('image/') || type === '') return normalizeSignatureFile(file)
    }
  }

  const html = typeof clipboardData.getData === 'function' ? clipboardData.getData('text/html') : ''
  const srcMatch = String(html).match(/<img[^>]+src=["']([^"']+)["']/i)
  if (srcMatch?.[1]?.startsWith('data:image/')) {
    return fileFromDataUrl(srcMatch[1])
  }
  if (srcMatch?.[1]?.startsWith('blob:')) {
    try {
      const blob = await fetch(srcMatch[1]).then((r) => r.blob())
      if (blob && String(blob.type || '').startsWith('image/')) {
        return normalizeSignatureFile(new File([blob], 'pasted-signature.png', { type: blob.type }))
      }
    } catch {
      return null
    }
  }

  const plain = typeof clipboardData.getData === 'function' ? clipboardData.getData('text/plain') : ''
  if (String(plain).startsWith('data:image/')) return fileFromDataUrl(plain)

  return null
}

/**
 * "Sign with my saved signature" one-click + upload / paste image fallback,
 * used inline on a signatory's own slot when it's their turn (v868). Saving a fresh
 * image also updates the user's saved signature for next time (decision 16).
 */
export default function SignatureCaptureControl({ db, accountId, onSign, busy = false }) {
  const [saved, setSaved] = useState(null)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const pasteBoxRef = useRef(null)
  const previewUrlRef = useRef(null)
  const savedFileRef = useRef(null)
  const savedFileInflightRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getSavedSignature(db).then((result) => {
      if (cancelled) return
      if (result.success) setSaved(result.data)
      setLoadingSaved(false)
      const row = result.success ? result.data : null
      if (!row?.storage_path) return
      savedFileInflightRef.current = fileFromSavedSignatureRow(db, row).then((file) => {
        if (!cancelled && file) savedFileRef.current = file
        return file
      })
    })
    return () => { cancelled = true }
  }, [db])

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreview(null)
  }

  const showPreview = (file) => {
    const normalized = normalizeSignatureFile(file)
    const validationError = validateSignatureFile(normalized)
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(normalized)
    previewUrlRef.current = url
    setPreview({ file: normalized, url })
  }

  const handleFileSelected = async (file) => {
    if (!file) return
    const normalized = normalizeSignatureFile(file)
    const validationError = validateSignatureFile(normalized)
    if (validationError) {
      toast.error(validationError)
      setActionError(validationError)
      return
    }
    setActionError('')
    setSubmitting(true)
    try {
      // Sign the slot first. Saving a reusable copy must not block (or swallow) that action.
      const signed = await onSign(normalized)
      if (signed === false) {
        setActionError('Signing failed. Try again, or upload the image as a file.')
        return
      }
      if (accountId) {
        saveSignatureImage(db, normalized, accountId).then((saveResult) => {
          if (saveResult.success) setSaved(saveResult.data)
        })
      }
      setShowUpload(false)
      setShowPasteHint(false)
      clearPreview()
    } catch (err) {
      const message = err?.message || 'Failed to apply signature'
      toast.error(message)
      setActionError(message)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  useEffect(() => {
    if (!showPasteHint) return undefined

    const applyPaste = async (event) => {
      event.preventDefault()
      event.stopPropagation()
      const file = await fileFromClipboardData(event.clipboardData)
      if (!file) {
        toast.error('Clipboard does not contain an image. Copy a signature image (not a file path), then paste again.')
        return
      }
      showPreview(file)
    }

    document.addEventListener('paste', applyPaste, true)
    const focusTimer = window.setTimeout(() => pasteBoxRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('paste', applyPaste, true)
    }
  }, [showPasteHint])

  if (loadingSaved) {
    return <p className="text-xs text-gray-600 dark:text-gray-300">Checking for a saved signature…</p>
  }

  const handleSignSaved = async () => {
    setActionError('')
    setSubmitting(true)
    try {
      let file = savedFileRef.current
      if (!file && savedFileInflightRef.current) {
        file = await savedFileInflightRef.current
      }
      const signed = await onSign(file || null)
      if (signed === false) {
        setActionError('Signing failed. Try again, or upload the image as a file.')
      }
    } catch (err) {
      const message = err?.message || 'Failed to apply signature'
      toast.error(message)
      setActionError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const capturing = !saved || showUpload
  const actionBusy = busy || submitting

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {saved && !showUpload && (
          <button
            type="button"
            disabled={actionBusy}
            onClick={handleSignSaved}
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <PenLine className="h-3.5 w-3.5" />
            {actionBusy ? 'Signing…' : 'Sign with my saved signature'}
          </button>
        )}
        {capturing && (
          <>
            <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 ${actionBusy ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload className="h-3.5 w-3.5" />
              {actionBusy ? 'Signing…' : 'Upload signature image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={actionBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) handleFileSelected(file)
                }}
              />
            </label>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                clearPreview()
                setShowPasteHint(true)
              }}
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste signature
            </button>
          </>
        )}
        {saved && !showUpload && (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => setShowUpload(true)}
            className="text-xs text-gray-600 underline hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
          >
            use a different image
          </button>
        )}
        {saved && showUpload && (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => {
              setShowUpload(false)
              setShowPasteHint(false)
              clearPreview()
            }}
            className="text-xs text-gray-600 underline hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
          >
            cancel
          </button>
        )}
      </div>
      {capturing && showPasteHint && !preview && (
        <div
          ref={pasteBoxRef}
          tabIndex={0}
          role="textbox"
          aria-label="Paste signature image"
          className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Copy a signature image, click this box, then press Ctrl+V (or Cmd+V).
        </div>
      )}
      {capturing && preview && (
        <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-100">Pasted signature preview</p>
          <div className="flex justify-center rounded border border-gray-200 bg-white p-2 dark:border-gray-600">
            <img
              src={preview.url}
              alt="Pasted signature preview"
              className="max-h-28 max-w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => handleFileSelected(preview.file)}
              className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {actionBusy ? 'Signing…' : 'Use this signature'}
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={clearPreview}
              className="text-xs text-gray-700 underline hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100"
            >
              Paste again
            </button>
          </div>
          {actionError && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">{actionError}</p>
          )}
        </div>
      )}
    </div>
  )
}
