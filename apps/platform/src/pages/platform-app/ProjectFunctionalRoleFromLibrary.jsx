/**
 * Add from Built-in Roles (v1105) — pick roles from the same catalog Manage Roles clones from
 * (built-in + this organisation's own custom roles) and copy them into this project's Project
 * Roles & Skills catalog. Routed page, own URL (rule 65) — this is a bulk-selection utility over
 * many records at once, so it does not carry Export or an Audit tab (rule 63.1/65's own
 * exclusion for bulk-action/picker surfaces), but does use the standard sortable Table-List /
 * Card toggle with row numbers (rules 40/41/44) since it is still a list of individually
 * selectable rows.
 * Route: /platform/project-roles/from-library
 */
import { Fragment, useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Briefcase, LayoutGrid, List as ListIcon, Search } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { listProjectFunctionalRoles } from '../../services/teamService'
import { listRoleLibrary, addRolesFromLibrary } from '../../services/projectRoleLibraryService'
import { listProjectIndustries } from '../../services/projectIndustryService'
import { platformDb } from '../../services/supabase/supabaseClient'

const PAGE_SIZE = 20

export default function ProjectFunctionalRoleFromLibrary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId, routeKey, loading: projectLoading, error: projectError } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [library, setLibrary] = useState([])
  const [projectIndustries, setProjectIndustries] = useState([])
  const [existingLabels, setExistingLabels] = useState(new Set())
  const [search, setSearch] = useState('')
  const [industryFilters, setIndustryFilters] = useState([]) // v1106: multi-select, defaults to all of the project's industries
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode('project-roles-from-library', 'list')
  const [ticked, setTicked] = useState(new Map()) // roleId -> skills text

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'role_display_name', direction: 'asc' },
    storageKey: 'nidus-project-roles-from-library-sort',
  })

  const projectQuery = useMemo(() => {
    const fromRoute = routeKey || projectCode || projectId
    const fromUrl = searchParams.get('projectId')
    const key = fromUrl || fromRoute
    return key ? `?projectId=${encodeURIComponent(key)}` : ''
  }, [searchParams, routeKey, projectCode, projectId])

  const listPath = `/platform/project-roles${projectQuery}`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!projectId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [projRes, libraryRes, industriesRes, catalogRes] = await Promise.all([
          platformDb
            .from('projects')
            .select('id, project_name, project_code')
            .eq('id', projectId)
            .maybeSingle(),
          listRoleLibrary(),
          listProjectIndustries(projectId),
          listProjectFunctionalRoles(projectId),
        ])
        if (cancelled) return
        if (projRes.error) throw projRes.error
        setProjectName(projRes.data?.project_name || '')
        setProjectCode(projRes.data?.project_code || '')

        if (!libraryRes.success) toast.error(libraryRes.error || 'Failed to load role library')
        setLibrary(libraryRes.data || [])

        if (industriesRes.success) {
          setProjectIndustries(industriesRes.data)
          setIndustryFilters(industriesRes.data.map((r) => r.industry_category_id))
        }

        if (catalogRes.success) {
          setExistingLabels(
            new Set((catalogRes.data || []).map((r) => String(r.role_label || '').toLowerCase())),
          )
        }
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const isDirty = ticked.size > 0
  const { confirmDiscard, requestNavigation } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved role selections.',
  )

  const goBack = () => {
    if (isDirty) confirmDiscard(() => navigate(listPath))
    else requestNavigation(listPath)
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return library.filter((r) => {
      if (industryFilters.length > 0 && !industryFilters.includes(r.industry_category_id)) return false
      if (term && !String(r.role_display_name || '').toLowerCase().includes(term)) return false
      return true
    })
  }, [library, search, industryFilters])

  const sortAccessors = useMemo(() => ({
    role_display_name: (r) => r.role_display_name || '',
    industry: (r) => r.industry_category?.name || '',
    role_level: (r) => r.role_level ?? 0,
    created_at: (r) => r.created_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const isAlreadyAdded = (role) => existingLabels.has(String(role.role_display_name || '').toLowerCase())

  const toggleRole = (role) => {
    if (isAlreadyAdded(role)) return
    setTicked((prev) => {
      const next = new Map(prev)
      if (next.has(role.id)) next.delete(role.id)
      else next.set(role.id, role.role_skills || '')
      return next
    })
  }

  const setSkillsFor = (roleId, value) => {
    setTicked((prev) => {
      const next = new Map(prev)
      next.set(roleId, value)
      return next
    })
  }

  const tickedCount = ticked.size
  const everyTickedHasSkills = [...ticked.values()].every((v) => v.trim().length > 0)
  const canAdd = tickedCount > 0 && everyTickedHasSkills

  const handleAddSelected = async () => {
    if (!canAdd) return
    setSaving(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const { data: userRow } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle()

      const picks = [...ticked.entries()].map(([roleId, skills]) => {
        const role = library.find((r) => r.id === roleId)
        return {
          projectRoleId: roleId,
          roleName: role?.role_display_name || '',
          skills,
          isCustom: !!role?.account_id,
        }
      })

      const res = await addRolesFromLibrary(projectId, picks, userRow?.id || null)
      if (!res.success) {
        toast.error(res.error || 'Failed to add roles')
        return
      }
      showSuccess({
        recordId: projectCode || projectId,
        operation: 'created',
        message: `Added ${res.added} Role${res.added === 1 ? '' : 's'} to Project Roles & Skills.`,
        onOk: () => navigate(listPath),
      })
    } catch (err) {
      toast.error(err.message || 'Failed to add roles')
    } finally {
      setSaving(false)
    }
  }

  if (projectLoading || loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center min-h-[40vh] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
      </div>
    )
  }

  if (!projectId || projectError === 'missing') {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Select a project in the header to add roles from the library.
        </p>
        <Link to={listPath} className="mt-2 inline-block text-sm text-sky-600 dark:text-sky-400 hover:underline">
          ← Project Roles &amp; Skills
        </Link>
      </div>
    )
  }

  const toggleIndustryFilter = (industryCategoryId) => {
    setIndustryFilters((prev) =>
      prev.includes(industryCategoryId)
        ? prev.filter((id) => id !== industryCategoryId)
        : [...prev, industryCategoryId],
    )
    setPage(1)
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-6">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project Roles &amp; Skills
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-sky-500" />
          Add from Built-in Roles
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {projectCode ? `${projectCode} · ` : ''}
          {projectName || 'Current project'}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
          Tick a role, review or edit its Required Skills for this project, then add your selection to
          the project catalog. Roles already in this project are locked.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search roles…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        {projectIndustries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">Industry:</span>
            {projectIndustries.map((pi) => {
              const active = industryFilters.includes(pi.industry_category_id)
              return (
                <button
                  key={pi.industry_category_id}
                  type="button"
                  onClick={() => toggleIndustryFilter(pi.industry_category_id)}
                  className={`px-2.5 py-1 rounded-full text-xs border whitespace-nowrap ${
                    active
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {pi.industry?.name || 'Industry'}
                </button>
              )
            })}
            {industryFilters.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">(All industries)</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ml-auto">
          <button type="button" onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Table view">
            <ListIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button type="button" onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`} aria-label="Card view">
            <LayoutGrid className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No roles match your search.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-10">Add</th>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('role_display_name')} onSort={() => handleSort('role_display_name')} className="!normal-case whitespace-nowrap">
                  Role
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('industry')} onSort={() => handleSort('industry')} className="!normal-case whitespace-nowrap">
                  Industry
                </TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('role_level')} onSort={() => handleSort('role_level')} className="!normal-case whitespace-nowrap">
                  Level
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((role, index) => {
                const added = isAlreadyAdded(role)
                const isTicked = ticked.has(role.id)
                return (
                  <Fragment key={role.id}>
                    <tr className={added ? 'opacity-60' : ''}>
                      <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isTicked}
                          disabled={added}
                          onChange={() => toggleRole(role)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-sky-600"
                          aria-label={`Select ${role.role_display_name}`}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {role.role_display_name}
                        {role.account_id && (
                          <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                            Org role
                          </span>
                        )}
                        {added && (
                          <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            Already added
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{role.industry_category?.name || 'Cross-Industry'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{role.role_level ?? '—'}</td>
                    </tr>
                    {isTicked && (
                      <tr>
                        <td colSpan={5} className="px-3 pb-4 pt-0 bg-gray-50 dark:bg-gray-900/40">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Required skills for this project *
                          </label>
                          <MultiLineListInput
                            viewModeId={`project-roles-from-library-skills-${role.id}`}
                            id={`skills_${role.id}`}
                            value={ticked.get(role.id) || ''}
                            onChange={(v) => setSkillsFor(role.id, v)}
                            placeholder="e.g. Stakeholder Communication"
                            ariaLabelPrefix="skill"
                            itemColumnLabel="Skill"
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((role, index) => {
            const added = isAlreadyAdded(role)
            const isTicked = ticked.has(role.id)
            return (
              <div key={role.id} className={`p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 ${added ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
                  <input
                    type="checkbox"
                    checked={isTicked}
                    disabled={added}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-sky-600"
                    aria-label={`Select ${role.role_display_name}`}
                  />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{role.role_display_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {role.industry_category?.name || 'Cross-Industry'} · Level {role.role_level ?? '—'}
                  {role.account_id ? ' · Org role' : ''}
                </p>
                {added && <p className="text-xs text-gray-500 dark:text-gray-400">Already added</p>}
                {isTicked && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Required skills for this project *
                    </label>
                    <MultiLineListInput
                      viewModeId={`project-roles-from-library-skills-${role.id}`}
                      id={`skills_${role.id}`}
                      value={ticked.get(role.id) || ''}
                      onChange={(v) => setSkillsFor(role.id, v)}
                      placeholder="e.g. Stakeholder Communication"
                      ariaLabelPrefix="skill"
                      itemColumnLabel="Skill"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {tickedCount} role{tickedCount === 1 ? '' : 's'} selected
          {tickedCount > 0 && !everyTickedHasSkills ? ' — add at least one skill to each selected role' : ''}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={!canAdd || saving}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 min-h-[44px]"
          >
            {saving ? 'Adding…' : `Add ${tickedCount || ''} selected`}
          </button>
        </div>
      </div>
    </div>
  )
}
