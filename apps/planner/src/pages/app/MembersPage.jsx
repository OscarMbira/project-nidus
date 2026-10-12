/**
 * v1239 Slice 7.2 — project members and invitations (Planner). Owner / project manager can
 * invite by email (Project manager, Team member or Viewer), resend, cancel and remove. Seats are
 * checked by the database (planner_invite_member, plan limits).
 */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Copy } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { RowActionButton } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import PlanningTable from '@nidus/planning/components/PlanningTable.jsx'
import PlannerProjectBar from '../../components/PlannerProjectBar.jsx'
import { useWorkspace } from '../../lib/workspace.jsx'
import { ROLE_LABELS, sendInviteEmail } from '../../lib/inviteEmail.js'

const input = 'px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

export default function MembersPage() {
  const [params] = useSearchParams()
  const { projects, context, readOnly } = useWorkspace()
  const { showSuccess, modal } = useSuccessModal()
  const key = params.get('projectId') || ''
  const project = projects.find((p) => p.project_code === key || p.id === key)
  const [data, setData] = useState({ members: [], invitations: [], can_manage: false })
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'team_member' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [lastLink, setLastLink] = useState(null)

  const load = useCallback(async () => {
    if (!project) return
    setLoading(true)
    setError(null)
    const { data: res, error: rpcError } = await platformDb.rpc('planner_list_members', { p_project_id: project.id })
    if (rpcError) setError(rpcError.message)
    else setData(res)
    setLoading(false)
  }, [project])

  useEffect(() => { load() }, [load])

  const invite = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setLastLink(null)
    try {
      const { data: res, error: rpcError } = await platformDb.rpc('planner_invite_member', { p_project_id: project.id, p_email: form.email, p_role_name: form.role })
      if (rpcError) throw new Error(rpcError.message.replace(/^PLANNER_[A-Z_]+:\s*/, ''))
      const link = `${window.location.origin}/app/invite/${res.token}`
      setLastLink(link)
      try {
        await sendInviteEmail(form.email.trim(), { inviterName: context?.full_name, projectName: project.project_name, workspaceName: context?.account_name, roleName: form.role, link })
        showSuccess({ recordId: form.email.trim(), operation: 'created', message: `Invitation sent to ${form.email.trim()}.` })
      } catch (mailErr) {
        setError(mailErr.message)
      }
      setForm({ email: '', role: form.role })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.name} from ${project.project_name}?`)) return
    const { error: rpcError } = await platformDb.rpc('planner_remove_member', { p_project_id: project.id, p_user_id: m.user_id })
    if (rpcError) { setError(rpcError.message); return }
    showSuccess({ recordId: m.email, operation: 'deleted', message: `${m.name} was removed from the project.` })
    load()
  }

  const cancel = async (i) => {
    if (!window.confirm(`Cancel the invitation to ${i.email}?`)) return
    const { error: rpcError } = await platformDb.rpc('planner_cancel_invite', { p_invitation_id: i.id })
    if (rpcError) { setError(rpcError.message); return }
    showSuccess({ recordId: i.email, operation: 'deleted', message: 'Invitation cancelled.' })
    load()
  }

  const manage = data.can_manage && !readOnly

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Members</h1>
      <PlannerProjectBar />
      {!project ? null : loading ? <p className="text-sm text-gray-600 dark:text-gray-300">Loading members…</p> : (
        <>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {manage && (
            <form onSubmit={invite} className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <label className="text-sm flex-1 min-w-[14rem]">Email<input type="email" required className={`${input} mt-1 w-full`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="text-sm">Role
                <select className={`${input} mt-1 block`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"><Send className="h-4 w-4" /> {busy ? 'Inviting…' : 'Invite'}</button>
              {lastLink && (
                <button type="button" onClick={() => navigator.clipboard?.writeText(lastLink)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm" title={lastLink}>
                  <Copy className="h-4 w-4" /> Copy invite link
                </button>
              )}
            </form>
          )}
          <PlanningTable
            pageId="planner-members"
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role_name', label: 'Role', value: (m) => ROLE_LABELS[m.role_name] || m.role_name },
              { key: 'joined_at', label: 'Joined', value: (m) => String(m.joined_at || '').slice(0, 10) },
            ]}
            rows={data.members.map((m) => ({ ...m, id: m.user_id }))}
            exportName="ProjectMembers"
            emptyText="No members yet."
            actions={manage ? (m) => <RowActionButton variant="delete" label="Remove member" onClick={() => remove(m)} /> : null}
          />
          {data.invitations.length > 0 && (
            <>
              <h2 className="text-lg font-semibold">Waiting to accept</h2>
              <PlanningTable
                pageId="planner-invitations"
                columns={[
                  { key: 'email', label: 'Email' },
                  { key: 'role_name', label: 'Role', value: (i) => ROLE_LABELS[i.role_name] || i.role_name },
                  { key: 'expires_at', label: 'Link expires', value: (i) => String(i.expires_at || '').slice(0, 10) },
                ]}
                rows={data.invitations}
                exportName="PendingInvitations"
                actions={manage ? (i) => <RowActionButton variant="delete" label="Cancel invitation" onClick={() => cancel(i)} /> : null}
              />
            </>
          )}
        </>
      )}
      {modal}
    </div>
  )
}
