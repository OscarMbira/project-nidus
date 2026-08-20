import { useEffect, useState } from 'react'
import { getAvatarSignedUrl, peekAvatarDisplayUrl } from '@nidus/shared/services/userAvatarService'
import ZoomableImage from './ZoomableImage'

/**
 * Header/profile avatar badge (v894). Renders the user's uploaded picture via a
 * signed URL (the storage bucket is private, account-scoped read) or falls back
 * to the existing initials gradient circle when no picture is set — same markup
 * as the pre-v894 initials-only badge, so users without a picture see no change.
 */
export default function UserAvatarBadge({
  db,
  avatarPath,
  initials,
  sizeClassName = 'w-7 h-7 sm:w-8 sm:h-8',
  zoomable = false,
  refreshNonce = 0,
}) {
  const [signedUrl, setSignedUrl] = useState(() => (avatarPath ? peekAvatarDisplayUrl(avatarPath) : null))

  useEffect(() => {
    let cancelled = false
    if (!db || !avatarPath) {
      setSignedUrl(null)
      return undefined
    }
    const cached = peekAvatarDisplayUrl(avatarPath)
    if (cached) setSignedUrl(cached)
    getAvatarSignedUrl(db, avatarPath).then((result) => {
      if (cancelled) return
      if (result.success) {
        setSignedUrl(result.data)
      } else {
        // Falls back to the initials circle either way (never a broken <img>), but a failed
        // signed-URL read for an avatar_url that IS set was previously indistinguishable from
        // "no picture uploaded" — surface it so this doesn't look like a silent no-op.
        console.warn('[UserAvatarBadge] Failed to load profile picture:', result.message)
      }
    })
    return () => { cancelled = true }
  }, [db, avatarPath, refreshNonce])

  if (signedUrl) {
    const imgClassName = `${sizeClassName} rounded-full object-cover shadow-md`
    if (zoomable) {
      return (
        <ZoomableImage
          src={signedUrl}
          alt="Your profile picture"
          imgClassName={imgClassName}
          hoverPreviewClassName="h-48 w-48 rounded-full object-cover"
          priority
        />
      )
    }
    return (
      <img
        src={signedUrl}
        alt="Your profile picture"
        className={imgClassName}
        decoding="async"
      />
    )
  }

  return (
    <div className={`${sizeClassName} rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md`}>
      <span className="text-white text-xs sm:text-sm font-medium">{initials}</span>
    </div>
  )
}
