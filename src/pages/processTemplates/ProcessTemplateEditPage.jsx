import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pause } from 'lucide-react'
import {
  getTemplateBySlug,
  getHubBasePath,
  roleKeyFromPath,
  isSimRoleKey,
  getTemplateListPath,
} from '../../components/processTemplates/processTemplatesRegistry'
import {
  getTemplateService,
  canEditMasterTemplate,
  canCreateMasterTemplate,
} from '../../services/processTemplatesService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useDraftQueue } from '../../hooks/useDraftQueue'

export default function ProcessTemplateEditPage({ roleKey: roleKeyProp, basePath, sim: simProp }) {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const template = getTemplateBySlug(slug)
  const roleKey = roleKeyProp || roleKeyFromPath(location.pathname)
  const sim = simProp ?? isSimRoleKey(roleKey)
  const listPath = getTemplateListPath(roleKey, slug)
  const entityType = `process_template_${slug.replace(/-/g, '_')}`
  const [row, setRow] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)

  const { saveDraft } = useDraftQueue(entityType, id, {
    projectId: row?.project_id || row?.practice_project_id,
    formRoute: `${listPath}/${id}/edit`,
  })

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const svc = getTemplateService(slug, { sim })
        const data = await svc.getById(id)
        if (!cancelled) {
          setRow(data)
          setTitle(data.title || '')
          setDescription(data.description || '')
          setNotes(data.document_data?.notes || '')
          setStatus(data.status || 'draft')
        }
      } catch (e) {
        toast.error(e?.message || 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, id, sim])

  if (!template || template.kind !== 'new') {
    return <div className="p-6 text-gray-400">Template not found.</div>
  }

  if (loading) return <p className="p-6 text-gray-500">Loading…</p>
  if (!row) return <p className="p-6 text-gray-500">Record not found.</p>

  if (!canEditMasterTemplate(roleKey, row, userId)) {
    return (
      <div className="p-6 text-gray-400">
        You cannot edit this record.
        <Link to={`${listPath}/${id}`} className="block text-blue-400 mt-2">View read-only</Link>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const svc = getTemplateService(slug, { sim })
      const updated = await svc.update(id, {
        title: title.trim(),
        description: description.trim() || null,
        document_data: { ...(row.document_data || {}), notes: notes.trim() },
        status,
        updated_by: userId,
      })
      toast.success(`Updated ${updated.reference_code || updated.id}`)
      navigate(`${listPath}/${id}`)
    } catch (err) {
      toast.error(err?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleHold = async () => {
    try {
      const svc = getTemplateService(slug, { sim })
      await svc.setOnHold(id)
      await saveDraft({ title, description, notes, status }, id)
      toast.success('Record on hold; draft saved')
      navigate(listPath)
    } catch (err) {
      toast.error(err?.message || 'Hold failed')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Link to={`${listPath}/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to detail
      </Link>
      <h1 className="text-xl font-bold text-gray-100">Edit {template.label}</h1>

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
          <span className="text-sm text-gray-400">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 font-mono text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
          </select>
        </label>
        {row.is_master && !canCreateMasterTemplate(roleKey) && (
          <p className="text-xs text-amber-400">This is a master template — read-only for your role.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={handleHold}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 text-sm"
          >
            <Pause className="h-4 w-4" />
            Put on hold
          </button>
        </div>
      </form>
    </div>
  )
}
