import { useState, useEffect, useMemo, useCallback } from 'react'
import { Download, Search, RotateCcw } from 'lucide-react'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { resolveLdeAccountForCurrentUser } from '../../local-data-extensions/utils/bootstrapLdeAccount'
import { isPmoAdmin } from '../../../services/organisationRoleService'
import { useInvitationTemplates, invalidateInvitationTemplatesCache } from '../hooks/useInvitationTemplates'
import { resetAllTemplatesToDefaults } from '../api/invitationTemplatesApi'
import { DEFAULT_INVITATION_MESSAGES_BY_ROLE } from '../constants/defaultInvitationMessages'
import RoleTemplateCard from '../components/RoleTemplateCard'
import TemplateVariablesHelper from '../components/TemplateVariablesHelper'
import { buildMockInvitationProjectContext } from '../../../services/invitationProjectContextService'
import ViewToggle from '../../../components/ui/ViewToggle'
import { useViewMode } from '../../../hooks/useViewMode'
import { useSortableTable, sortRowsByColumn } from '../../../hooks/useSortableTable'
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'
import { useToastContext } from '../../../context/ToastContext'

const STORAGE_SORT = 'nidus-invitation-templates-sort'

const SAMPLE_PREVIEW = {
  projectName: 'Sample Project Alpha',
  roleDisplayName: 'Project Manager',
  inviterName: 'Alex Inviter',
  organisationName: 'Sample Organisation Ltd',
  invitationExpiryDays: 14,
  projectContext: buildMockInvitationProjectContext(),
}

