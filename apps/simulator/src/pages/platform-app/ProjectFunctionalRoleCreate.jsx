/**
 * Create Project Role & Skills (v1084)
 * Route: /platform/project-roles/create
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'
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
  { value: 'details', label: 'Details' },
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

export default function ProjectFunctionalRoleCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId, routeKey, loading: projectLoading, error: projectError } =
    usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const roleSkillsRef = useRef(null)

  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [existingJson, setExistingJson] = useState('')
  const [newRolesJson, setNewRolesJson] = useState('')

  const isDirty = newRolesJson !== ''
  const { confirmDiscard, requestNavigation } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved Role & Skills drafts.',
  )

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
        if (rolesRes.success) setExistingJson(rolesToJson(rolesRes.data))
        else setExistingJson('')
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

  const goBack = () => {
    if (isDirty) confirmDiscard(() => navigate(listPath))
    else requestNavigation(listPath)
  }

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
    const effective = flush?.value ?? newRolesJson
    if (flush?.flushed) setNewRolesJson(effective)

    const check = validateRoleSkillsLinks(effective)
    if (!check.ok) {
      toast.error(check.error || 'Add at least one Role with Required Skills')
      return
    }
    if (!check.rows.length) {
      toast.error('Add at least one Role with Required Skills before saving')
      return
    }

    const existing = parseRoleSkillsLinks(existingJson)
    const byLabel = new Map(existing.map((r) => [r.role.toLowerCase(), r]))
    for (const row of check.rows) {
      byLabel.set(row.role.toLowerCase(), row)
    }
    const merged = [...byLabel.values()]

    setSaving(true)
    try {
      const res = await replaceProjectFunctionalRoles(projectId, merged)
      if (!res.success) {
        toast.error(res.error || 'Failed to save roles')
        return
      }
      showSuccess({
        recordId: projectCode || projectId,
        operation: 'created',
        message: `Added ${check.rows.length} Role${check.rows.length === 1 ? '' : 's'} to Project Roles & Skills.`,
        onOk: () => navigate(listPath),
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
          Select a project in the header to create Project Roles &amp; Skills.
        </p>
        <Link to={listPath} className="mt-2 inline-block text-sm text-sky-600 dark:text-sky-400 hover:underline">
          ← Project Roles &amp; Skills
        </Link>
      </div>
    )
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
          Create Role &amp; Skills
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {projectCode ? `${projectCode} · ` : ''}
          {projectName || 'Current project'}
        </p>
      </div>

      <DetailAuditTabList tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <form onSubmit={save} className="mt-4">
        {activeTab === 'details' && (
          <section className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6">
            <p className="text-xs text-gray-700 dark:text-gray-200">
              Add one or more Roles with Required Skills, then save to add them to this project
              catalog.
            </p>
            <RoleSkillsLinkTable
              ref={roleSkillsRef}
              value={newRolesJson}
              onChange={setNewRolesJson}
              viewModeId="project-functional-roles-create"
              showComposer
              emptyMessage="Use the form above to add a Role with Required Skills."
            />
            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 min-h-[44px]"
              >
                {saving ? 'Saving…' : 'Save Roles'}
              </button>
            </div>
          </section>
        )}

        {activeTab === 'audit' && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 text-sm text-gray-700 dark:text-gray-200">
            Audit details appear after Roles are saved to the project catalog.
          </div>
        )}
      </form>
    </div>
  )
}
