import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Circle, XCircle, Lock, History, RotateCcw, PenLine, Send } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import {
  areMandatorySlotsSigned,
  canLockRemainingOptionalSlots,
  earlierMandatorySlotsSigned,
  slotIsMandatory,
} from '@nidus/shared/services/processTemplateSignatoryService'
import {
  assignRecordSignatory,
  declineRecordSlot,
  getRecordSignatories,
  getRecordSignatureUrl,
  getRecordSigningHistory,
  lockRecordOptionalSlots,
  resolveRegisterSignatorySlots,
  restartRecordSignoff,
  signRecordSlot,
  startRecordSignoff,
} from '@nidus/shared/services/localRegisterSignoffService'
import SignatureCaptureControl from './SignatureCaptureControl'
import SelectField from './SelectField'

const STATUS_BADGE = {
  pending: { Icon: Circle, className: 'text-gray-400 dark:text-gray-500', label: 'Pending' },
  signed: { Icon: CheckCircle2, className: 'text-green-600 dark:text-green-400', label: 'Signed' },
  declined: { Icon: XCircle, className: 'text-red-600 dark:text-red-400', label: 'Declined' },
  expired: { Icon: Lock, className: 'text-gray-500 dark:text-gray-400', label: 'Closed' },
}

function SignatureImage({ db, storagePath, alt }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (storagePath) getRecordSignatureUrl(db, storagePath).then((r) => { if (!cancelled && r.success) setUrl(r.data) })
    return () => { cancelled = true }
  }, [db, storagePath])
  if (!url) return null
  return <img src={url} alt={alt} className="h-10 max-w-[140px] rounded border border-gray-200 bg-white object-contain dark:border-gray-700" />
}

function ReasonPrompt({ placeholder, confirmLabel, busy, onConfirm, onCancel, tone = 'red' }) {
  const [reason, setReason] = useState('')
  const wrap = tone === 'amber'
    ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
    : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
  const button = tone === 'amber' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-600 hover:bg-red-500'
  return (
    <div className={`mt-2 space-y-2 rounded border p-2 ${wrap}`}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={2}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !reason.trim()}
          onClick={() => onConfirm(reason)}
          className={`rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-50 ${button}`}
        >
          {confirmLabel}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          Cancel
        </button>
      </div>
    </div>
  )
}

/**
 * Sign-off tab for a Local Register document record (v1318). Before sign-off: the effective
 * role slots (Document Signatory configuration) with a person picker each, and Start sign-off.
 * During / after: the signing chain in order — the assigned person signs or declines in turn,
 * pending people can be changed, optional slots can be closed, and the preparer can restart.
 * The database functions (SQL/v1319) are the real boundary; checks here keep the UI honest.
 *
 * @param {object}   props
 * @param {object}   props.db            platformDb / simDb
 * @param {object}   props.record        local_register_records row (id, signoff_state, title, created_by)
 * @param {string}   props.registerKey   register_key (document type `local_register:<key>`)
 * @param {string}   props.accountId
 * @param {string}   [props.projectId]   record's project (scope chain for the configuration)
 * @param {{id: string, label: string}[]} props.teamMembers  people who may be picked (public.users ids)
 * @param {string}   props.currentUserId public.users id of the viewer
 * @param {'platform'|'sim'} [props.mode]
 * @param {() => void} [props.onRecordChange]  reload the record after status/lock changes
 */
