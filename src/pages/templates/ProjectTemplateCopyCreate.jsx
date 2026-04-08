import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createCopyFromMaster } from '../../services/projectTemplateCopyService'
import { getTemplateById } from '../../services/templateLibraryService'
import { listProjectsForOrganisation } from '../../services/eefService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'

const BASE = '/platform/templates'

export default function ProjectTemplateCopyCreate() {
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('templateId')
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [projects, setProjects] = useState([])
  const [masterTitle, setMasterTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      setAccountId(id)
      if (id) {
        const p = await listProjectsForOrganisation(id)
        setProjects(p.data || [])
      }
      if (templateId) {
        const { data } = await getTemplateById(templateId)
        setMasterTitle(data?.title || '')
        setTitle(data?.title ? `${data.title} (copy)` : '')
      }
    })()
  }, [templateId])

  const submit = async () => {
    if (!accountId || !templateId || !projectId || !title.trim()) {
      setErr('Organisation, template, project, and title are required')
      return
    }
    setSaving(true)
    setErr(null)
    const { data, error } = await createCopyFromMaster({
      accountId,
      projectId,
      templateId,
      title: title.trim(),
      isOnHold: false,
    })
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setSuccess({ id: data.id })
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
          <p className="text-green-800 dark:text-green-200 font-medium">Project template copy created.</p>
          <p className="text-sm text-gray-600 mt-2">ID: {success.id}</p>
          <button type="button" className="mt-6 px-4 py-2 rounded-lg bg-violet-600 text-white" onClick={() => navigate(`${BASE}/copies/${success.id}`)}>
            Open
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link to={BASE} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create project copy</h1>
      <p className="text-sm text-gray-600 mb-4">Master: {masterTitle || templateId || '—'}</p>
      {!templateId && <p className="text-amber-600 mb-4">Open from a template detail page (missing templateId).</p>}
      {err && <p className="text-red-600 mb-4">{err}</p>}
      <label className="block mb-4">
        <span className="text-sm">Project</span>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-h-[44px]"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name}
            </option>
          ))}
        </select>
      </label>
      <label className="block mb-4">
        <span className="text-sm">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>
      <button
        type="button"
        disabled={saving || !templateId}
        onClick={submit}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> Create
      </button>
    </div>
  )
}
