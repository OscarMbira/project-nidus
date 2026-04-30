import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FormTemplateGallery from '../../components/forms/FormTemplateGallery'
import DraftFormQueue from '../../components/forms/DraftFormQueue'
import { getFormTemplates, getFormsByProject } from '../../services/formEngineService'

export default function FormsGallery({ mode = 'platform', basePath = '/platform/projects' }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [instances, setInstances] = useState([])

  useEffect(() => {
    getFormTemplates(undefined, mode).then((r) => r.success && setTemplates(r.data))
    if (projectId) getFormsByProject(projectId, {}, mode).then((r) => r.success && setInstances(r.data))
  }, [projectId, mode])

  return (
    <div className="space-y-4 p-4 text-gray-100">
      <h1 className="text-lg font-semibold">Process Group Forms</h1>
      <FormTemplateGallery
        templates={templates}
        onSelect={(t) => navigate(`${basePath}/${projectId}/forms/${t.template_code}/new`)}
      />
      <DraftFormQueue drafts={instances.filter((x) => x.status === 'draft')} onResume={(d) => navigate(`${basePath}/${projectId}/forms/${d.id}/edit`)} />
    </div>
  )
}
