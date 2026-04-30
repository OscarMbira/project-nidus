import { Routes, Route } from 'react-router-dom'
import { TESTING_CENTRE } from '../../utils/testingCentrePaths'
import TestingDashboardPage from './TestingDashboardPage'
import TestCaseLibraryPage from './TestCaseLibraryPage'
import TestCaseCreatePage from './TestCaseCreatePage'
import TestCaseDetailPage from './TestCaseDetailPage'
import TestCaseEditPage from './TestCaseEditPage'
import TestCaseDraftsPage from './TestCaseDraftsPage'
import TestSuitesPage from './TestSuitesPage'
import TestSuiteCreatePage from './TestSuiteCreatePage'
import TestSuiteDetailPage from './TestSuiteDetailPage'
import TestEnvironmentsPage from './TestEnvironmentsPage'
import TestRunsPage from './TestRunsPage'
import TestRunCreatePage from './TestRunCreatePage'
import TestRunDetailPage from './TestRunDetailPage'
import AutomatedScriptsPage from './AutomatedScriptsPage'
import ScreenshotEvidencePage from './ScreenshotEvidencePage'
import DiagnosticCentrePage from './DiagnosticCentrePage'
import DiagnosticSessionCreatePage from './DiagnosticSessionCreatePage'
import DiagnosticSessionDetailPage from './DiagnosticSessionDetailPage'
import DefectsPage from './DefectsPage'
import DefectDetailPage from './DefectDetailPage'
import TestDataManagerPage from './TestDataManagerPage'
import TestingReportsPage from './TestingReportsPage'
import TestingCentreSettingsPage from './TestingCentreSettingsPage'

const SEG = {
  platform: { mode: 'platform', base: TESTING_CENTRE.platform, path: 'tcd-platform' },
  pm: { mode: 'platform', base: TESTING_CENTRE.pm, path: 'tcd-pm' },
  pmo: { mode: 'platform', base: TESTING_CENTRE.pmo, path: 'tcd-pmo' },
  sim: { mode: 'sim', base: TESTING_CENTRE.simulator, path: 'tcd-sim' },
  simPm: { mode: 'sim', base: TESTING_CENTRE.simPm, path: 'tcd-sim-pm' },
  simPmo: { mode: 'sim', base: TESTING_CENTRE.simPmo, path: 'tcd-sim-pmo' },
}

function Section({ which }) {
  const c = SEG[which] || SEG.platform
  return (
    <Routes>
      <Route index element={<TestingDashboardPage pathPrefix={c.base} viewKey={c.path} mode={c.mode} />} />
      <Route path="cases" element={<TestCaseLibraryPage pathPrefix={c.base} viewKey={`${c.path}-cases`} mode={c.mode} />} />
      <Route path="cases/new" element={<TestCaseCreatePage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="cases/drafts" element={<TestCaseDraftsPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="cases/:id" element={<TestCaseDetailPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="cases/:id/edit" element={<TestCaseEditPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="suites" element={<TestSuitesPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="suites/new" element={<TestSuiteCreatePage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="suites/:id" element={<TestSuiteDetailPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="settings/environments" element={<TestEnvironmentsPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="runs" element={<TestRunsPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="runs/new" element={<TestRunCreatePage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="runs/:id" element={<TestRunDetailPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="scripts" element={<AutomatedScriptsPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="evidence" element={<ScreenshotEvidencePage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="diagnostics" element={<DiagnosticCentrePage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="diagnostics/new" element={<DiagnosticSessionCreatePage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="diagnostics/:id" element={<DiagnosticSessionDetailPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="defects" element={<DefectsPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="defects/:id" element={<DefectDetailPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="data" element={<TestDataManagerPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="reports" element={<TestingReportsPage pathPrefix={c.base} mode={c.mode} />} />
      <Route path="settings" element={<TestingCentreSettingsPage pathPrefix={c.base} mode={c.mode} />} />
    </Routes>
  )
}

export const TestingCentreRoutesPlatform = () => <Section which="platform" />
export const TestingCentreRoutesPm = () => <Section which="pm" />
export const TestingCentreRoutesPmo = () => <Section which="pmo" />
export const TestingCentreRoutesSim = () => <Section which="sim" />
export const TestingCentreRoutesSimPm = () => <Section which="simPm" />
export const TestingCentreRoutesSimPmo = () => <Section which="simPmo" />

export default function TestingCentreRoutes() {
  return <Section which="platform" />
}
