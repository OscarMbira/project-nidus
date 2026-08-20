import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Circle, XCircle, Lock, History, RotateCcw, PenLine, Save } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  assignSignatory,
  areMandatorySlotsSigned,
  canLockRemainingOptionalSlots,
  declineSlot,
  earlierMandatorySlotsSigned,
  getDeclinedSignatoryCount,
  getDocumentSignatories,
  getSigningHistory,
  getSignatureSignedUrl,
  initializeSigningRound,
  lockRemainingOptionalSignatories,
  resyncPendingSigningRoundOrder,
  restartSigningChain,
  signSlot,
  slotIsMandatory,
} from '@nidus/shared/services/processTemplateSignatoryService'
import SignatureCaptureControl from './SignatureCaptureControl'
import { getSimProjectMembers } from '../../services/sim/simProjectMembershipService'

const STATUS_BADGE = {
  pending: { Icon: Circle, className: 'text-gray-400 dark:text-gray-500', label: 'Pending' },
  signed: { Icon: CheckCircle2, className: 'text-green-600 dark:text-green-400', label: 'Signed' },
  declined: { Icon: XCircle, className: 'text-red-600 dark:text-red-400', label: 'Declined' },
  expired: { Icon: Lock, className: 'text-gray-500 dark:text-gray-400', label: 'Expired' },
}

function SignatureThumbnail({ db, storagePath, altText }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!storagePath) return undefined
    getSignatureSignedUrl(db, storagePath).then((result) => {
      if (!cancelled && result.success) setUrl(result.data)
    })
    return () => { cancelled = true }
  }, [db, storagePath])

  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" title="View signature">
      <img src={url} alt={altText} className="h-10 max-w-[140px] rounded border border-gray-200 bg-white object-contain dark:border-gray-700" />
    </a>
  )
}

const REASON_PROMPT_TONES = {
  red: {
    wrap: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20',
    button: 'bg-red-600 hover:bg-red-500',
  },
  amber: {
    wrap: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20',
    button: 'bg-amber-600 hover:bg-amber-500',
  },
}

