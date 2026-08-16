import { useEffect, useState } from 'react'
import { getAvatarSignedUrl } from '@nidus/shared/services/userAvatarService'
import ZoomableImage from './ZoomableImage'

/**
 * Header/profile avatar badge (v894). Renders the user's uploaded picture via a
 * signed URL (the storage bucket is private, account-scoped read) or falls back
 * to the existing initials gradient circle when no picture is set — same markup
 * as the pre-v894 initials-only badge, so users without a picture see no change.
 */
export default function UserAvatarBadge({ db, avatarPath, initials, sizeClassName = 'w-7 h-7 sm:w-8 sm:h-8', zoomable = false }) {
  const [signedUrl, setSignedUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    setSignedUrl(null)
    if (!db || !avatarPath) return undefined
    getAvatarSignedUrl(db, avatarPath).then((result) => {
      if (!cancelled && result.success) setSignedUrl(result.data)
    })
    return () => { cancelled = true }
  }, [db, avatarPath])

  if (signedUrl) {
    const imgClassName = `${sizeClassName} rounded-full object-cover shadow-md`
    if (zoomable) {
      return (
        <ZoomableImage
          src={signedUrl}
          alt="Your profile picture"
          imgClassName={imgClassName}
          hoverPreviewClassName="h-48 w-48 rounded-full object-cover"
        />
      )
    }
    return (
      <img
        src={signedUrl}
        alt="Your profile picture"
        className={imgClassName}
      />
    )
  }

  return (
    <div className={`${sizeClassName} rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md`}>
      <span className="text-white text-xs sm:text-sm font-medium">{initials}</span>
    </div>
  )
}
