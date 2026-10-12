/**
 * Project Roles & Skills catalog — list (v1084)
 * Route: /platform/project-roles
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Briefcase, Plus } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import {
  parseRoleSkillsLinks,
  serializeRoleSkillsLinks,
  validateRoleSkillsLinks,
} from '@nidus/shared/utils/roleSkillsUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import RoleSkillsLinkTable from '../../components/teams/RoleSkillsLinkTable'
import {
  listProjectFunctionalRoles,
  replaceProjectFunctionalRoles,
} from '../../services/teamService'
import { platformDb } from '../../services/supabase/supabaseClient'

const TABS = [
  { value: 'details', label: 'Roles & Skills' },
  { value: 'audit', label: 'Audit Details' },
]

function rolesToJson(rows) {
  return serializeRoleSkillsLinks(
    (rows || []).map((r) => ({
      role: r.role_label || r.role || '',
      skills: r.required_skills || r.skills || '',
    })),
  )
}

export default function ProjectFunctionalRolesPage() {
  const { projectId, routeKey, loading: projectLoading, error: projectError } =
    usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const { showSuccess, modal } = useSuccessModal()
  const roleSkillsRef = useRef(null)

  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [roleSkillsJson, setRoleSkillsJson] = useState('')
  const [baseline, setBaseline] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)

  const isDirty = baseline !== '' && roleSkillsJson !== baseline
  const { confirmDiscard, requestNavigation } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to Project Roles & Skills.',
  )

  const projectQuery = useMemo(() => {
    const fromRoute = routeKey || projectCode || projectId
    const fromUrl = searchParams.get('projectId')
    const key = fromUrl || fromRoute
    return key ? `?projectId=${encodeURIComponent(key)}` : ''
  }, [searchParams, routeKey, projectCode, projectId])

  const createPath = `/platform/project-roles/create${projectQuery}`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!projectId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [projRes, rolesRes] = await Promise.all([
          platformDb
            .from('projects')
            .select('id, project_name, project_code')
            .eq('id', projectId)
            .maybeSingle(),
          listProjectFunctionalRoles(projectId),
        ])
        if (cancelled) return
        if (projRes.error) throw projRes.error
        setProjectName(projRes.data?.project_name || '')
        setProjectCode(projRes.data?.project_code || '')
        if (!rolesRes.success) {
          toast.error(rolesRes.error || 'Failed to load Project Roles & Skills')
          setRoleSkillsJson('')
          setBaseline('')
        } else {
          const json = rolesToJson(rolesRes.data)
          setRoleSkillsJson(json)
          setBaseline(json)
          const latest = (rolesRes.data || [])
            .map((r) => r.updated_at || r.created_at)
            .filter(Boolean)
            .sort()
            .pop()
          setLastSavedAt(latest || null)
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

  const roleCount = useMemo(() => parseRoleSkillsLinks(roleSkillsJson).length, [roleSkillsJson])

  const save = async (e) => {
    e?.preventDefault?.()
    if (!projectId) {
      toast.error('Select a project in the header first')
      return
    }
    const flush = roleSkillsRef.current?.flushPendingDraft?.()
    if (flush && !flush.ok) {
      toast.error(flush.error || 'Fix Role and Skill associations')
      return
    }
    const effective = flush?.value ?? roleSkillsJson
    if (flush?.flushed) setRoleSkillsJson(effective)

    const check = validateRoleSkillsLinks(effective)
    if (!check.ok) {
      toast.error(check.error || 'Fix Role and Skill associations')
      return
    }

    setSaving(true)
    try {
      const res = await replaceProjectFunctionalRoles(projectId, check.rows)
      if (!res.success) {
        toast.error(res.error || 'Failed to save roles')
        return
      }
      const json = rolesToJson(res.data)
      setRoleSkillsJson(json)
      setBaseline(json)
      setLastSavedAt(new Date().toISOString())
      showSuccess({
        recordId: projectCode || projectId,
        operation: 'updated',
        message: `Project Roles & Skills updated (${check.rows.length} role${check.rows.length === 1 ? '' : 's'}).`,
      })
    } catch (err) {
      toast.error(err.message || 'Failed to save roles')
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
          Select a project in the header to manage Project Roles &amp; Skills.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-sky-500" />
            Project Roles &amp; Skills
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {projectCode ? `${projectCode} · ` : ''}
            {projectName || 'Current project'}
            {roleCount ? ` · ${roleCount} Role${roleCount === 1 ? '' : 's'}` : ''}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
            Delivery Roles and Required Skills for this project. Team member assignments use this
            catalog (not organisation access roles).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={createPath}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium min-h-[44px]"
            onClick={(e) => {
              if (isDirty) {
                e.preventDefault()
                confirmDiscard(() => requestNavigation(createPath))
              }
            }}
          >
            <Plus className="h-4 w-4" />
            Create Role &amp; Skills
          </Link>
          <Link
            to={`/platform/teams${projectQuery}`}
            className="text-sm text-sky-600 dark:text-sky-400 hover:underline px-2"
            onClick={(e) => {
              if (isDirty) {
                e.preventDefault()
                confirmDiscard(() => requestNavigation(`/platform/teams${projectQuery}`))
              }
            }}
          >
            Back to Teams
          </Link>
        </div>
      </div>

      <DetailAuditTabList tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <form onSubmit={save} className="mt-4">
        {activeTab === 'details' && (
          <section className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6">
            <RoleSkillsLinkTable
              ref={roleSkillsRef}
              value={roleSkillsJson}
              onChange={setRoleSkillsJson}
              viewModeId="project-functional-roles"
              showComposer={false}
              emptyMessage="No Roles yet. Use Create Role & Skills to add the first one."
            />
            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isDirty) confirmDiscard(() => setRoleSkillsJson(baseline))
                  else setRoleSkillsJson(baseline)
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 min-h-[44px]"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 min-h-[44px]"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </section>
        )}

        {activeTab === 'audit' && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <p>
              <span className="font-medium text-gray-900 dark:text-gray-100">Project:</span>{' '}
              {projectCode || projectId}
              {projectName ? ` — ${projectName}` : ''}
            </p>
            <p>
              <span className="font-medium text-gray-900 dark:text-gray-100">Active Roles:</span>{' '}
              {roleCount}
            </p>
            <p>
              <span className="font-medium text-gray-900 dark:text-gray-100">Last Saved:</span>{' '}
              {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : '—'}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
