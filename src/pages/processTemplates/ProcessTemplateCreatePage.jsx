import { useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pause } from 'lucide-react'
import ProcessTemplateProjectScope, { useProcessTemplateScope } from '../../components/processTemplates/ProcessTemplateProjectScope'
import { useDraftQueue } from '../../hooks/useDraftQueue'
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
import { platformDb } from '../../services/supabase/supabaseClient'

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

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [isMaster, setIsMaster] = useState(canCreateMasterTemplate(roleKey))
  const [saving, setSaving] = useState(false)

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
        document_data: { notes: notes.trim() || '' },
        is_master: creatingMaster,
        status: 'draft',
        created_by: user?.id,
      }
      if (!creatingMaster) {
        if (sim) payload.practice_project_id = projectId
        else payload.project_id = projectId
      }
      const row = await svc.create(payload)
      toast.success(`Created ${template?.label}: ${row.reference_code || row.id}`)
      navigate(`${listPath}/${row.id}`)
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Link to={listPath} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to list
      </Link>
      <h1 className="text-xl font-bold text-gray-100">New {template.label}</h1>
      <ProcessTemplateProjectScope roleKey={roleKey} sim={sim} />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-700 bg-gray-900/50 p-5">
        <label className="block">
          <span className="text-sm text-gray-400">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400">Notes (document body)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 font-mono text-sm"
          />
        </label>
        {canCreateMasterTemplate(roleKey) && (
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} />
            Save as master template (PMO)
          </label>
        )}
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
          <Link to={listPath} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
