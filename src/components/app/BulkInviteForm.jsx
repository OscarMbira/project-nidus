/**
 * Bulk team invite wizard — CSV/Excel upload, validation, review, send, results.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Upload,
  Download,
  Loader,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
  Save,
} from 'lucide-react'
import {
  parseBulkInviteFile,
  validateBulkInviteRows,
  generateCsvTemplate,
  generateErrorReportCsv,
  sendBulkInvitations,
} from '../../services/bulkInviteService'
import { createProjectRoleTemplates, deriveRoleSlug } from '../../services/bulkRoleService'
import { saveDraft, loadDraft, updateDraftResults } from '../../services/bulkInviteDraftService'
import {
  getProjectManagerAssignableRoles,
  getPmoMembershipAssignableRoles,
} from '../../services/projectRoleAssignmentService'
import { useInvitationTemplates } from '../../features/invitation-templates/hooks/useInvitationTemplates'
import { loadInvitationProjectContext } from '../../services/invitationProjectContextService'
import { fetchDefaultInvitationExpiryDaysForProject, clampInvitationExpiryDays } from '../../services/invitationExpiryService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useSortableTable } from '../../hooks/useSortableTable'
import { useViewMode } from '../../hooks/useViewMode'
import ExportListMenu from '../ui/ExportListMenu'
import ViewToggle from '../ui/ViewToggle'

const STEPS = {
  UPLOAD: 1,
  VALIDATION: 2,
  REVIEW: 3,
  SENDING: 4,
  RESULTS: 5,
}

const STORAGE_SORT_REVIEW = 'nidus-bulk-invite-review-sort'
const STORAGE_VIEW = 'nidus-bulk-invite-review-view'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadText(text, filename) {
  downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), filename)
}

export default function BulkInviteForm({
  projectId,
  allowLeadershipRoles = false,
  callerIsPmoAdmin = false,
  existingMemberEmails = [],
  pendingInviteEmails = [],
  seatAllocation = null,
  onSuccess,
  onCancel,
  resumeDraft = null,
}) {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [roles, setRoles] = useState([])
  const [defaultRoleId, setDefaultRoleId] = useState('')
  const [messageMode, setMessageMode] = useState('template')
  const [customMessage, setCustomMessage] = useState('')
  const [rows, setRows] = useState([])
  const [pendingNewRoles, setPendingNewRoles] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [validationSummary, setValidationSummary] = useState(null)
  const [draftId, setDraftId] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftNotice, setDraftNotice] = useState(null)
  const [sendProgress, setSendProgress] = useState([])
  const [roleCreateStatus, setRoleCreateStatus] = useState([])
  const [sendResults, setSendResults] = useState(null)
  const [inviterContext, setInviterContext] = useState({})
  const [accountId, setAccountId] = useState(null)
  const [authUserId, setAuthUserId] = useState(null)
  const [expiryDays, setExpiryDays] = useState(7)
  const fileInputRef = useRef(null)
  const reuploadInputRef = useRef(null)

  const [viewMode, setViewMode] = useViewMode(STORAGE_VIEW, 'list')
  const reviewSort = useSortableTable({
    defaultSort: { column: 'email', direction: 'asc' },
    storageKey: STORAGE_SORT_REVIEW,
  })

  const { getTemplateForRole } = useInvitationTemplates({
    accountId,
    authUserId,
    prefetchEnsure: Boolean(accountId && authUserId),
  })

  const loadRoles = useCallback(async () => {
    const res = allowLeadershipRoles
      ? await getPmoMembershipAssignableRoles()
      : await getProjectManagerAssignableRoles()
    if (res.success) {
      setRoles(res.data || [])
      const preferred =
        res.data?.find((r) => r.role_name === 'team_member') || res.data?.[0]
      setDefaultRoleId((prev) => prev || preferred?.id || '')
    }
  }, [allowLeadershipRoles])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  useEffect(() => {
    platformDb.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setAuthUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const ctx = await loadInvitationProjectContext(projectId)
      if (cancelled) return
      setInviterContext({
        projectName: ctx.projectName,
        projectCode: ctx.projectCode,
        organisationName: ctx.organisationName,
        inviterName: ctx.inviterName,
        projectContext: ctx,
      })
      setAccountId(ctx.accountId || null)
      const days = await fetchDefaultInvitationExpiryDaysForProject(projectId)
      if (!cancelled) setExpiryDays(clampInvitationExpiryDays(days))
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!resumeDraft) return
    setDraftId(resumeDraft.id)
    setDefaultRoleId(resumeDraft.defaultRoleId || '')
    setCustomMessage(resumeDraft.message || '')
    setMessageMode(resumeDraft.message ? 'single' : 'template')
    setRows(resumeDraft.members || [])
    setPendingNewRoles(resumeDraft.pendingNewRoles || [])
    setValidationErrors(resumeDraft.validationErrors || [])
    if (resumeDraft.validationErrors?.length) {
      setStep(STEPS.VALIDATION)
    } else if (resumeDraft.members?.length) {
      setStep(STEPS.REVIEW)
    }
  }, [resumeDraft])

  const seatInfo = useMemo(() => {
    if (!seatAllocation) return null
    return {
      has_available_seats: seatAllocation.available_seats > 0,
      available_seats: seatAllocation.available_seats,
      total_seats: seatAllocation.total_seats,
      used_seats: seatAllocation.used_seats,
    }
  }, [seatAllocation])

  const runValidation = useCallback(
    (memberRows) => {
      const summary = validateBulkInviteRows(memberRows, projectId, {
        seatInfo,
        existingMemberEmails,
        pendingInviteEmails,
      })
      setValidationErrors(summary.errors)
      setValidationSummary(summary)
      return summary
    },
    [projectId, seatInfo, existingMemberEmails, pendingInviteEmails],
  )

  const applyFile = async (file, keepConfig = false) => {
    setParseError(null)
    setBusy(true)
    try {
      const parsed = await parseBulkInviteFile(file, {
        availableRoles: roles,
        defaultRoleId: keepConfig ? defaultRoleId : defaultRoleId,
      })
      if (parsed.errors?.length) {
        setParseError(parsed.errors.join('; '))
      }
      setRows(parsed.rows)
      setPendingNewRoles(parsed.newRoles || [])
      const summary = runValidation(parsed.rows)
      setStep(STEPS.VALIDATION)
      if (!keepConfig) {
        /* keep default role + message from step 1 */
      }
      return summary
    } catch (e) {
      setParseError(e.message || 'Failed to parse file')
      return null
    } finally {
      setBusy(false)
    }
  }

  const handleSaveDraft = async () => {
    setDraftSaving(true)
    setDraftNotice(null)
    const res = await saveDraft(
      projectId,
      {
        defaultRoleId,
        message: messageMode === 'single' ? customMessage : null,
        members: rows,
        pendingNewRoles,
        validationErrors,
      },
      draftId,
    )
    setDraftSaving(false)
    if (res.success) {
      setDraftId(res.draftId)
      setDraftNotice('Draft saved')
    } else {
      setDraftNotice(res.error || 'Failed to save draft')
    }
  }

  const excludeAllErrorRows = () => {
    const errorEmails = new Set(
      validationErrors
        .filter((e) => e.severity === 'error')
        .map((e) => String(e.email).toLowerCase()),
    )
    const next = rows.map((r) =>
      errorEmails.has(String(r.email).toLowerCase()) ? { ...r, selected: false } : r,
    )
    setRows(next)
    runValidation(next)
  }

  const updateRow = (rowIndex, patch) => {
    setRows((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, ...patch } : r)),
    )
  }

  const blockingCount = validationErrors.filter(
    (e) => e.severity === 'error' && !e.resolved,
  ).length

  const selectedValidRows = useMemo(() => {
    const errorEmails = new Set(
      validationErrors
        .filter((e) => e.severity === 'error')
        .map((e) => String(e.email).toLowerCase()),
    )
    return rows.filter(
      (r) =>
        r.selected !== false &&
        !errorEmails.has(String(r.email).toLowerCase()) &&
        (r.role_id || r.isNewRole),
    )
  }, [rows, validationErrors])

  const roleSummary = useMemo(() => {
    const counts = new Map()
    selectedValidRows.forEach((r) => {
      const key = r.role_display_name || r.role_name || 'Unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return Array.from(counts.entries())
  }, [selectedValidRows])

  const handleSend = async () => {
    setStep(STEPS.SENDING)
    setBusy(true)
    setSendProgress([])
    setRoleCreateStatus([])

    const rolesToCreate = pendingNewRoles
      .filter((p) => !p.excluded)
      .map((p) => ({
        role_name: p.suggestedSlug || deriveRoleSlug(p.rawValue, roles.map((r) => r.role_name)),
        role_display_name: p.confirmedDisplayName || p.suggestedDisplayName || p.rawValue,
      }))

    let workingRows = rows.map((r) => ({ ...r }))

    if (rolesToCreate.length) {
      setRoleCreateStatus(rolesToCreate.map((r) => ({ ...r, status: 'creating' })))
      const { created, errors } = await createProjectRoleTemplates(rolesToCreate)
      if (errors.length) {
        setRoleCreateStatus((prev) =>
          prev.map((r) => ({ ...r, status: 'failed', error: errors.join('; ') })),
        )
        setBusy(false)
        setStep(STEPS.REVIEW)
        setParseError(errors.join('; '))
        return
      }
      setRoleCreateStatus(created.map((c) => ({ ...c, status: 'created' })))
      const bySlug = new Map(created.map((c) => [c.role_name, c]))
      workingRows = workingRows.map((row) => {
        if (!row.isNewRole) return row
        const pending = pendingNewRoles.find((p) => p.rawValue === row.rawRoleValue)
        const slug =
          pending?.suggestedSlug ||
          deriveRoleSlug(row.rawRoleValue, roles.map((r) => r.role_name))
        const match = bySlug.get(slug) || bySlug.get(row.role_name)
        if (match) {
          return {
            ...row,
            role_id: match.id,
            role_name: match.role_name,
            role_display_name: match.role_display_name,
            isNewRole: false,
          }
        }
        return row
      })
      setRows(workingRows)
      await loadRoles()
    }

    let inviterUserId = null
    const {
      data: { user },
    } = await platformDb.auth.getUser()
    if (user) {
      const { data: u } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      inviterUserId = u?.id
    }

    const toSend = workingRows.filter(
      (r) => r.selected !== false && r.role_id && !r.isNewRole,
    )
    const message = messageMode === 'single' ? customMessage : null

    const outcome = await sendBulkInvitations(
      projectId,
      toSend,
      {
        message,
        expiryDays,
        inviterUserId,
        isPmoAdmin: callerIsPmoAdmin,
        projectName: inviterContext.projectName,
        projectCode: inviterContext.projectCode,
        organisationName: inviterContext.organisationName,
        inviterName: inviterContext.inviterName,
        projectContext: inviterContext.projectContext,
        getTemplateForRole,
      },
      (p) => {
        setSendProgress((prev) => {
          const next = [...prev]
          next[p.index] = p
          return next
        })
      },
    )

    setSendResults(outcome)
    if (draftId) {
      await updateDraftResults(draftId, outcome.results, 'completed')
    }
    setBusy(false)
    setStep(STEPS.RESULTS)
    onSuccess?.(outcome)
  }

  const resultExportCols = [
    { key: 'email', label: 'Email' },
    { key: 'role_name', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'error', label: 'Error' },
  ]

  const resultExportData = (sendResults?.results || []).map((r) => ({
    email: r.email,
    role_name: r.role_name,
    status: r.success ? 'Sent' : r.status || 'Failed',
    error: r.error || '',
  }))

  if (!projectId) return null

  return (
    <section
      id="bulk-invite-panel"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
      aria-labelledby="bulk-invite-heading"
    >
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="bulk-invite-heading" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden />
            Bulk invite team members
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Upload CSV or Excel — mixed roles per row supported.
          </p>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[44px] px-2"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="px-4 py-4 sm:px-6 space-y-4">
        {step === STEPS.UPLOAD && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Default role (for rows without a role in file) *
            </label>
            <select
              value={defaultRoleId}
              onChange={(e) => setDefaultRoleId(e.target.value)}
              className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              required
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.role_display_name}
                </option>
              ))}
            </select>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Invitation message</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="msgMode"
                  checked={messageMode === 'template'}
                  onChange={() => setMessageMode('template')}
                />
                Per-role auto-template (default)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="msgMode"
                  checked={messageMode === 'single'}
                  onChange={() => setMessageMode('single')}
                />
                Single custom message for all
              </label>
              {messageMode === 'single' ? (
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Invitation message…"
                />
              ) : null}
            </fieldset>

            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) applyFile(f)
              }}
            >
              <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Drop CSV or Excel here, or choose a file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) applyFile(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={busy || !defaultRoleId}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50 min-h-[44px]"
              >
                {busy ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Choose file
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                downloadText(
                  generateCsvTemplate(roles),
                  'bulk-invite-template.csv',
                )
              }
              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
            >
              <Download className="h-4 w-4" />
              Download CSV template
            </button>

            {parseError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {parseError}
              </p>
            ) : null}
            {draftNotice ? (
              <p className="text-sm text-green-700 dark:text-green-300">{draftNotice}</p>
            ) : null}
          </div>
        )}

        {step === STEPS.VALIDATION && (
          <div className="space-y-4">
            {validationSummary ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                  <span className="font-semibold text-red-800 dark:text-red-200">
                    {validationSummary.errorCount} blocking error(s)
                  </span>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                  <span className="font-semibold text-amber-800 dark:text-amber-200">
                    {validationSummary.warningCount} warning(s)
                  </span>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    {validationSummary.validCount} valid row(s)
                  </span>
                </div>
              </div>
            ) : null}

            {seatInfo ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Seats: {seatInfo.used_seats ?? '—'} / {seatInfo.total_seats ?? '—'} used —{' '}
                {seatInfo.available_seats ?? 0} available for this batch (
                {selectedValidRows.length} selected)
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">First name</th>
                    <th className="px-3 py-2 text-left">Last name</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Issue</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {validationErrors
                    .filter((e) => e.row_index >= 0)
                    .map((ve) => {
                      const row = rows.find((r) => r.rowIndex === ve.row_index)
                      if (!row) return null
                      return (
                        <tr
                          key={`${ve.row_index}-${ve.error_type}`}
                          className={
                            ve.severity === 'error'
                              ? 'bg-red-50/50 dark:bg-red-950/20'
                              : 'bg-amber-50/50 dark:bg-amber-950/20'
                          }
                        >
                          <td className="px-3 py-2">{ve.row_index + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              className="w-full min-w-[140px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                              value={row.email}
                              onChange={(e) => {
                                updateRow(row.rowIndex, { email: e.target.value.trim() })
                              }}
                              onBlur={() => runValidation(rows)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                              value={row.first_name || ''}
                              onChange={(e) =>
                                updateRow(row.rowIndex, { first_name: e.target.value })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                              value={row.last_name || ''}
                              onChange={(e) =>
                                updateRow(row.rowIndex, { last_name: e.target.value })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            {ve.error_type === 'no_role' ? (
                              <select
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                                value={row.role_id || ''}
                                onChange={(e) => {
                                  const role = roles.find((r) => r.id === e.target.value)
                                  updateRow(row.rowIndex, {
                                    role_id: role?.id,
                                    role_name: role?.role_name,
                                    role_display_name: role?.role_display_name,
                                    isNewRole: false,
                                  })
                                  runValidation(rows)
                                }}
                              >
                                <option value="">Assign…</option>
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.role_display_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              row.role_display_name || row.role_name || '—'
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">{ve.message}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-xs text-red-600 dark:text-red-400"
                              onClick={() => {
                                updateRow(row.rowIndex, { selected: false })
                                runValidation(
                                  rows.map((r) =>
                                    r.rowIndex === row.rowIndex ? { ...r, selected: false } : r,
                                  ),
                                )
                              }}
                            >
                              Exclude
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]"
                onClick={() =>
                  downloadBlob(
                    generateErrorReportCsv(rows, validationErrors),
                    'bulk-invite-errors.csv',
                  )
                }
              >
                <Download className="h-4 w-4" />
                Download error report
              </button>
              <input
                ref={reuploadInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) applyFile(f, true)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px]"
                onClick={() => reuploadInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Re-upload corrected file
              </button>
              <button
                type="button"
                className="text-sm text-red-600 dark:text-red-400 min-h-[44px] px-2"
                onClick={excludeAllErrorRows}
              >
                Exclude all error rows
              </button>
              <button
                type="button"
                disabled={draftSaving}
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm min-h-[44px]"
              >
                <Save className="h-4 w-4" />
                {draftSaving ? 'Saving…' : 'Save draft'}
              </button>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(STEPS.UPLOAD)}
                className="inline-flex items-center gap-1 text-sm min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                disabled={blockingCount > 0}
                onClick={() => setStep(STEPS.REVIEW)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50 min-h-[44px]"
              >
                Proceed to review
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === STEPS.REVIEW && (
          <div className="space-y-4">
            {pendingNewRoles.filter((p) => !p.excluded).length > 0 ? (
              <div className="rounded-lg border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Unrecognised roles — confirm before sending
                </h3>
                {pendingNewRoles.map((p, i) => (
                  <div key={p.rawValue} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="font-mono text-amber-800 dark:text-amber-200">{p.rawValue}</span>
                    <span className="text-gray-500">→</span>
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                      {p.suggestedSlug || deriveRoleSlug(p.rawValue, roles.map((r) => r.role_name))}
                    </span>
                    <input
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
                      value={p.confirmedDisplayName ?? p.suggestedDisplayName ?? p.rawValue}
                      onChange={(e) => {
                        const next = [...pendingNewRoles]
                        next[i] = { ...p, confirmedDisplayName: e.target.value }
                        setPendingNewRoles(next)
                      }}
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={!!p.excluded}
                        onChange={(e) => {
                          const next = [...pendingNewRoles]
                          next[i] = { ...p, excluded: e.target.checked }
                          setPendingNewRoles(next)
                        }}
                      />
                      Exclude role
                    </label>
                  </div>
                ))}
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Confirmed roles are added to the global role library for future projects.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {roleSummary.map(([label, count]) => (
                <span
                  key={label}
                  className="inline-flex px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs"
                >
                  {label} ×{count}
                </span>
              ))}
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-2 py-2 w-8" />
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">First name</th>
                    <th className="px-3 py-2 text-left">Last name</th>
                    <th className="px-3 py-2 text-left">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewSort.sortedData(selectedValidRows).map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={
                        row.isNewRole
                          ? 'border-l-4 border-amber-400'
                          : ''
                      }
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={row.selected !== false}
                          onChange={(e) =>
                            updateRow(row.rowIndex, { selected: e.target.checked })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">{row.email}</td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                          value={row.first_name || ''}
                          onChange={(e) =>
                            updateRow(row.rowIndex, { first_name: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                          value={row.last_name || ''}
                          onChange={(e) =>
                            updateRow(row.rowIndex, { last_name: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        {row.isNewRole ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200">
                            New role: {row.role_display_name}
                          </span>
                        ) : (
                          <select
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                            value={row.role_id || ''}
                            onChange={(e) => {
                              const role = roles.find((r) => r.id === e.target.value)
                              updateRow(row.rowIndex, {
                                role_id: role?.id,
                                role_name: role?.role_name,
                                role_display_name: role?.role_display_name,
                                isNewRole: false,
                              })
                            }}
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.role_display_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(STEPS.VALIDATION)}
                className="inline-flex items-center gap-1 text-sm min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={draftSaving}
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm min-h-[44px]"
                >
                  <Save className="h-4 w-4" />
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={busy || selectedValidRows.length === 0}
                  onClick={handleSend}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50 min-h-[44px]"
                >
                  Send {selectedValidRows.length} invitation(s)
                </button>
              </div>
            </div>
          </div>
        )}

        {step === STEPS.SENDING && (
          <div className="space-y-4">
            {roleCreateStatus.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">Creating new roles…</p>
                <ul className="text-sm space-y-1">
                  {roleCreateStatus.map((r) => (
                    <li key={r.role_name}>
                      {r.role_display_name || r.role_name}: {r.status}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-sm">Sending invitations…</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    sendProgress.length
                      ? (sendProgress.filter((p) => p.status === 'sent' || p.status === 'failed' || p.status === 'skipped').length /
                          Math.max(selectedValidRows.length, 1)) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <ul className="text-xs max-h-48 overflow-y-auto space-y-1">
              {sendProgress.map((p) => (
                <li key={p.email}>
                  {p.email}: {p.status}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === STEPS.RESULTS && sendResults ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-1" />
                <div className="font-bold">{sendResults.sent}</div>
                <div>Sent</div>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                <XCircle className="h-6 w-6 mx-auto text-red-600 mb-1" />
                <div className="font-bold">{sendResults.failed}</div>
                <div>Failed</div>
              </div>
              <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
                <div className="font-bold">{sendResults.skipped}</div>
                <div>Skipped</div>
              </div>
            </div>

            <ExportListMenu
              columns={resultExportCols}
              data={resultExportData}
              baseFilename="bulk-invite-results"
            />

            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border text-sm min-h-[44px]"
                onClick={() => {
                  setStep(STEPS.UPLOAD)
                  setRows([])
                  setSendResults(null)
                  setSendProgress([])
                }}
              >
                Invite more
              </button>
              {onCancel ? (
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm min-h-[44px]"
                  onClick={onCancel}
                >
                  Back to team
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