export default function InvitationTemplatesPage() {
  const { success: toastSuccess, error: toastError } = useToastContext()
  const [accountId, setAccountId] = useState(null)
  const [authUid, setAuthUid] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [roleRows, setRoleRows] = useState([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('invitation-templates-admin', 'grid')
  const [resettingAll, setResettingAll] = useState(false)

  const prefetchEnsure = !!(canEdit && authUid && accountId)

  const { templates, loading, error, refetch } = useInvitationTemplates({
    accountId,
    authUserId: authUid,
    prefetchEnsure,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPageLoading(true)
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (!user?.id) {
          if (!cancelled) {
            setAuthUid(null)
            setCanEdit(false)
          }
          return
        }
        if (!cancelled) setAuthUid(user.id)
        const pmo = await isPmoAdmin(user.id)
        if (!cancelled) setCanEdit(!!pmo)

        const { accountId: aid } = await resolveLdeAccountForCurrentUser()
        if (!cancelled) setAccountId(aid || null)

        const { data: pr, error: prErr } = await platformDb
          .from('project_roles')
          .select('role_name, role_display_name, role_level')
          .eq('is_template', true)
          .is('project_id', null)
          .eq('is_active', true)
          .order('role_level', { ascending: false })

        if (prErr) {
          console.error(prErr)
          if (!cancelled) setRoleRows([])
        } else if (!cancelled) {
          setRoleRows(pr || [])
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) toastError(e?.message || 'Failed to initialise page')
      } finally {
        if (!cancelled) setPageLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toastError])

  const mergedRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (roleRows || [])
      .map((role) => {
        const template =
          templates.find((t) => t.role_name === role.role_name) || null
        return { role, template }
      })
      .filter(({ role }) => {
        if (!q) return true
        return (
          String(role.role_name || '').toLowerCase().includes(q) ||
          String(role.role_display_name || '').toLowerCase().includes(q)
        )
      })
  }, [roleRows, templates, search])

  const { handleSort, getSortDirectionForColumn, sortColumn, sortDirection, defaultSort } =
    useSortableTable({
      defaultSort: { column: 'role_display_name', direction: 'asc' },
      storageKey: STORAGE_SORT,
    })

  const tableAccessors = useMemo(
    () => ({
      role_display_name: (row) => row.role?.role_display_name || row.role?.role_name,
      updated_at: (row) => row.template?.updated_at || row.template?.created_at || '',
      is_active: (row) => (row.template?.is_active !== false ? 1 : 0),
    }),
    [],
  )

  const sortedMerged = useMemo(
    () => sortRowsByColumn(mergedRows, sortColumn, sortDirection, tableAccessors, defaultSort),
    [mergedRows, sortColumn, sortDirection, tableAccessors, defaultSort],
  )

  const handleSaved = useCallback(() => {
    invalidateInvitationTemplatesCache(accountId)
    refetch()
  }, [accountId, refetch])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invitation-templates-${accountId || 'export'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = () => {
    const header = ['role_name', 'template_label', 'subject_line', 'is_active', 'updated_at', 'message_body']
    const lines = [header.join(',')]
    for (const t of templates) {
      lines.push(
        [
          JSON.stringify(t.role_name || ''),
          JSON.stringify(t.template_label || ''),
          JSON.stringify(t.subject_line || ''),
          t.is_active ? 'true' : 'false',
          JSON.stringify(t.updated_at || ''),
          JSON.stringify(t.message_body || ''),
        ].join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invitation-templates-${accountId || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleResetAll = async () => {
    if (!canEdit || !accountId || !authUid) return
    if (
      !window.confirm(
        'Reset all invitation templates to the system default messages? This cannot be undone.',
      )
    ) {
      return
    }
    setResettingAll(true)
    try {
      const res = await resetAllTemplatesToDefaults(accountId, authUid)
      if (!res.success) {
        toastError(res.error || 'Reset failed')
        return
      }
      invalidateInvitationTemplatesCache(accountId)
      await refetch()
      toastSuccess('All templates were reset to defaults.')
    } finally {
      setResettingAll(false)
    }
  }

  if (pageLoading || (accountId && loading && templates.length === 0 && !error)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  if (!accountId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-600 dark:text-gray-400">
        No organisation account could be resolved for your user. Invitation templates are available once you belong to
        an account.
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Invitation Message Templates
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-3xl">
          Configure the default message shown to inviters when selecting each role. Variables are filled when the
          invite form opens; inviters can still edit the text before sending.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="flex-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by role name…"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Templates layout" />
          <button
            type="button"
            onClick={exportJson}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={resettingAll}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {resettingAll ? 'Resetting…' : 'Reset all to defaults'}
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 max-w-xl">
        <TemplateVariablesHelper />
      </div>

      {!canEdit && (
        <p className="mb-6 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          You can view templates here. Only a PMO administrator can edit or reset defaults.
        </p>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mergedRows.map(({ role, template }) => {
            const synthetic =
              template ||
              (DEFAULT_INVITATION_MESSAGES_BY_ROLE[role.role_name]
                ? {
                    role_name: role.role_name,
                    template_label: DEFAULT_INVITATION_MESSAGES_BY_ROLE[role.role_name].template_label,
                    subject_line: DEFAULT_INVITATION_MESSAGES_BY_ROLE[role.role_name].subject_line,
                    message_body: DEFAULT_INVITATION_MESSAGES_BY_ROLE[role.role_name].message_body,
                    is_active: true,
                    id: null,
                  }
                : null)
            return (
              <RoleTemplateCard
                key={role.role_name}
                accountId={accountId}
                authUserId={authUid}
                roleMeta={role}
                template={synthetic}
                readOnly={!canEdit}
                samplePreviewContext={SAMPLE_PREVIEW}
                onSaved={handleSaved}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('role_display_name')}
                  onSort={() => handleSort('role_display_name')}
                >
                  Role
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('updated_at')}
                  onSort={() => handleSort('updated_at')}
                >
                  Last updated
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('is_active')}
                  onSort={() => handleSort('is_active')}
                >
                  Active
                </TableHeaderCell>
                <TableHeaderCell>Preview</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMerged.map(({ role, template }) => (
                <TableRow key={role.role_name}>
                  <TableCell className="font-medium">{role.role_display_name || role.role_name}</TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {template?.updated_at
                      ? new Date(template.updated_at).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell>{template?.is_active === false ? 'No' : 'Yes'}</TableCell>
                  <TableCell className="max-w-md truncate text-gray-500 dark:text-gray-400">
                    {(template?.message_body || '').slice(0, 120)}
                    {(template?.message_body || '').length > 120 ? '…' : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            Switch to card view to edit templates.
          </p>
        </div>
      )}
    </div>
  )
}