function ReasonPrompt({ onConfirm, onCancel, busy, placeholder, confirmLabel, confirmingLabel, tone = 'red' }) {
  const [reason, setReason] = useState('')
  const toneClasses = REASON_PROMPT_TONES[tone] || REASON_PROMPT_TONES.red
  return (
    <div className={`mt-2 space-y-2 rounded border p-2 ${toneClasses.wrap}`}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !reason.trim()}
          onClick={() => onConfirm(reason)}
          className={`rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-50 ${toneClasses.button}`}
        >
          {busy ? confirmingLabel : confirmLabel}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

/**
 * Signatories tab content for a process_templates document (v868). Sequential
 * signing chain, decline+restart, saved-signature reuse. RLS is the real
 * enforcement boundary (SQL/v868) — this component's own turn/ownership checks
 * exist to keep the UI honest and give clear messaging, not as security.
 */
export default function SignatoriesPanel({ db, templateNodeId, accountId, documentTable, disabled = false, mode = 'platform', projectId = null }) {
  const [slots, setSlots] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busySlot, setBusySlot] = useState(null)
  const [decliningSlot, setDecliningSlot] = useState(null)
  const [restarting, setRestarting] = useState(false)
  const [locking, setLocking] = useState(false)
  const [showLockPrompt, setShowLockPrompt] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [declinedCount, setDeclinedCount] = useState(0)
  const [fullySigned, setFullySigned] = useState(false)
  const [documentOwnerId, setDocumentOwnerId] = useState(null)
  const [resolvedProjectId, setResolvedProjectId] = useState(projectId || null)
  const [draftAssignments, setDraftAssignments] = useState({})
  const [savingAssignments, setSavingAssignments] = useState(false)
  const { showSuccess, modal: successModal } = useSuccessModal()
  const refreshInFlight = useRef(null)

  const draftsFromSlots = (list) =>
    Object.fromEntries(
      (list || [])
        .filter((s) => s.status === 'pending')
        .map((s) => [String(s.slot_order), s.assigned_user_id || '']),
    )

  const refresh = useCallback(async () => {
    if (!db || !templateNodeId) return
    if (refreshInFlight.current) return refreshInFlight.current
    setLoading(true)
    const run = (async () => {
      let result = await getDocumentSignatories(db, templateNodeId)
      if (result.success && result.data.length === 0 && accountId && documentTable) {
        result = await initializeSigningRound(db, {
          templateNodeId,
          accountId,
          documentTable,
          projectId: resolvedProjectId || projectId || null,
        })
      } else if (result.success && result.data.length > 0 && accountId && documentTable) {
        // Bring an untouched (all-pending) round's order in line with the latest
        // configured signatory chain — e.g. after an admin reorders it (v893).
        // Best-effort: a viewer without slot-admin rights can't RLS-update the
        // rows, so silently keep the already-loaded (possibly stale) order
        // rather than surfacing an error for what's a background enhancement.
        const resynced = await resyncPendingSigningRoundOrder(db, {
          templateNodeId,
          accountId,
          documentTable,
          projectId: resolvedProjectId || projectId || null,
        })
        if (resynced.success) result = resynced
      }
      if (result.success) {
        setSlots(result.data)
        setDraftAssignments(draftsFromSlots(result.data))
        setFullySigned(areMandatorySlotsSigned(result.data))
      } else {
        toast.error(result.message || 'Failed to load signatories')
      }
      // Independent of the current round — a decline in an earlier, already-
      // restarted round must stay visible to every assigned signatory, not
      // just whoever thinks to click "View history".
      const declined = await getDeclinedSignatoryCount(db, templateNodeId)
      if (declined.success) setDeclinedCount(declined.data)
      setLoading(false)
    })().finally(() => {
      refreshInFlight.current = null
    })
    refreshInFlight.current = run
    return run
  }, [db, templateNodeId, accountId, documentTable, projectId, resolvedProjectId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    getCurrentUserInternalUserId().then(setCurrentUserId)
  }, [])

  // Project team members — assignment picker source (decision 2: project team only).
  useEffect(() => {
    if (!db || !templateNodeId) return
    (async () => {
      const { data: node } = await db.from('pm_template_nodes').select('scope_entity_id, scope_entity_type, created_by').eq('id', templateNodeId).maybeSingle()
      setDocumentOwnerId(node?.created_by || null)
      if (!projectId && node?.scope_entity_type === 'project' && node?.scope_entity_id) {
        setResolvedProjectId(node.scope_entity_id)
      } else if (projectId) {
        setResolvedProjectId(projectId)
      }
      const teamProjectId = node?.scope_entity_id
      if (!teamProjectId) return
      const res = await getSimProjectMembers(teamProjectId)
      if (res?.success && Array.isArray(res.data)) {
        setTeamMembers(
          res.data
            .map((row) => {
              const profile = row.profile || row
              const id = profile.id || row.user_id
              if (!id) return null
              return { id, label: profile.full_name || profile.email || id }
            })
            .filter(Boolean),
        )
      } else {
        setTeamMembers([])
      }
    })()
  }, [db, templateNodeId, projectId])

  const userLabel = (userId) => teamMembers.find((m) => m.id === userId)?.label || (userId ? 'Unknown user' : 'Unassigned')

  // v868 decision 13 — reuse the existing notifications table/bell system. Always
  // public.notifications (Simulator has no sim.notifications mirror), so this uses
  // platformDb directly regardless of which schema `db` itself is scoped to.
  const notify = useCallback(async (userId, { title, message, entityId }) => {
    if (!userId) return
    await platformDb.from('notifications').insert({
      user_id: userId,
      notification_type: 'info',
      notification_category: 'process_template_signatory',
      title,
      message,
      related_entity_type: 'pm_template_nodes',
      related_entity_id: entityId,
      delivery_method: 'in_app',
    })
  }, [])

  const isMyTurn = (slot) => {
    if (slot.status !== 'pending' || !slot.assigned_user_id || slot.assigned_user_id !== currentUserId) return false
    return earlierMandatorySlotsSigned(slots, slot.slot_order)
  }

  const findNextNotifiableSlot = (list, afterOrder) => list.find(
    (s) => s.slot_order > afterOrder
      && s.status === 'pending'
      && s.assigned_user_id
      && earlierMandatorySlotsSigned(list, s.slot_order),
  )

  const anyDeclined = slots.some((s) => s.status === 'declined')
  const pendingOptionalCount = slots.filter((s) => s.status === 'pending' && !slotIsMandatory(s)).length
  const canLock = canLockRemainingOptionalSlots(slots, currentUserId)

  const pendingAssignmentChanges = useMemo(() => {
    return slots.filter((s) => {
      if (s.status !== 'pending') return false
      const draft = draftAssignments[String(s.slot_order)] ?? ''
      const saved = s.assigned_user_id || ''
      return draft !== saved
    })
  }, [slots, draftAssignments])

  const handleDraftAssign = (slotOrder, userId) => {
    setDraftAssignments((prev) => ({ ...prev, [String(slotOrder)]: userId || '' }))
  }

  const handleSaveAssignments = async () => {
    if (pendingAssignmentChanges.length === 0) return
    setSavingAssignments(true)
    const nextSlots = [...slots]
    for (const slot of pendingAssignmentChanges) {
      const assignedUserId = draftAssignments[String(slot.slot_order)] || null
      const result = await assignSignatory(db, {
        templateNodeId,
        slotOrder: slot.slot_order,
        assignedUserId,
      })
      if (!result.success) {
        setSavingAssignments(false)
        toast.error(result.message || 'Failed to save signatory assignments')
        return
      }
      const idx = nextSlots.findIndex((s) => s.slot_order === slot.slot_order)
      if (idx >= 0) nextSlots[idx] = result.data
    }
    setSlots(nextSlots)
    setDraftAssignments(draftsFromSlots(nextSlots))
    setSavingAssignments(false)
    const recordId = nextSlots.find((s) => s.display_id)?.display_id || templateNodeId
    showSuccess({
      recordId,
      operation: 'updated',
      message:
        pendingAssignmentChanges.length === 1
          ? 'Signatory assignment saved.'
          : `${pendingAssignmentChanges.length} signatory assignments saved.`,
    })
  }

  const handleSign = async (slot, file) => {
    setBusySlot(slot.slot_order)
    const result = await signSlot(db, {
      templateNodeId,
      slotOrder: slot.slot_order,
      file,
      mode,
      signingRound: slot.signing_round,
    })
    setBusySlot(null)
    if (!result.success) {
      toast.error(result.message || 'Failed to sign')
      return false
    }
    toast.success(`Signed as ${slot.role_label}`)
    const nextSlots = slots.map((s) => (s.slot_order === slot.slot_order ? result.data : s))
    setSlots(nextSlots)
    const isNowFullySigned = areMandatorySlotsSigned(nextSlots)
    if (isNowFullySigned) {
      setFullySigned(true)
      notify(documentOwnerId, {
        title: 'Document fully signed',
        message: `All mandatory signatories have signed. Document is now locked.`,
        entityId: templateNodeId,
      })
    } else {
      const next = findNextNotifiableSlot(nextSlots, slot.slot_order)
      if (next?.assigned_user_id) {
        notify(next.assigned_user_id, {
          title: "It's your turn to sign",
          message: `You're up to sign as ${next.role_label}.`,
          entityId: templateNodeId,
        })
      }
    }
    return true
  }

  const handleDeclineConfirm = async (slot, reason) => {
    setBusySlot(slot.slot_order)
    const result = await declineSlot(db, { templateNodeId, slotOrder: slot.slot_order, reason })
    setBusySlot(null)
    setDecliningSlot(null)
    if (!result.success) {
      toast.error(result.message || 'Failed to decline')
      return
    }
    toast.success('Declined — every assigned signatory has been notified')
    setSlots((prev) => prev.map((s) => (s.slot_order === slot.slot_order ? result.data : s)))
    setDeclinedCount((prev) => prev + 1)
    // Every signatory assigned to this document (not just the owner) is kept in
    // the loop — the decline stays a discoverable, permanent part of the audit
    // trail for all of them, not just whoever happens to check.
    const notifyIds = new Set([documentOwnerId, ...slots.map((s) => s.assigned_user_id)].filter(Boolean))
    notifyIds.delete(slot.assigned_user_id)
    notifyIds.forEach((userId) => {
      notify(userId, {
        title: 'Signatory declined to sign',
        message: `${slot.role_label} declined to sign: ${reason}`,
        entityId: templateNodeId,
      })
    })
  }

  const handleLockConfirm = async (reason) => {
    setLocking(true)
    const result = await lockRemainingOptionalSignatories(db, { templateNodeId, reason })
    setLocking(false)
    setShowLockPrompt(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to lock remaining optional signatories')
      return
    }
    const expiredByOrder = new Map(result.data.map((row) => [row.slot_order, row]))
    const nextSlots = slots.map((s) => expiredByOrder.get(s.slot_order) || s)
    setSlots(nextSlots)
    setDraftAssignments(draftsFromSlots(nextSlots))
    const count = result.data.length
    toast.success(`Locked ${count} remaining optional signatory ${count === 1 ? 'slot' : 'slots'}`)
    result.data.forEach((row) => {
      if (row.assigned_user_id) {
        notify(row.assigned_user_id, {
          title: 'Signature window closed',
          message: `${row.role_label} signing was locked before you signed: ${reason}`,
          entityId: templateNodeId,
        })
      }
    })
    notify(documentOwnerId, {
      title: 'Remaining optional signatories locked',
      message: `${count} optional signatory ${count === 1 ? 'slot was' : 'slots were'} locked: ${reason}`,
      entityId: templateNodeId,
    })
  }

  const handleRestart = async () => {
    setRestarting(true)
    const result = await restartSigningChain(db, { templateNodeId })
    setRestarting(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to restart signing')
      return
    }
    toast.success('Signing restarted — every signatory must sign again')
    setSlots(result.data)
    setDraftAssignments(draftsFromSlots(result.data))
    setFullySigned(false)
  }

  const ensureHistoryLoaded = async () => {
    if (history.length > 0) return
    const result = await getSigningHistory(db, templateNodeId)
    if (result.success) setHistory(result.data)
  }

  const toggleHistory = async () => {
    if (!showHistory) await ensureHistoryLoaded()
    setShowHistory((v) => !v)
  }

  const openHistory = async () => {
    await ensureHistoryLoaded()
    setShowHistory(true)
  }

  if (!templateNodeId) return null
  if (loading) return <p className="text-xs text-gray-400 dark:text-gray-500">Loading signatories…</p>
  if (slots.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-800 dark:text-gray-100">No signatories are required for this document type.</p>
        {!disabled && (
          <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Signatories</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {fullySigned
              ? pendingOptionalCount > 0
                ? `All mandatory slots are complete — the document content is now read-only. ${pendingOptionalCount} optional signatory ${pendingOptionalCount === 1 ? 'slot is' : 'slots are'} still open below.`
                : 'Fully signed — all mandatory slots are complete; this document is now read-only.'
              : 'Mandatory signatories sign in order. Optional slots do not block later turn. A decline halts the chain until it is restarted.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleHistory}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <History className="h-3.5 w-3.5" /> {showHistory ? 'Hide history' : 'View history'}
        </button>
      </div>

      {declinedCount > 0 && (
        <button
          type="button"
          onClick={openHistory}
          className="flex w-full items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <XCircle className="h-4 w-4 flex-shrink-0" />
          This document has {declinedCount} recorded decline{declinedCount === 1 ? '' : 's'} — kept on record and visible to every assigned signatory. View history for details.
        </button>
      )}

      {fullySigned && (
        <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          {pendingOptionalCount > 0
            ? 'All mandatory signatories have signed. Remaining optional signatories may still sign or decline below.'
            : 'Fully signed — all mandatory signatories have signed.'}
        </div>
      )}

      <ul className="space-y-3">
        {slots.map((slot) => {
          const badge = STATUS_BADGE[slot.status]
          const mine = isMyTurn(slot)
          const optional = !slotIsMandatory(slot)
          return (
            <li key={slot.id} className="rounded border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <badge.Icon className={`h-4 w-4 ${badge.className}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {slot.slot_order}. {slot.role_label}
                  </span>
                  {optional && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      Optional
                    </span>
                  )}
                  <span className={`text-xs ${badge.className}`}>{badge.label}</span>
                  {slot.display_id && <span className="text-[10px] text-gray-400 dark:text-gray-500">{slot.display_id}</span>}
                </div>

                {!disabled && slot.status === 'pending' && (
                  <select
                    value={draftAssignments[String(slot.slot_order)] ?? slot.assigned_user_id ?? ''}
                    disabled={busySlot === slot.slot_order || savingAssignments}
                    onChange={(e) => handleDraftAssign(slot.slot_order, e.target.value || null)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                  >
                    <option value="">Select a signatory…</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                )}
                {(disabled || slot.status !== 'pending') && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{userLabel(slot.assigned_user_id)}</span>
                )}
              </div>

              {slot.status === 'signed' && (
                <div className="mt-2 flex items-center gap-3">
                  <SignatureThumbnail db={db} storagePath={slot.storage_path} altText={`${slot.role_label} signature`} />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Signed {slot.signed_at ? new Date(slot.signed_at).toLocaleString() : ''}
                  </span>
                </div>
              )}

              {slot.status === 'declined' && (
                <p className="mt-2 text-xs italic text-red-600 dark:text-red-400">
                  Declined {slot.declined_at ? new Date(slot.declined_at).toLocaleString() : ''}: {slot.decline_reason}
                </p>
              )}

              {slot.status === 'expired' && (
                <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-400">
                  Locked {slot.locked_at ? new Date(slot.locked_at).toLocaleString() : ''}: {slot.lock_reason}
                </p>
              )}

              {!disabled && mine && slot.status === 'pending' && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <PenLine className="h-3.5 w-3.5" /> It's your turn to sign as {slot.role_label}.
                  </p>
                  <SignatureCaptureControl
                    db={db}
                    accountId={accountId}
                    busy={busySlot === slot.slot_order}
                    onSign={(file) => handleSign(slot, file)}
                  />
                  {decliningSlot === slot.slot_order ? (
                    <ReasonPrompt
                      tone="red"
                      busy={busySlot === slot.slot_order}
                      placeholder="Reason for declining (required)"
                      confirmLabel="Confirm decline"
                      confirmingLabel="Declining…"
                      onConfirm={(reason) => handleDeclineConfirm(slot, reason)}
                      onCancel={() => setDecliningSlot(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDecliningSlot(slot.slot_order)}
                      className="text-xs text-red-500 underline hover:text-red-400"
                    >
                      Decline to sign
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {!disabled && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            type="button"
            disabled={savingAssignments || pendingAssignmentChanges.length === 0}
            onClick={handleSaveAssignments}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingAssignments ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {!disabled && canLock && (
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          {showLockPrompt ? (
            <ReasonPrompt
              tone="amber"
              busy={locking}
              placeholder="Reason for locking remaining optional signatories (required)"
              confirmLabel="Confirm lock"
              confirmingLabel="Locking…"
              onConfirm={handleLockConfirm}
              onCancel={() => setShowLockPrompt(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowLockPrompt(true)}
              className="inline-flex items-center gap-1.5 rounded border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/20"
            >
              <Lock className="h-3.5 w-3.5" /> Lock remaining optional signatories
            </button>
          )}
        </div>
      )}

      {!disabled && anyDeclined && (
        <button
          type="button"
          disabled={restarting}
          onClick={handleRestart}
          className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RotateCcw className="h-3.5 w-3.5" /> {restarting ? 'Restarting…' : 'Restart signing (everyone signs again)'}
        </button>
      )}

      {successModal}

      {showHistory && (
        <div className="space-y-1 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
          <p className="font-medium text-gray-700 dark:text-gray-300">All rounds</p>
          {history.map((row) => (
            <p key={row.id} className="text-gray-500 dark:text-gray-400">
              Round {row.signing_round} · {row.slot_order}. {row.role_label} · {STATUS_BADGE[row.status]?.label || row.status}
              {row.status === 'declined' && row.decline_reason ? ` — ${row.decline_reason}` : ''}
              {row.status === 'expired' && row.lock_reason ? ` — ${row.lock_reason}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
