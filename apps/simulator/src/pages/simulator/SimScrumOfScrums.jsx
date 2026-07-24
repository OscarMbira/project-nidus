import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listMeetings, createMeeting } from '../../services/simScrumOfScrumsService'
import { simDb, platformDb } from '../../services/supabase/supabaseClient'

export default function SimScrumOfScrums() {
  const { projectId } = useParams()
  const [meetings, setMeetings] = useState([])

  const load = async () => setMeetings(await listMeetings(projectId))

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [projectId])

  const add = async () => {
    const { data: { user } } = await simDb.auth.getUser()
    let uid = null
    if (user) {
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      uid = u?.id || null
    }
    if (!uid) return
    await createMeeting({
      practice_project_id: projectId,
      meeting_date: new Date().toISOString().slice(0, 10),
      facilitator_user_id: uid,
    })
    toast.success('Meeting created')
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Scrum of Scrums (sim)</h1>
      <button type="button" onClick={add} className="px-4 py-2 rounded bg-blue-600 text-sm mb-4">
        Log meeting
      </button>
      <ul className="text-sm space-y-2">
        {meetings.map((m) => (
          <li key={m.id} className="border border-gray-800 rounded p-2">
            {m.meeting_date}
          </li>
        ))}
      </ul>
    </div>
  )
}
