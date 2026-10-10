import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pause } from 'lucide-react'
import ProcessTemplateProjectScope, { useProcessTemplateScope } from '../../components/processTemplates/ProcessTemplateProjectScope'
import { useDraftQueue } from '@nidus/shared/hooks/useDraftQueue'
import {
  getTemplateBySlug,
  roleKeyFromPath,
  isSimRoleKey,
  getTemplateListPath,
} from '../../components/processTemplates/processTemplatesRegistry'
import {
  getTemplateService,
  canCreateMasterTemplate,
} from '../../services/processTemplatesService'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import ProcurementPlanFields, { emptyProcurementPlan, normalizeProcurementPlan, PROCUREMENT_PLAN_TABS } from '../../components/processTemplates/ProcurementPlanFields'

export default function ProcessTemplateCreatePage({ roleKey: roleKeyProp, basePath, sim: simProp }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const template = getTemplateBySlug(slug)
  const roleKey = roleKeyProp || roleKeyFromPath(location.pathname)
  const sim = simProp ?? isSimRoleKey(roleKey)
  const { masterCatalog, projectId } = useProcessTemplateScope(roleKey)
  const listPath = getTemplateListPath(roleKey, slug)
  const entityType = `process_template_${slug.replace(/-/g, '_')}`

  const isProcurementPlan = slug === 'procurement-management-plan'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [planData, setPlanData] = useState(() => emptyProcurementPlan())
  const [isMaster, setIsMaster] = useState(canCreateMasterTemplate(roleKey))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const { showSuccess, modal: successModal } = useSuccessModal()
  const planDirty = isProcurementPlan
    && JSON.stringify(normalizeProcurementPlan(planData)) !== JSON.stringify(emptyProcurementPlan())
  const isDirty = !saved && Boolean(title.trim() || description.trim() || notes.trim() || planDirty || isMaster !== canCreateMasterTemplate(roleKey))
  const { confirmBack, requestNavigation } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes on this template.')

  const { saveDraft, saveStatus } = useDraftQueue(entityType, null, {
    projectId: projectId || undefined,
    formRoute: `${listPath}/new`,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const creatingMaster = isMaster && canCreateMasterTemplate(roleKey)
    if (!creatingMaster && !projectId) {
      toast.error('Select a project first')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const svc = getTemplateService(slug, { sim })
      const payload = {
        title: title.trim() || 'Untitled',
        description: description.trim() || null,
        document_data: isProcurementPlan
          ? { ...normalizeProcurementPlan(planData), notes: notes.trim() }
          : { notes: notes.trim() || '' },
        is_master: creatingMaster,
        status: 'draft',
        created_by: user?.id,
      }
      if (!creatingMaster) {
        if (sim) payload.practice_project_id = projectId
        else payload.project_id = projectId
      }
      let row = await svc.create(payload)
      if (!row.reference_code) row = await svc.getById(row.id)
      setSaved(true)
      showSuccess({
        recordId: row.reference_code || row.title,
        operation: 'created',
        message: `${template?.label || 'Template'} created.`,
        onOk: () => navigate(`${listPath}/${row.reference_code || row.id}`),
      })
    } catch (err) {
      toast.error(err?.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const handleHold = async () => {
    try {
      await saveDraft(
        { title, description, notes, is_master: isMaster, project_id: projectId },
        null,
        { projectId, entityTitle: title || template?.label, formRoute: `${listPath}/new` }
      )
      toast.success('Draft saved to hold queue')
      navigate(listPath)
    } catch (err) {
      toast.error(err?.message || 'Could not save draft')
    }
  }

  if (!template || template.kind !== 'new') {
    return <div className="p-6 text-gray-400">Template not found.</div>
  }

  return (
    <div className={`w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 mx-auto space-y-4 ${isProcurementPlan ? 'max-w-5xl' : 'max-w-3xl'}`}>
      <button
        type="button"
        onClick={() => confirmBack()}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">New {template.label}</h1>
      <ProcessTemplateProjectScope roleKey={roleKey} sim={sim} />

      <DetailAuditTabList
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Template sections"
        tabs={isProcurementPlan ? PROCUREMENT_PLAN_TABS : undefined}
      />

      {activeTab === 'audit' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this template is saved.</p>
      )}

      {(activeTab === 'details' || (isProcurementPlan && activeTab !== 'audit')) && (
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-5">
        {activeTab !== 'details' && (
          <ProcurementPlanFields section={activeTab} value={planData} onChange={setPlanData} />
        )}
        {activeTab === 'details' && (<>
        <label className="block">
          <span className="text-sm text-gray-400">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700 dark:text-gray-300">{isProcurementPlan ? 'Additional notes' : 'Notes'}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </label>
        {canCreateMasterTemplate(roleKey) && (
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} />
            Save as master template (PMO)
          </label>
        )}
        </>)}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={handleHold}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 text-sm hover:bg-amber-900/30"
          >
            <Pause className="h-4 w-4" />
            Put on hold {saveStatus === 'saving' ? '…' : ''}
          </button>
          <button
            type="button"
            onClick={() => requestNavigation(listPath)}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
      )}
      {successModal}
    </div>
  )
}
