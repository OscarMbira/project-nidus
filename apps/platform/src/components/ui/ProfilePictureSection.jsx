import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardPaste, Trash2, Upload } from 'lucide-react'
import { getUserAvatar, saveUserAvatar, removeUserAvatar, validateAvatarFile } from '@nidus/shared/services/userAvatarService'
import { normalizeImageFile, fileFromClipboardData } from '@nidus/shared/utils/imageFileUtils'
import UserAvatarBadge from './UserAvatarBadge'

/**
 * "Profile Picture" section for the My Profile page (v894). Saves immediately on
 * upload/paste/remove — independent of the page's own "Save Changes" button —
 * matching the existing saved-signature capture pattern already used elsewhere.
 */
export default function ProfilePictureSection({ db, accountId, initials }) {
  const [avatarPath, setAvatarPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const pasteBoxRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getUserAvatar(db).then((result) => {
      if (cancelled) return
      if (result.success) setAvatarPath(result.data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [db])

  const applyFile = async (file) => {
    const normalized = normalizeImageFile(file, 'profile-picture.png')
    const validationError = validateAvatarFile(normalized)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setBusy(true)
    try {
      const result = await saveUserAvatar(db, normalized, accountId)
      if (!result.success) {
        toast.error(result.message || 'Failed to save profile picture')
        return
      }
      setAvatarPath(result.data)
      setShowPasteHint(false)
      toast.success('Profile picture updated')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    try {
      const result = await removeUserAvatar(db)
      if (!result.success) {
        toast.error(result.message || 'Failed to remove profile picture')
        return
      }
      setAvatarPath(null)
      toast.success('Profile picture removed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!showPasteHint) return undefined
    const applyPaste = async (event) => {
      event.preventDefault()
      event.stopPropagation()
      const file = await fileFromClipboardData(event.clipboardData, 'profile-picture')
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
  }, [showPasteHint])

  if (loading) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">Loading profile picture…</p>
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Profile Picture</h3>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatarBadge db={db} avatarPath={avatarPath} initials={initials} sizeClassName="w-20 h-20" zoomable />
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
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
            className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste
          </button>
          {avatarPath && (
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
      </div>
      {showPasteHint && (
        <div
          ref={pasteBoxRef}
          tabIndex={0}
          role="textbox"
          aria-label="Paste profile picture"
          className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Copy an image, click this box, then press Ctrl+V (or Cmd+V).
        </div>
      )}
      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">PNG, JPEG, GIF, or WEBP — up to 2MB.</p>
    </div>
  )
}