export default function RegisterSignoffPanel({
  db,
  record,
  registerKey,
  accountId,
  projectId = null,
  teamMembers = [],
  currentUserId = null,
  mode = 'platform',
  onRecordChange,
  // v1338: the register's suggested roles, used when the organisation has set none for this document type.
  suggestedRoles = null,
}) {
  const recordId = record?.id
  const signoffState = record?.signoff_state || 'none'
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState([])
  const [configSlots, setConfigSlots] = useState([])
  const [configSource, setConfigSource] = useState(null)
  const [removedSuggested, setRemovedSuggested] = useState([])
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState(false)
  const [declining, setDeclining] = useState(null)
  const [showRestart, setShowRestart] = useState(false)
  const [showLock, setShowLock] = useState(false)
  const [history, setHistory] = useState(null)

  const fetchSignoff = useCallback(() => Promise.all([
    getRecordSignatories(db, recordId),
    resolveRegisterSignatorySlots(db, { accountId, registerKey, projectId, suggestedRoles }),
  ]), [db, recordId, accountId, registerKey, projectId, suggestedRoles])

  const applySignoff = useCallback(([current, config]) => {
    if (current.success) setSlots(current.data)
    else toast.error(current.message || 'Failed to load signatories')
    if (config.success) {
      setConfigSlots(config.data?.slots || [])
      setConfigSource(config.data?.source || null)
    }
    setLoading(false)
  }, [])

  const load = useCallback(() => fetchSignoff().then(applySignoff), [fetchSignoff, applySignoff])

  useEffect(() => {
    if (!db || !recordId) return undefined
    let cancelled = false
    fetchSignoff().then((result) => { if (!cancelled) applySignoff(result) })
    return () => { cancelled = true }
  }, [db, recordId, fetchSignoff, applySignoff, signoffState])

  const memberOptions = useMemo(() => teamMembers.map((m) => ({ value: m.id, label: m.label })), [teamMembers])
  const nameOf = (userId) => teamMembers.find((m) => m.id === userId)?.label || (userId ? 'Team member' : 'Unassigned')

  const notify = useCallback(async (userId, title, message) => {
    if (!userId || userId === currentUserId) return
    // Notifications are always public.notifications (no sim mirror), as in v868.
    await platformDb.from('notifications').insert({
      user_id: userId,
      notification_type: 'info',
      notification_category: 'register_document_signoff',
      title,
      message,
      related_entity_type: 'local_register_records',
      related_entity_id: recordId,
      delivery_method: 'in_app',
    })
  }, [currentUserId, recordId])

  const afterChange = async () => {
    await load()
    onRecordChange?.()
  }

  const nextInTurn = (list) => list.find((s) => s.status === 'pending' && s.assigned_user_id && earlierMandatorySlotsSigned(list, s.slot_order))

  // ── Not started ─────────────────────────────────────────────────────────────
  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading sign-off…</p>

  if (signoffState === 'none') {
    const suggestedOnly = configSource?.mode === 'register_default'
    const prepared = configSlots
      .map((s, i) => ({ ...s, key: String(i), assigned_user_id: draft[String(i)] || '' }))
      .filter((s) => !suggestedOnly || !removedSuggested.includes(s.key))
    const ready = prepared.length > 0 && prepared.every((s) => !slotIsMandatory(s) || s.assigned_user_id)
    const handleStart = async () => {
      setBusy(true)
      const result = await startRecordSignoff(db, { recordId, slots: prepared })
      setBusy(false)
      if (!result.success) {
        toast.error(result.message || 'Failed to start sign-off')
        return
      }
      const first = nextInTurn(result.data || [])
      if (first) await notify(first.assigned_user_id, 'Document ready for your signature', `"${record.title}" — please sign as ${first.role_label}.`)
      toast.success('Sign-off started — the document is now locked')
      setDraft({})
      await afterChange()
    }

    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sign-off</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose who signs for each role, then start sign-off. The document becomes read-only and moves to In Review;
            once every required person has signed it becomes Approved.
          </p>
        </div>
        {slots.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">A previous sign-off round was restarted — see the history below.</p>
        )}
        {suggestedOnly && (
          <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            Suggested signing roles for this document type. Remove any that do not apply. A PMO Admin or Project Manager can set your organisation&apos;s own roles on the Document Signatory page.
          </p>
        )}
        {prepared.length === 0 ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            No signatories are set up for this document type yet. A PMO Admin or Project Manager can add the signing roles on the Document Signatory page.
          </p>
        ) : (
          <ul className="space-y-3">
            {prepared.map((slot, index) => (
              <li key={slot.key} className="flex flex-wrap items-center justify-between gap-3 rounded border border-gray-200 p-3 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {index + 1}. {slot.role_label}
                  {!slotIsMandatory(slot) && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Optional</span>
                  )}
                </span>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <div className="w-full sm:w-72">
                    <SelectField
                      options={memberOptions}
                      value={slot.assigned_user_id}
                      onChange={(v) => setDraft((d) => ({ ...d, [slot.key]: v || '' }))}
                      placeholder="Choose a person…"
                      aria-label={`Signatory for ${slot.role_label}`}
                    />
                  </div>
                  {suggestedOnly && (
                    <button
                      type="button"
                      onClick={() => setRemovedSuggested((list) => [...list, slot.key])}
                      className="text-xs font-medium text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
                      aria-label={`Remove the ${slot.role_label} role`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {prepared.length > 0 && (
          <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              disabled={!ready || busy}
              onClick={handleStart}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {busy ? 'Starting…' : 'Start sign-off'}
            </button>
          </div>
        )}
        <HistoryBlock db={db} recordId={recordId} history={history} setHistory={setHistory} nameOf={nameOf} />
      </div>
    )
  }

  // ── In progress / complete ───────────────────────────────────────────────────
  const fullySigned = areMandatorySlotsSigned(slots)
  const anyDeclined = slots.some((s) => s.status === 'declined')
  const canLock = canLockRemainingOptionalSlots(slots, currentUserId)
  const isMyTurn = (slot) =>
    !anyDeclined && slot.status === 'pending' && slot.assigned_user_id === currentUserId && earlierMandatorySlotsSigned(slots, slot.slot_order)

  const handleSign = async (slot, file) => {
    setBusy(true)
    const result = await signRecordSlot(db, { recordId, slotOrder: slot.slot_order, signingRound: slot.signing_round, file, mode })
    setBusy(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to sign')
      return false
    }
    const next = slots.map((s) => (s.slot_order === slot.slot_order ? result.data : s))
    if (areMandatorySlotsSigned(next)) {
      await notify(record.created_by, 'Document approved', `"${record.title}" has been signed by every required signatory.`)
    } else {
      const following = nextInTurn(next)
      if (following) await notify(following.assigned_user_id, 'Your turn to sign', `"${record.title}" — please sign as ${following.role_label}.`)
    }
    toast.success(`Signed as ${slot.role_label}`)
    await afterChange()
    return true
  }

  const handleDecline = async (slot, reason) => {
    setBusy(true)
    const result = await declineRecordSlot(db, { recordId, slotOrder: slot.slot_order, reason })
    setBusy(false)
    setDeclining(null)
    if (!result.success) {
      toast.error(result.message || 'Failed to decline')
      return
    }
    const people = new Set([record.created_by, ...slots.map((s) => s.assigned_user_id)])
    await Promise.all([...people].map((id) => notify(id, 'Sign-off declined', `${slot.role_label} declined "${record.title}": ${reason}`)))
    toast.success('Declined — the preparer has been notified')
    await afterChange()
  }

  const handleAssign = async (slot, userId) => {
    const result = await assignRecordSignatory(db, { recordId, slotOrder: slot.slot_order, userId })
    if (!result.success) {
      toast.error(result.message || 'Failed to change the signatory')
      return
    }
    if (userId && isMyTurnFor(slots, slot)) {
      await notify(userId, 'Your turn to sign', `"${record.title}" — please sign as ${slot.role_label}.`)
    }
    await load()
  }

  const handleLock = async (reason) => {
    setBusy(true)
    const result = await lockRecordOptionalSlots(db, { recordId, reason })
    setBusy(false)
    setShowLock(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to close the optional slots')
      return
    }
    toast.success('Remaining optional signatories closed')
    await afterChange()
  }

  const handleRestart = async (reason) => {
    setBusy(true)
    const result = await restartRecordSignoff(db, { recordId, reason })
    setBusy(false)
    setShowRestart(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to restart sign-off')
      return
    }
    toast.success('Sign-off restarted — the document is editable again (Draft)')
    setHistory(null)
    await afterChange()
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sign-off</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {fullySigned
            ? 'Approved — every required signatory has signed. The document is read-only; restart sign-off to make changes.'
            : anyDeclined
              ? 'A signatory declined. Restart sign-off to make changes and sign again.'
              : 'Signatories sign in order. The document is read-only while sign-off is in progress.'}
        </p>
      </div>

      <ul className="space-y-3">
        {slots.map((slot) => {
          const badge = STATUS_BADGE[slot.status] || STATUS_BADGE.pending
          const mine = isMyTurn(slot)
          return (
            <li key={slot.id} className="rounded border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <badge.Icon className={`h-4 w-4 ${badge.className}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{slot.slot_order}. {slot.role_label}</span>
                  {!slotIsMandatory(slot) && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Optional</span>
                  )}
                  <span className={`text-xs ${badge.className}`}>{badge.label}</span>
                </div>
                {slot.status === 'pending' && !anyDeclined ? (
                  <div className="w-full sm:w-64">
                    <SelectField
                      options={memberOptions}
                      value={slot.assigned_user_id || ''}
                      onChange={(v) => handleAssign(slot, v || null)}
                      placeholder="Choose a person…"
                      aria-label={`Signatory for ${slot.role_label}`}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-600 dark:text-gray-300">{nameOf(slot.assigned_user_id)}</span>
                )}
              </div>
              {slot.status === 'signed' && (
                <div className="mt-2 flex items-center gap-3">
                  <SignatureImage db={db} storagePath={slot.storage_path} alt={`${slot.role_label} signature`} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Signed {slot.signed_at ? new Date(slot.signed_at).toLocaleString() : ''}</span>
                </div>
              )}
              {slot.status === 'declined' && (
                <p className="mt-2 text-xs italic text-red-600 dark:text-red-400">Declined: {slot.decline_reason}</p>
              )}
              {slot.status === 'expired' && slot.lock_reason && (
                <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-400">Closed: {slot.lock_reason}</p>
              )}
              {mine && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <PenLine className="h-3.5 w-3.5" /> It&apos;s your turn to sign as {slot.role_label}.
                  </p>
                  <SignatureCaptureControl db={platformDb} accountId={accountId} busy={busy} onSign={(file) => handleSign(slot, file)} />
                  {declining === slot.slot_order ? (
                    <ReasonPrompt
                      placeholder="Reason for declining (required)"
                      confirmLabel="Confirm decline"
                      busy={busy}
                      onConfirm={(reason) => handleDecline(slot, reason)}
                      onCancel={() => setDeclining(null)}
                    />
                  ) : (
                    <button type="button" onClick={() => setDeclining(slot.slot_order)} className="text-xs text-red-600 underline hover:text-red-500 dark:text-red-400">
                      Decline to sign
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        {canLock && !showLock && (
          <button
            type="button"
            onClick={() => setShowLock(true)}
            className="inline-flex items-center gap-1.5 rounded border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/20"
          >
            <Lock className="h-3.5 w-3.5" /> Close remaining optional signatories
          </button>
        )}
        {!showRestart && (
          <button
            type="button"
            onClick={() => setShowRestart(true)}
            className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart sign-off
          </button>
        )}
      </div>
      {showLock && (
        <ReasonPrompt tone="amber" placeholder="Reason for closing the optional signatories (required)" confirmLabel="Close optional slots" busy={busy} onConfirm={handleLock} onCancel={() => setShowLock(false)} />
      )}
      {showRestart && (
        <ReasonPrompt
          tone="amber"
          placeholder="Reason for restarting sign-off (required) — signatures so far are kept in history"
          confirmLabel="Restart sign-off"
          busy={busy}
          onConfirm={handleRestart}
          onCancel={() => setShowRestart(false)}
        />
      )}

      <HistoryBlock db={db} recordId={recordId} history={history} setHistory={setHistory} nameOf={nameOf} />
    </div>
  )
}

function isMyTurnFor(slots, slot) {
  return earlierMandatorySlotsSigned(slots, slot.slot_order)
}

function HistoryBlock({ db, recordId, history, setHistory, nameOf }) {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    if (!open && history === null) {
      const result = await getRecordSigningHistory(db, recordId)
      setHistory(result.success ? result.data : [])
    }
    setOpen((o) => !o)
  }
  return (
    <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
      <button type="button" onClick={toggle} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <History className="h-3.5 w-3.5" /> {open ? 'Hide signing history' : 'Signing history'}
      </button>
      {open && (
        <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
          {(history || []).length === 0 && <p>No signing rounds yet.</p>}
          {(history || []).map((row) => (
            <p key={row.id}>
              Round {row.signing_round} · {row.slot_order}. {row.role_label} · {nameOf(row.assigned_user_id)} · {STATUS_BADGE[row.status]?.label || row.status}
              {row.signed_at ? ` ${new Date(row.signed_at).toLocaleString()}` : ''}
              {row.status === 'declined' && row.decline_reason ? ` — ${row.decline_reason}` : ''}
              {row.status === 'expired' && row.lock_reason ? ` — ${row.lock_reason}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
