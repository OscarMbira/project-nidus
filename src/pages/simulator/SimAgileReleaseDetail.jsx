import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getRelease, listReleaseStories } from '../../services/simAgileReleaseService'

export default function SimAgileReleaseDetail() {
  const { projectId, releaseId } = useParams()
  const [rel, setRel] = useState(null)
  const [stories, setStories] = useState([])

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const r = await getRelease(releaseId)
        if (!c) setRel(r)
        const s = await listReleaseStories(releaseId)
        if (!c) setStories(s)
      } catch (e) {
        toast.error(e?.message)
      }
    })()
    return () => {
      c = true
    }
  }, [releaseId])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}/scrum/releases`} className="text-sm text-blue-400">
        ← Releases
      </Link>
      <h1 className="text-xl font-bold mt-4">{rel?.release_name || 'Release'}</h1>
      <p className="text-gray-400 text-sm mb-4">{stories.length} linked stories (IDs)</p>
      <ul className="text-sm space-y-1">
        {stories.map((x) => (
          <li key={x.id} className="font-mono text-xs">
            {x.user_story_id}
          </li>
        ))}
      </ul>
    </div>
  )
}
