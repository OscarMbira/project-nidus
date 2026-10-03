/**
 * Skill Requirement — create/view/edit (GAP-11, v963 Phase 18, Simulator port), rule 65 +
 * rule 63.1 Audit tab. Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/
 * SkillRequirementDetailPage.jsx. entity_type/entity_id are a simple polymorphic pair (free
 * text + id for v1), matching the underlying table's own generic design. No accountId — see
 * skillCatalogService.js header.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, BookMarked } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import { listSkills, getRequirement, createRequirement, updateRequirement, COMPETENCY_LEVELS } from '../services/skillCatalogService'

const ENTITY_TYPES = [
  { value: 'project_role', label: 'Project Role' },
  { value: 'task', label: 'Task' },
  { value: 'project', label: 'Project' },
]

export default function SkillRequirementDetailPage({ basePath = '/simulator/pm/resources/skills', forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const readOnly = !isCreate && !forceEdit
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [requirement, setRequirement] = useState(null)
  const [skills, setSkills] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [skillId, setSkillId] = useState('')
  const [entityType, setEntityType] = useState(ENTITY_TYPES[0].value)
  const [entityId, setEntityId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [requiredLevel, setRequiredLevel] = useState(3)

  const load = useCallback(async () => {
    setLoading(true)
    const skillRows = await listSkills()
    setSkills(skillRows)

    if (isCreate) {
      if (skillRows.length) setSkillId(skillRows[0].id)
      setLoading(false)
      return
    }
    const row = await getRequirement(id)
    if (!row) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setRequirement(row)
    setSkillId(row.skill_id || '')
    setEntityType(row.entity_type || ENTITY_TYPES[0].value)
    setEntityId(row.entity_id || '')
    setProjectId(row.project_id || '')
    setRequiredLevel(row.required_level || 3)
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    load()
  }, [load])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        skillId: requirement?.skill_id || '',
        entityType: requirement?.entity_type || '',
        entityId: requirement?.entity_id || '',
        projectId: requirement?.project_id || '',
        requiredLevel: requirement?.required_level || 3,
      }),
    [requirement]
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false
    return JSON.stringify({ skillId, entityType, entityId, projectId, requiredLevel }) !== baselineSnapshot
  }, [loading, readOnly, skillId, entityType, entityId, projectId, requiredLevel, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved skill requirement changes.')

  const goToList = () => navigate(`${basePath}/requirements`)
  const handleBack = () => confirmDiscard(goToList)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!skillId || !entityId.trim()) {
      setError('Skill and entity ID are required')
      return
    }
    setSaving(true)
    setError(null)
    const payload = { projectId: projectId || null, entityType, entityId: entityId.trim(), skillId, requiredLevel: Number(requiredLevel) }
    try {
      if (isCreate) {
        await createRequirement(payload)
        setSaving(false)
        showSuccess({ recordId: skills.find((s) => s.id === skillId)?.skill_name || 'Requirement', operation: 'created', message: 'Requirement was created successfully.', onOk: goToList })
      } else {
        await updateRequirement(id, payload)
        setSaving(false)
        showSuccess({ recordId: skills.find((s) => s.id === skillId)?.skill_name || 'Requirement', operation: 'updated', message: 'Requirement was updated successfully.', onOk: goToList })
      }
    } catch (err) {
      setSaving(false)
      setError(err?.message || String(err))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading requirement…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Requirement not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Requirements</button>
      </div>
    )
  }

  const skillName = skills.find((s) => s.id === skillId)?.skill_name || ''

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <BookMarked className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Create Skill Requirement' : readOnly ? 'View Skill Requirement' : 'Edit Skill Requirement'}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <fieldset disabled={readOnly} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skill *</label>
                <select
                  value={skillId}
                  onChange={(e) => setSkillId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a skill…</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>{s.skill_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Applies to</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Entity ID *</label>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    required
                    placeholder="Role name, task ID, or project ID"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project (optional)</label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="Practice project UUID"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required level</label>
                  <select
                    value={requiredLevel}
                    onChange={(e) => setRequiredLevel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {COMPETENCY_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreate ? 'Create Requirement' : 'Save Changes'}
                </button>
              )}
              <button type="button" onClick={handleBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                {readOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {isCreate ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this requirement is saved.</p>
            ) : (
              <AuditDetailsPanel description="What this requirement enforces.">
                <AuditCard title="Identity" description="What this requirement covers.">
                  <AuditField label="Skill" value={skillName} />
                  <AuditField label="Applies to" value={ENTITY_TYPES.find((t) => t.value === entityType)?.label} />
                </AuditCard>
                <AuditCard title="Classification" description="Scope and required level.">
                  <AuditField label="Entity ID" value={entityId} />
                  <AuditField label="Required level" value={requiredLevel} />
                </AuditCard>
                <AuditCard title="Record history" description="When this requirement was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={requirement?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={requirement?.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
