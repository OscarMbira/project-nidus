import { Routes, Route } from 'react-router-dom'
import ProcessTemplatesHub from '../../components/processTemplates/ProcessTemplatesHub'
import ProcessTemplatesDetail from '../../components/processTemplates/ProcessTemplatesDetail'
import ProcessTemplateListPage from './ProcessTemplateListPage'
import ProcessTemplateCreatePage from './ProcessTemplateCreatePage'
import ProcessTemplateEditPage from './ProcessTemplateEditPage'
import ProcessTemplateDetailPage from './ProcessTemplateDetailPage'
import { getHubBasePath } from '../../components/processTemplates/processTemplatesRegistry'

const SEG = {
  pmo: { roleKey: 'pmo', sim: false },
  pm: { roleKey: 'pm', sim: false },
  simPmo: { roleKey: 'simPmo', sim: true },
  simPm: { roleKey: 'simPm', sim: true },
}

function Section({ which }) {
  const c = SEG[which] || SEG.pm
  const basePath = getHubBasePath(c.roleKey)

  return (
    <Routes>
      <Route index element={<ProcessTemplatesHub roleKey={c.roleKey} basePath={basePath} />} />
      <Route
        path="t/:slug/new"
        element={<ProcessTemplateCreatePage roleKey={c.roleKey} basePath={basePath} sim={c.sim} />}
      />
      <Route
        path="t/:slug/:id/edit"
        element={<ProcessTemplateEditPage roleKey={c.roleKey} basePath={basePath} sim={c.sim} />}
      />
      <Route
        path="t/:slug/:id"
        element={<ProcessTemplateDetailPage roleKey={c.roleKey} sim={c.sim} />}
      />
      <Route
        path="t/:slug"
        element={<ProcessTemplateListPage roleKey={c.roleKey} basePath={basePath} sim={c.sim} />}
      />
      <Route path=":group" element={<ProcessTemplatesDetail roleKey={c.roleKey} basePath={basePath} />} />
    </Routes>
  )
}

export const ProcessTemplatesRoutesPmo = () => <Section which="pmo" />
export const ProcessTemplatesRoutesPm = () => <Section which="pm" />
export const ProcessTemplatesRoutesSimPmo = () => <Section which="simPmo" />
export const ProcessTemplatesRoutesSimPm = () => <Section which="simPm" />

export default ProcessTemplatesRoutesPm
