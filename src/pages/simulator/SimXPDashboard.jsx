import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listPairSessions, createPairSession } from '../../services/simXpPairSessionService'
import { listCodeReviews, saveCodeReview } from '../../services/simXpCodeReviewService'
import { listCIBuilds, createCIBuild } from '../../services/simXpCIBuildService'
import { simDb, platformDb } from '../../services/supabase/supabaseClient'

export default function SimXPDashboard() {
  const { projectId } = useParams()
  const [tab, setTab] = useState('pair')
  const [pairs, setPairs] = useState([])
  const [reviews, setReviews] = useState([])
  const [builds, setBuilds] = useState([])

  const load = async () => {
    const [p, r, b] = await Promise.all([
      listPairSessions(projectId),
      listCodeReviews(projectId),
      listCIBuilds(projectId),
    ])
    setPairs(p)
    setReviews(r)
    setBuilds(b)
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [projectId])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">XP dashboard (sim)</h1>
      <div className="flex gap-2 mb-4">
        {['pair', 'reviews', 'ci', 'tdd'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-1 rounded text-sm ${tab === t ? 'bg-blue-600' : 'bg-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'pair' && <SimPair projectId={projectId} pairs={pairs} onRefresh={load} />}
      {tab === 'reviews' && <SimRev projectId={projectId} reviews={reviews} onRefresh={load} />}
      {tab === 'ci' && <SimCi projectId={projectId} builds={builds} onRefresh={load} />}
      {tab === 'tdd' && <p className="text-gray-400 text-sm">TDD flags on sim user stories require a sim.user_stories table (future migration).</p>}
    </div>
  )
}

function SimPair({ projectId, pairs, onRefresh }) {
  const [driver, setDriver] = useState('')
  const [nav, setNav] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    await createPairSession({
      practice_project_id: projectId,
      driver_user_id: driver,
      navigator_user_id: nav,
      session_date: new Date().toISOString().slice(0, 10),
    })
    toast.success('Logged')
    onRefresh()
  }
  return (
    <div>
      <form onSubmit={submit} className="space-y-2 max-w-md mb-4">
        <input placeholder="Driver user id" value={driver} onChange={(e) => setDriver(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <input placeholder="Navigator user id" value={nav} onChange={(e) => setNav(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Log
        </button>
      </form>
      <ul className="text-sm space-y-1">
        {pairs.map((p) => (
          <li key={p.id} className="border border-gray-800 rounded p-2">
            {p.session_date}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SimRev({ projectId, reviews, onRefresh }) {
  const [a, setA] = useState('')
  const [r, setR] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    await saveCodeReview({
      practice_project_id: projectId,
      author_user_id: a,
      reviewer_user_id: r,
      review_date: new Date().toISOString().slice(0, 10),
      status: 'pending',
    })
    toast.success('Added')
    onRefresh()
  }
  return (
    <div>
      <form onSubmit={submit} className="space-y-2 max-w-md mb-4">
        <input placeholder="Author" value={a} onChange={(e) => setA(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <input placeholder="Reviewer" value={r} onChange={(e) => setR(e.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Add
        </button>
      </form>
      <ul className="text-sm">
        {reviews.map((x) => (
          <li key={x.id} className="border border-gray-800 rounded p-2">
            {x.review_date} {x.status}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SimCi({ projectId, builds, onRefresh }) {
  const submit = async (e) => {
    e.preventDefault()
    await createCIBuild({ practice_project_id: projectId, status: 'passing', build_date: new Date().toISOString() })
    toast.success('Logged')
    onRefresh()
  }
  return (
    <div>
      <form onSubmit={submit} className="mb-4">
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Log passing build
        </button>
      </form>
      <ul className="text-sm">
        {builds.map((b) => (
          <li key={b.id} className="border border-gray-800 rounded p-2">
            {b.build_date} {b.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
