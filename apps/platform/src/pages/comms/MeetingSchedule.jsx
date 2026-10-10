import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAppRoutePrefix } from '@nidus/shared/hooks/useAppRoutePrefix'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { platformDb, simDb } from '@nidus/supabase'
import { useCurrentProject } from '../../context/CurrentProjectContext'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { useCommsApi } from './useCommsApi'

function statusLabel(status) {
  return String(status || 'scheduled').replace('_', ' ')
}

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function MeetingSchedule() {
  const navigate = useNavigate()
  const { meetingId } = useParams()
  const basePath = `${useAppRoutePrefix()}/comms`
  const { meeting, isSim } = useCommsApi()
  const { showSuccess, modal: successModal } = useSuccessModal()
  const { projects: assignedProjects, currentProjectId, loading: projectsLoading } = useCurrentProject()
  const { projectId: urlProjectId, loading: urlProjectLoading } = usePlatformProjectId()
  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [runs, setRuns] = useState([])
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [runId, setRunId] = useState('')
  const [start, setStart] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [baseline, setBaseline] = useState(null)
  const [tab, setTab] = useState('details')
  const [record, setRecord] = useState(null)
  const formKey = JSON.stringify({ title, start, projectId, runId })
  const isDirty = baseline != null && formKey !== baseline
  const { confirmBack } = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    ;(async () => {
      const aid = await getCurrentUserAccountId()
      setAccountId(aid)
      const { data: auth } = await platformDb.auth.getUser()
      if (!auth?.user) return
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
      setUserId(u?.id || null)
      if (!aid) return
      if (isSim) {
        const { data: r } = await simDb.from('simulation_runs').select('id, scenario_id').eq('user_id', auth.user.id).limit(50)
        setRuns(r || [])
      }
    })()
  }, [isSim])

  const projects = useMemo(() => (
    [...assignedProjects]
      .map((p) => ({
        id: p.projectId,
        project_name: p.projectName || '',
        project_code: p.projectCode || '',
      }))
      .filter((p) => p.id)
      .sort((a, b) => (a.project_name || a.project_code).localeCompare(b.project_name || b.project_code, undefined, { sensitivity: 'base' }))
  ), [assignedProjects])

  useEffect(() => {
    if (!meetingId) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await meeting.getMeeting(meetingId)
      if (cancelled) return
      if (error || !data) {
        setErr(error?.message || 'Meeting not found')
        return
      }
      const next = {
        title: data.title || '',
        start: toLocalInput(data.scheduled_start),
        projectId: data.project_id || '',
        runId: data.simulation_run_id || '',
      }
      setTitle(next.title)
      setStart(next.start)
      setProjectId(next.projectId)
      setRunId(next.runId)
      setRecord(data)
      setBaseline(JSON.stringify(next))
    })()
    return () => { cancelled = true }
  }, [meeting, meetingId])

  useEffect(() => {
    if (meetingId || projectsLoading || urlProjectLoading) return
    const ids = new Set(projects.map((p) => p.id))
    const chosen = (urlProjectId && ids.has(urlProjectId) && urlProjectId)
      || (currentProjectId && ids.has(currentProjectId) && currentProjectId)
      || (projects.length === 1 ? projects[0].id : '')
    setProjectId((prev) => prev || chosen || '')
    setBaseline((prev) => prev ?? JSON.stringify({ title: '', start: '', projectId: chosen || '', runId: '' }))
  }, [meetingId, projectsLoading, urlProjectLoading, projects, urlProjectId, currentProjectId])

  const finishSave = (data, operation) => {
    const saved = { title: title.trim(), start, projectId, runId }
    setTitle(saved.title)
    setRecord(data)
    setBaseline(JSON.stringify(saved))
    showSuccess({
      recordId: data.meeting_code || data.title,
      operation,
      message: operation === 'created' ? 'The meeting was scheduled.' : 'The meeting was updated.',
      onOk: () => navigate(`${basePath}/meetings/${data.id}`),
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    if (!meetingId && (!accountId || !userId)) return
    setSaving(true)
    setErr(null)
    try {
      if (meetingId) {
        const patch = isSim
          ? { title: title.trim(), scheduled_start: start || null, simulation_run_id: runId || null }
          : { title: title.trim(), scheduled_start: start || null, project_id: projectId || null }
        const { data, error } = await meeting.updateMeeting(meetingId, patch)
        if (error) throw error
        finishSave(data, 'updated')
      } else if (isSim) {
        const { data, error } = await meeting.createMeeting({
          accountId,
          simulationRunId: runId || null,
          title: title.trim(),
          scheduledStart: start || null,
          organisedByUserId: userId,
        })
        if (error) throw error
        finishSave(data, 'created')
      } else {
        const { data, error } = await meeting.createMeeting({
          accountId,
          projectId: projectId || null,
          title: title.trim(),
          scheduledStart: start || null,
          organisedByUserId: userId,
        })
        if (error) throw error
        finishSave(data, 'created')
      }
    } catch (ex) {
      setErr(ex.message || String(ex))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button
        type="button"
        onClick={() => confirmBack()}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{meetingId ? 'Edit meeting' : 'Schedule meeting'}</h1>
      <DetailAuditTabList activeTab={tab} onChange={setTab} />
      {tab === 'audit' ? (
        <div className="mt-4">
          {record ? (
            <AuditDetailsPanel>
              <AuditCard title="Identity">
                <AuditField label="Meeting" value={record.meeting_code || record.title} />
                <AuditField label="Title" value={record.title} />
              </AuditCard>
              <AuditCard title="Classification">
                <AuditField label="Status" value={statusLabel(record.status)} />
                <AuditField label="Type" value={record.meeting_type} />
                <AuditField label="Project" value={projects.find((p) => p.id === record.project_id)?.project_code || 'Not recorded'} />
              </AuditCard>
              <AuditCard title="Record history">
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditTimestampPair dateLabel="Updated at" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">Audit details appear after this record is saved.</p>
          )}
        </div>
      ) : (
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        {isSim ? (
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Simulation run (optional)
            <select value={runId} onChange={(e) => setRunId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
              <option value="">—</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Project (optional)
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2">
              <option value="">—</option>
              {projects.map((p) => {
                const code = String(p.project_code || '').trim()
                const name = String(p.project_name || '').trim()
                const label = code && name && !name.startsWith(code) ? `${code} — ${name}` : (name || code)
                return (
                  <option key={p.id} value={p.id}>
                    {label}
                  </option>
                )
              })}
            </select>
          </label>
        )}
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Start
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-lg bg-cyan-600 text-white font-medium disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Saving…' : (meetingId ? 'Save meeting' : 'Create meeting')}
        </button>
      </form>
      )}
      {successModal}
    </div>
  )
}
