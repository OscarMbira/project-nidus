import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listPairSessions, createPairSession } from '../../services/xpPairSessionService'
import { listCodeReviews, saveCodeReview } from '../../services/xpCodeReviewService'
import { listCIBuilds, createCIBuild } from '../../services/xpCIBuildService'
import { supabase } from '../../services/supabaseClient'

export default function XPDashboard() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [tab, setTab] = useState('pair')
  const [pairs, setPairs] = useState([])
  const [reviews, setReviews] = useState([])
  const [builds, setBuilds] = useState([])
  const [stories, setStories] = useState([])
  const [uid, setUid] = useState(null)

  const load = async () => {
    if (!projectId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: u } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
      const [p, r, b, st] = await Promise.all([
        listPairSessions(projectId),
        listCodeReviews(projectId),
        listCIBuilds(projectId),
        supabase
          .from('user_stories')
          .select('id, story_title, tdd_followed')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .then(({ data }) => data || []),
      ])
      setPairs(p)
      setReviews(r)
      setBuilds(b)
      setStories(st)
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const toggleTdd = async (story) => {
    try {
      await supabase
        .from('user_stories')
        .update({ tdd_followed: !story.tdd_followed })
        .eq('id', story.id)
      toast.success(`Story ${story.id}: TDD ${!story.tdd_followed ? 'on' : 'off'}`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  if (pidLoading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">Loading…</div>
  }
  if (pidErr === 'not_found' || !projectId) {
    return <div className="min-h-screen bg-gray-950 p-6 text-gray-300">Project not found.</div>
  }

  const tddRate = stories.length
    ? Math.round((stories.filter((s) => s.tdd_followed).length / stories.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-4">XP dashboard</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {['pair', 'reviews', 'ci', 'tdd'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-sm capitalize ${tab === t ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            {t === 'ci' ? 'CI' : t}
          </button>
        ))}
      </div>

      {tab === 'pair' && (
        <PairTab projectId={projectId} uid={uid} pairs={pairs} onRefresh={load} />
      )}
      {tab === 'reviews' && (
        <ReviewsTab projectId={projectId} uid={uid} reviews={reviews} onRefresh={load} />
      )}
      {tab === 'ci' && (
        <CiTab projectId={projectId} builds={builds} onRefresh={load} />
      )}
      {tab === 'tdd' && (
        <div className="space-y-4">
          <p className="text-emerald-400">TDD adoption: {tddRate}%</p>
          <ul className="space-y-2">
            {stories.map((s) => (
              <li key={s.id} className="flex justify-between gap-2 rounded border border-gray-800 p-2 text-sm">
                <span>{s.story_title}</span>
                <button type="button" className="text-blue-400" onClick={() => toggleTdd(s)}>
                  {s.tdd_followed ? 'TDD ✓' : 'Mark TDD'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PairTab({ projectId, uid, pairs, onRefresh }) {
  const [driver, setDriver] = useState('')
  const [nav, setNav] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!driver || !nav || !uid) {
      toast.error('Select driver and navigator user IDs')
      return
    }
    try {
      await createPairSession({
        project_id: projectId,
        driver_user_id: driver,
        navigator_user_id: nav,
        session_date: new Date().toISOString().slice(0, 10),
      })
      toast.success('Pair session logged')
      onRefresh()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }
  return (
    <div>
      <form onSubmit={submit} className="mb-6 space-y-2 max-w-md">
        <p className="text-xs text-gray-500">Enter user UUIDs from your team directory.</p>
        <input placeholder="Driver user id" value={driver} onChange={(e) => setDriver(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <input placeholder="Navigator user id" value={nav} onChange={(e) => setNav(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Log session
        </button>
      </form>
      <ul className="text-sm space-y-2">
        {pairs.map((p) => (
          <li key={p.id} className="border border-gray-800 rounded p-2">
            {p.session_date} — driver {p.driver_user_id?.slice(0, 8)}…
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReviewsTab({ projectId, uid, reviews, onRefresh }) {
  const [author, setAuthor] = useState('')
  const [reviewer, setReviewer] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!author || !reviewer || !uid) return
    try {
      await saveCodeReview({
        project_id: projectId,
        author_user_id: author,
        reviewer_user_id: reviewer,
        review_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
      })
      toast.success('Review logged')
      onRefresh()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }
  return (
    <div>
      <form onSubmit={submit} className="mb-6 space-y-2 max-w-md">
        <input placeholder="Author user id" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <input placeholder="Reviewer user id" value={reviewer} onChange={(e) => setReviewer(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Add review
        </button>
      </form>
      <ul className="text-sm space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className="border border-gray-800 rounded p-2">
            {r.review_date} — {r.status}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CiTab({ projectId, builds, onRefresh }) {
  const [status, setStatus] = useState('passing')
  const submit = async (e) => {
    e.preventDefault()
    try {
      await createCIBuild({ project_id: projectId, status, build_date: new Date().toISOString() })
      toast.success('Build recorded')
      onRefresh()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }
  const passRate = builds.length
    ? Math.round((builds.filter((b) => b.status === 'passing').length / builds.length) * 100)
    : 0
  return (
    <div>
      <p className="text-emerald-400 mb-4">Pass rate (sample): {passRate}%</p>
      <form onSubmit={submit} className="mb-6 flex gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm">
          <option value="passing">passing</option>
          <option value="failing">failing</option>
          <option value="unstable">unstable</option>
        </select>
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Log build
        </button>
      </form>
      <ul className="text-sm space-y-2">
        {builds.map((b) => (
          <li key={b.id} className="border border-gray-800 rounded p-2">
            {b.build_date} — {b.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
