import { useMemo, useState, useEffect, useRef } from 'react'
import { AlertTriangle, Search, X } from 'lucide-react'
import ManagerAppointmentForm, { MANAGER_APPOINTMENT_EMPTY } from '../pm/ManagerAppointmentForm'

const LABELS = {
  project: 'Project',
  programme: 'Programme',
  portfolio: 'Portfolio',
}

/**
 * Inline assignment panel (non-modal). Used on Manager assignments pages.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {'project'|'programme'|'portfolio'} props.entityType
 * @param {string} props.entityName
 * @param {string|null|undefined} props.entityCode — project_code / programme_code / portfolio_code for quick reference
 * @param {string|null|undefined} props.currentManagerId
 * @param {Array<{ id: string, email: string, full_name: string | null }>} props.eligibleUsers
 * @param {Record<string, number>} props.workloadByUserId
 * @param {number} props.limit
 * @param {(userId: string, appointmentTerms?: object) => Promise<void>} props.onConfirm
 * @param {boolean} [props.useFormalAppointment] — v593 invitation + appointment record
 */
export default function AssignManagerModal({
  open,
  onClose,
  entityType,
  entityName,
  entityCode,
  currentManagerId,
  eligibleUsers = [],
  workloadByUserId = {},
  limit = 5,
  onConfirm,
  useFormalAppointment = false,
}) {
  const panelRef = useRef(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [appointmentTerms, setAppointmentTerms] = useState(MANAGER_APPOINTMENT_EMPTY)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelectedId(currentManagerId || '')
    setErr(null)
    setAppointmentTerms(MANAGER_APPOINTMENT_EMPTY)
  }, [open, currentManagerId])

  useEffect(() => {
    if (!open) return
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [open, entityName, entityCode])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return eligibleUsers
    return eligibleUsers.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(t) ||
        (u.email || '').toLowerCase().includes(t)
    )
  }, [eligibleUsers, search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedId) {
      setErr('Select a manager')
      return
    }
    setErr(null)
    setSaving(true)
    try {
      await onConfirm(selectedId, useFormalAppointment ? appointmentTerms : undefined)
      onClose()
    } catch (ex) {
      setErr(ex?.message || 'Assignment failed')
    } finally {
      setSaving(false)
    }
  }

  const kind = LABELS[entityType] || 'Entity'

  if (!open) return null

  return (
    <section
      ref={panelRef}
      role="region"
      aria-labelledby="assign-manager-heading"
      className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-gray-900 shadow-sm p-4 md:p-5 space-y-4 ring-1 ring-blue-500/10 dark:ring-blue-400/10"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="assign-manager-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
          Assign {kind} manager
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg border border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close assignment panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/90 px-4 py-3 space-y-1.5"
        aria-label={`${kind} reference`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {kind} you are assigning
        </p>
        {entityCode ? (
          <p className="font-mono text-sm text-blue-700 dark:text-blue-300 tabular-nums">{entityCode}</p>
        ) : null}
        <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white leading-snug break-words">
          {entityName || '—'}
        </p>
      </div>

      <form id="assign-manager-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mgr-search" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Search managers
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <input
              id="mgr-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-sm"
              placeholder="Name or email…"
            />
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.length === 0 && (
            <p className="p-3 text-sm text-gray-500 dark:text-gray-400">No matching users.</p>
          )}
          {filtered.map((u) => {
            const w = workloadByUserId[u.id] ?? 0
            const full = w >= limit
            return (
              <label
                key={u.id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 ${
                  selectedId === u.id ? 'bg-blue-50 dark:bg-blue-950/40' : ''
                }`}
              >
                <input
                  type="radio"
                  name="manager"
                  value={u.id}
                  checked={selectedId === u.id}
                  onChange={() => setSelectedId(u.id)}
                  className="rounded-full border-gray-300 dark:border-gray-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {u.full_name || u.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                </div>
                <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300 shrink-0">
                  {w} / {limit}
                  {full && <AlertTriangle className="inline h-4 w-4 ml-1 text-amber-500" aria-label="At limit" />}
                </span>
              </label>
            )
          })}
        </div>

        {useFormalAppointment && selectedId ? (
          <ManagerAppointmentForm
            value={appointmentTerms}
            onChange={setAppointmentTerms}
            eligibleUsers={eligibleUsers}
            storageKey={`nidus-mgr-appt-${entityType}-${entityName}`}
          />
        ) : null}

        {err && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : useFormalAppointment ? 'Send appointment' : 'Assign'}
          </button>
        </div>
      </form>
    </section>
  )
}
