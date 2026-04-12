import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listMeetings, createMeeting, addTeamUpdate } from '../../services/scrumOfScrumsService'
import { supabase } from '../../services/supabaseClient'

export default function ScrumOfScrums() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [uid, setUid] = useState(null)
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [teamForm, setTeamForm] = useState({ team_name: '', accomplished: '', planned: '', impediments: '' })

  const load = async () => {
    if (!projectId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: u } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
      setMeetings(await listMeetings(projectId))
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const addMeeting = async (e) => {
    e.preventDefault()
    if (!projectId || !uid) return
    try {
      const m = await createMeeting({
        project_id: projectId,
        meeting_date: new Date().toISOString().slice(0, 10),
        facilitator_user_id: uid,
        notes: notes || null,
      })
      toast.success(`Meeting logged (id: ${m.id})`)
      setNotes('')
      load()
      setExpanded(m.id)
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }

  const addTeam = async (meetingId) => {
    if (!teamForm.team_name.trim()) return
    try {
      await addTeamUpdate({
        meeting_id: meetingId,
        team_name: teamForm.team_name,
        accomplished: teamForm.accomplished,
        planned: teamForm.planned,
        impediments: teamForm.impediments,
      })
      toast.success('Team update added')
      setTeamForm({ team_name: '', accomplished: '', planned: '', impediments: '' })
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }

  if (pidLoading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">Loading…</div>
  }
  if (pidErr === 'not_found' || !projectId) {
    return <div className="min-h-screen bg-gray-950 p-6 text-gray-300">Project not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-4">Scrum of Scrums</h1>
      <form onSubmit={addMeeting} className="mb-8 space-y-2 max-w-xl">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Meeting notes"
          className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm min-h-[80px]"
        />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Log meeting
        </button>
      </form>

      <ul className="space-y-4">
        {meetings.map((m) => (
          <li key={m.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex justify-between gap-2">
              <span className="font-semibold">{m.meeting_date}</span>
              <button type="button" className="text-sm text-blue-400" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                {expanded === m.id ? 'Hide' : 'Team updates'}
              </button>
            </div>
            {m.notes && <p className="text-sm text-gray-400 mt-2">{m.notes}</p>}
            {expanded === m.id && (
              <div className="mt-4 space-y-3 border-t border-gray-800 pt-3">
                {(m.sos_team_updates || []).map((u) => (
                  <div key={u.id} className="text-sm border border-gray-800 rounded p-2">
                    <div className="font-medium text-white">{u.team_name}</div>
                    <div>Done: {u.accomplished}</div>
                    <div>Next: {u.planned}</div>
                    <div>Blockers: {u.impediments}</div>
                  </div>
                ))}
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <input
                    placeholder="Team name"
                    value={teamForm.team_name}
                    onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                    className="rounded border border-gray-700 bg-gray-950 px-2 py-1"
                  />
                  <input
                    placeholder="Accomplished"
                    value={teamForm.accomplished}
                    onChange={(e) => setTeamForm({ ...teamForm, accomplished: e.target.value })}
                    className="rounded border border-gray-700 bg-gray-950 px-2 py-1"
                  />
                  <input
                    placeholder="Planned"
                    value={teamForm.planned}
                    onChange={(e) => setTeamForm({ ...teamForm, planned: e.target.value })}
                    className="rounded border border-gray-700 bg-gray-950 px-2 py-1"
                  />
                  <input
                    placeholder="Impediments"
                    value={teamForm.impediments}
                    onChange={(e) => setTeamForm({ ...teamForm, impediments: e.target.value })}
                    className="rounded border border-gray-700 bg-gray-950 px-2 py-1"
                  />
                  <button type="button" className="text-left text-blue-400" onClick={() => addTeam(m.id)}>
                    Add team update
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
