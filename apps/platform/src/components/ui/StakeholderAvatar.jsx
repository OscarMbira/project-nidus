import { useEffect, useState } from 'react'
import ZoomableImage from './ZoomableImage'
import {
  ensureStakeholderPhotoFromProfile,
  getStakeholderPhotoSignedUrl,
  peekStakeholderPhotoDisplayUrl,
  stakeholderInitials,
} from '@nidus/shared/services/stakeholderPhotoService'

/**
 * Circle picture for a stakeholder (v1147). Falls back to initials.
 * On Platform, a linked user with a profile picture and no stakeholder
 * picture is copied once so a later profile removal cannot blank the record.
 */
export default function StakeholderAvatar({
  db,
  stakeholder,
  syncFromProfile = true,
  sizeClassName = 'h-8 w-8',
  refreshNonce = 0,
  previewUrl = null,
}) {
  const recordId = stakeholder?.id || null
  const recordPhotoPath = stakeholder?.photo_path || null
  const recordUserId = stakeholder?.user_id || null
  const recordAccountId = stakeholder?.account_id || null
  const recordName = stakeholder?.stakeholder_name || ''
  const [path, setPath] = useState(recordPhotoPath)
  const [signedUrl, setSignedUrl] = useState(() => (
    recordPhotoPath ? peekStakeholderPhotoDisplayUrl(recordPhotoPath) : null
  ))
  const initials = stakeholderInitials(recordName)
  const alt = recordName ? `${recordName} picture` : 'Stakeholder picture'

  useEffect(() => {
    setPath(recordPhotoPath)
    if (!syncFromProfile || !db || !recordId || recordPhotoPath || !recordUserId || !recordAccountId) return undefined
    let cancelled = false
    ensureStakeholderPhotoFromProfile(db, {
      id: recordId,
      user_id: recordUserId,
      account_id: recordAccountId,
      photo_path: null,
      stakeholder_name: recordName,
    }).then((result) => {
      if (!cancelled && result.success && result.data) setPath(result.data)
    })
    return () => { cancelled = true }
  }, [db, recordId, recordPhotoPath, recordUserId, recordAccountId, recordName, syncFromProfile, refreshNonce])

  useEffect(() => {
    let cancelled = false
    if (!db || !path) {
      setSignedUrl(null)
      return undefined
    }
    const cached = peekStakeholderPhotoDisplayUrl(path)
    if (cached) setSignedUrl(cached)
    getStakeholderPhotoSignedUrl(db, path).then((result) => {
      if (cancelled) return
      if (result.success) setSignedUrl(result.data)
    })
    return () => { cancelled = true }
  }, [db, path, refreshNonce])

  const src = previewUrl || signedUrl
  if (src) {
    return (
      <ZoomableImage
        src={src}
        alt={alt}
        imgClassName={`${sizeClassName} rounded-full object-cover shrink-0`}
        hoverPreviewClassName="rounded-full object-cover"
      />
    )
  }

  return (
    <div className={`${sizeClassName} rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 flex items-center justify-center shrink-0 text-xs font-medium`}>
      {initials}
    </div>
  )
}

export function StakeholderIdentity({
  db,
  stakeholder,
  syncFromProfile = true,
  sizeClassName = 'h-7 w-7',
  nameClassName = '',
}) {
  if (!stakeholder) return <span>—</span>
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <StakeholderAvatar
        db={db}
        stakeholder={stakeholder}
        syncFromProfile={syncFromProfile}
        sizeClassName={sizeClassName}
      />
      <span className={`truncate ${nameClassName}`}>{stakeholder.stakeholder_name || '—'}</span>
    </span>
  )
}
