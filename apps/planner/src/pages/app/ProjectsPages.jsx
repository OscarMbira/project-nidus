/**
 * v1239 Slice 5.4 — Planner projects: list (Table/Card, search, sort, export via the shared
 * PlanningTable) and a routed "New project" page (rule 65) that calls planner_create_project.
 * Projects are edited in the full PMIS only; the Planner keeps project setup to name + start.
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Save } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import PlanningTable from '@nidus/planning/components/PlanningTable.jsx'
import BackButton from '@nidus/planning/components/BackButton.jsx'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import { useWorkspace } from '../../lib/workspace.jsx'
import { createProject } from '../../lib/plannerApi.js'

export function ProjectsListPage() {
  const navigate = useNavigate()
  const { projects, canManage, readOnly } = useWorkspace()
  return (
    <div className="px-3 sm:px-4 lg:px-6 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Projects</h1>
        {canManage && !readOnly && (
          <button type="button" onClick={() => navigate('/app/projects/new')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">
            <Plus className="h-4 w-4" /> New project
          </button>
        )}
      </div>
      <PlanningTable
        pageId="planner-projects"
        columns={[
          { key: 'project_name', label: 'Project' },
          { key: 'project_code', label: 'ID', render: (p) => <span className="font-mono text-blue-600 dark:text-blue-400">{p.project_code}</span> },
          { key: 'planned_start_date', label: 'Start' },
          { key: 'planned_end_date', label: 'Finish' },
        ]}
        rows={projects}
        exportName="Projects"
        searchPlaceholder="Search projects…"
        emptyText="No projects yet."
        actions={(p) => (
          <RowActionButton variant="view" label="Open schedule" onClick={() => navigate(`/app/schedule/activities?projectId=${encodeURIComponent(p.project_code || p.id)}`)} />
        )}
      />
    </div>
  )
}

const input = 'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

export function ProjectCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { reloadProjects, readOnly, canManage } = useWorkspace()
  const { showSuccess, modal } = useSuccessModal()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ name: '', startDate: today, description: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('details')
  const dirty = !saved && (form.name !== '' || form.description !== '' || form.startDate !== today)
  const { confirmDiscard } = useUnsavedChangesGuard(dirty, 'Leave without creating the project?')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Give the project a name.'); return }
    setBusy(true)
    setError(null)
    try {
      const created = await createProject(form)
      setSaved(true)
      await reloadProjects()
      const next = params.get('then') === 'import' ? 'exchange' : 'activities'
      showSuccess({
        recordId: created.project_code,
        operation: 'created',
        message: `"${form.name.trim()}" is ready.`,
        onOk: () => navigate(`/app/schedule/${next}?projectId=${encodeURIComponent(created.project_code)}`, { replace: true }),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!canManage || readOnly) {
    return <div className="p-6 text-sm text-gray-700 dark:text-gray-300">{readOnly ? 'Your trial has ended, so new projects cannot be created.' : 'Only the account owner or a project manager can create projects.'}</div>
  }

  return (
    <div className="max-w-2xl px-3 sm:px-4 lg:px-6 py-6">
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">New project</h1>
      <div className="mb-3"><DetailAuditTabList activeTab={tab} onChange={setTab} /></div>
      {tab === 'audit' ? (
        <p className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
      ) : (
      <form onSubmit={submit} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
        <label className="block text-sm">Project name *<input className={input} maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block text-sm">Start date<input type="date" className={input} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
        <label className="block text-sm">Description<textarea rows={3} className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => confirmDiscard(() => navigate(-1))} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? 'Creating…' : 'Create project'}</button>
        </div>
      </form>
      )}
      {modal}
    </div>
  )
}
