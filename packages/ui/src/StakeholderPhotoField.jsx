import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardPaste, Trash2, Upload } from 'lucide-react'
import { fileFromClipboardData, normalizeImageFile } from '@nidus/shared/utils/imageFileUtils'
import { withTimeout } from '@nidus/shared/utils/asyncUtils'
import { validateAvatarFile } from '@nidus/shared/services/userAvatarService'
import {
  linkedUserHasProfilePhoto,
  removeStakeholderPhoto,
  saveStakeholderPhoto,
  stakeholderPhotoControlsVisible,
  stakeholderPhotoLabel,
} from '@nidus/shared/services/stakeholderPhotoService'
import StakeholderAvatar from './StakeholderAvatar'

const UPLOAD_TIMEOUT_MS = 20000

/**
 * Optional photo or logo on the stakeholder form (v1147).
 * Existing records save immediately. New records hold the file until the form is saved.
 */
export default function StakeholderPhotoField({
  db,
  stakeholder = null,
  category = 'individual',
  accountId = null,
  readOnly = false,
  isPractice = false,
  pendingFile = null,
  onPendingFile,
}) {
  const [photoPath, setPhotoPath] = useState(stakeholder?.photo_path || null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [linkedHasAvatar, setLinkedHasAvatar] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const pasteBoxRef = useRef(null)
  const label = stakeholderPhotoLabel(category)
  const controlsVisible = !readOnly && stakeholderPhotoControlsVisible({
    isPractice,
    linkedUserHasAvatar: linkedHasAvatar,
  })

  useEffect(() => {
    setPhotoPath(stakeholder?.photo_path || null)
  }, [stakeholder?.photo_path, stakeholder?.id])

  useEffect(() => {
    if (isPractice || !db || !stakeholder?.user_id) {
      setLinkedHasAvatar(false)
      return undefined
    }
    let cancelled = false
    linkedUserHasProfilePhoto(db, stakeholder.user_id).then((result) => {
      if (!cancelled && result.success) setLinkedHasAvatar(result.data)
    })
    return () => { cancelled = true }
  }, [db, stakeholder?.user_id, isPractice, refreshNonce])

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(pendingFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  const applyFile = async (file) => {
    const normalized = normalizeImageFile(file, `${label.toLowerCase()}.png`)
    const validationError = validateAvatarFile(normalized)
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (!stakeholder?.id) {
      onPendingFile?.(normalized)
      setShowPasteHint(false)
      return
    }
    setBusy(true)
    try {
      const result = await withTimeout(
        saveStakeholderPhoto(db, {
          table: isPractice ? 'practice_stakeholder_register' : 'stakeholders',
          id: stakeholder.id,
          accountId: accountId || stakeholder.account_id,
          ownerUserId: stakeholder.user_id,
          file: normalized,
          previousPath: photoPath,
          isPractice,
        }),
        UPLOAD_TIMEOUT_MS,
        `Saving the ${label.toLowerCase()} timed out. Try again.`,
      )
      if (!result.success) {
        toast.error(result.message || `Failed to save ${label.toLowerCase()}`)
        return
      }
      setPhotoPath(result.data)
      setRefreshNonce((n) => n + 1)
      setShowPasteHint(false)
      toast.success(`${label} updated`)
    } catch (error) {
      toast.error(error?.message || `Failed to save ${label.toLowerCase()}`)
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!stakeholder?.id) {
      onPendingFile?.(null)
      setShowPasteHint(false)
      return
    }
    setBusy(true)
    try {
      const result = await withTimeout(
        removeStakeholderPhoto(db, {
          table: isPractice ? 'practice_stakeholder_register' : 'stakeholders',
          id: stakeholder.id,
          photoPath,
        }),
        UPLOAD_TIMEOUT_MS,
        `Removing the ${label.toLowerCase()} timed out. Check your connection and try again.`,
      )
      if (!result.success) {
        toast.error(result.message || `Failed to remove ${label.toLowerCase()}`)
        return
      }
      setPhotoPath(null)
      setRefreshNonce((n) => n + 1)
      toast.success(`${label} removed`)
    } catch (error) {
      toast.error(error?.message || `Failed to remove ${label.toLowerCase()}`)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!showPasteHint || !controlsVisible) return undefined
    const applyPaste = async (event) => {
      event.preventDefault()
      event.stopPropagation()
      const file = await fileFromClipboardData(event.clipboardData, label.toLowerCase())
      if (!file) {
        toast.error('Clipboard does not contain an image. Copy an image, then paste again.')
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
  }, [showPasteHint, controlsVisible])

  const shown = {
    ...(stakeholder || {}),
    stakeholder_name: stakeholder?.stakeholder_name,
    photo_path: photoPath,
    user_id: linkedHasAvatar ? stakeholder?.user_id : null,
  }

  return (
    <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</h3>
      <div className="flex flex-wrap items-center gap-4">
        <StakeholderAvatar
          db={db}
          stakeholder={shown}
          syncFromProfile={!isPractice && !previewUrl}
          sizeClassName="h-20 w-20"
          refreshNonce={refreshNonce}
          previewUrl={previewUrl}
        />
        {controlsVisible && (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload className="h-3.5 w-3.5" />
              {busy ? 'Saving…' : 'Upload'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
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
              className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste
            </button>
            {(photoPath || pendingFile) && (
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
        )}
        {!controlsVisible && linkedHasAvatar && !readOnly && (
          <p className="text-sm text-gray-700 dark:text-gray-200">
            This picture comes from their profile. Change it on My Profile.
          </p>
        )}
      </div>
      {showPasteHint && controlsVisible && (
        <div
          ref={pasteBoxRef}
          tabIndex={0}
          role="textbox"
          aria-label={`Paste ${label.toLowerCase()}`}
          className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          Copy an image, click this box, then press Ctrl+V (or Cmd+V).
        </div>
      )}
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">PNG, JPEG, GIF, or WEBP — up to 2MB. Optional.</p>
    </div>
  )
}
