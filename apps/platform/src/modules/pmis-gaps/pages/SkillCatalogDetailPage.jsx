/**
 * Skill Catalog item — create/view/edit (GAP-11, v963 Phase 18), rule 65 + rule 63.1 Audit tab.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, BookMarked } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listCategories, getSkill, createSkill, updateSkill } from '../services/skillCatalogService'

export default function SkillCatalogDetailPage({ basePath = '/pm/resources/skills', forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const readOnly = !isCreate && !forceEdit
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [skill, setSkill] = useState(null)
  const [categories, setCategories] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [skillName, setSkillName] = useState('')
  const [skillCode, setSkillCode] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const accountId = await getCurrentUserAccountId()
    const cats = accountId ? await listCategories(accountId) : []
    setCategories(cats)

    if (isCreate) {
      setLoading(false)
      return
    }
    const row = await getSkill(id)
    if (!row) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setSkill(row)
    setSkillName(row.skill_name || '')
    setSkillCode(row.skill_code || '')
    setCategoryId(row.category_id || '')
    setDescription(row.description || '')
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    load()
  }, [load])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        skillName: skill?.skill_name || '',
        skillCode: skill?.skill_code || '',
        categoryId: skill?.category_id || '',
        description: skill?.description || '',
      }),
    [skill]
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false
    return JSON.stringify({ skillName, skillCode, categoryId, description }) !== baselineSnapshot
  }, [loading, readOnly, skillName, skillCode, categoryId, description, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved skill changes.')

  const goToList = () => navigate(basePath)
  const handleBack = () => confirmDiscard(goToList)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!skillName.trim()) {
      setError('Skill name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const accountId = await getCurrentUserAccountId()
      if (isCreate) {
        await createSkill({ accountId, categoryId: categoryId || null, skillName, skillCode, description })
        setSaving(false)
        showSuccess({ recordId: skillName.trim(), operation: 'created', message: `"${skillName.trim()}" was created successfully.`, onOk: goToList })
      } else {
        await updateSkill(id, { categoryId: categoryId || null, skillName, skillCode, description })
        setSaving(false)
        showSuccess({ recordId: skillName.trim(), operation: 'updated', message: `"${skillName.trim()}" was updated successfully.`, onOk: goToList })
      }
    } catch (err) {
      setSaving(false)
      setError(err?.message || String(err))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading skill…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Skill not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Skills Matrix</button>
      </div>
    )
  }

  const categoryName = categories.find((c) => c.id === categoryId)?.category_name || ''

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <BookMarked className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Create Skill' : readOnly ? 'View Skill' : 'Edit Skill'}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skill name *</label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Uncategorised</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code</label>
                  <input
                    type="text"
                    value={skillCode}
                    onChange={(e) => setSkillCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreate ? 'Create Skill' : 'Save Changes'}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this skill is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this skill is labelled and classified.">
                <AuditCard title="Identity" description="How this skill is labelled.">
                  <AuditField label="Skill name" value={skillName || skill?.skill_name} />
                  <AuditField label="Code" value={skillCode || '—'} />
                </AuditCard>
                <AuditCard title="Classification" description="Where this skill sits in the catalog.">
                  <AuditField label="Category" value={categoryName || 'Uncategorised'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this skill was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={skill?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={skill?.updated_at} />
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
