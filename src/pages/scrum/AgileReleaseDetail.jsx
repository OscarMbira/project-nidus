import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { getRelease, listReleaseStories, linkStoryToRelease } from '../../services/agileReleaseService'
import { supabase } from '../../services/supabaseClient'

export default function AgileReleaseDetail() {
  const { releaseId } = useParams()
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [rel, setRel] = useState(null)
  const [stories, setStories] = useState([])
  const [backlog, setBacklog] = useState([])
  const [pick, setPick] = useState('')

  useEffect(() => {
    if (!releaseId) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await getRelease(releaseId)
        if (!cancelled) setRel(r)
        const rs = await listReleaseStories(releaseId)
        if (!cancelled) setStories(rs)
      } catch (e) {
        toast.error(e?.message || 'Failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [releaseId])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('user_stories')
        .select('id, story_title, story_points, status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      if (error || cancelled) return
      setBacklog(data || [])
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const link = async () => {
    if (!pick) return
    try {
      await linkStoryToRelease(releaseId, pick)
      toast.success('Story linked to release')
      const rs = await listReleaseStories(releaseId)
      setStories(rs)
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  const totalPts = stories.reduce((s, x) => s + (Number(x.user_stories?.story_points) || 0), 0)
  const donePts = stories
    .filter((x) => x.user_stories?.status === 'done')
    .reduce((s, x) => s + (Number(x.user_stories?.story_points) || 0), 0)

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
      <h1 className="text-2xl font-bold text-white mb-2">{rel?.release_name || 'Release'}</h1>
      <p className="text-gray-400 text-sm mb-4">{rel?.release_goal}</p>
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-lg">
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs text-gray-500">Points done / total</div>
          <div className="text-xl font-semibold">
            {donePts} / {totalPts}
          </div>
        </div>
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs text-gray-500">Stories</div>
          <div className="text-xl font-semibold">{stories.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm">
          <option value="">Link story from backlog…</option>
          {backlog.map((b) => (
            <option key={b.id} value={b.id}>
              {b.story_title} ({b.story_points ?? 0} pts)
            </option>
          ))}
        </select>
        <button type="button" onClick={link} className="px-3 py-1 rounded bg-blue-600 text-sm">
          Link
        </button>
      </div>

      <ul className="space-y-2">
        {stories.map((x) => (
          <li key={x.id} className="rounded border border-gray-800 p-3 text-sm">
            {x.user_stories?.story_title || x.user_story_id}
          </li>
        ))}
      </ul>
    </div>
  )
}
