import { Routes, Route } from 'react-router-dom'
import FormsGallery from './FormsGallery'
import FormNew from './FormNew'
import FormEdit from './FormEdit'
import FormView from './FormView'
import FormTemplateAdmin from './FormTemplateAdmin'

function Section({ mode, projectBase }) {
  return (
    <Routes>
      <Route path=":projectId/forms" element={<FormsGallery mode={mode} basePath={projectBase} />} />
      <Route path=":projectId/forms/:templateCode/new" element={<FormNew mode={mode} basePath={projectBase} />} />
      <Route path=":projectId/forms/:formInstanceId/edit" element={<FormEdit mode={mode} />} />
      <Route path=":projectId/forms/:formInstanceId/view" element={<FormView mode={mode} />} />
      <Route path="/admin/form-templates" element={<FormTemplateAdmin mode={mode} />} />
    </Routes>
  )
}

export function PlatformFormsRoutes() {
  return <Section mode="platform" projectBase="/platform/projects" />
}

export function SimulatorFormsRoutes() {
  return <Section mode="sim" projectBase="/simulator/pm/projects" />
}
