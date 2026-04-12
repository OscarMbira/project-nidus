import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listStoryMapItems, saveStoryMapItem, softDeleteStoryMapItem } from '../../services/storyMapService'

export default function StoryMap() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('journey')

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const rows = await listStoryMapItems(projectId)
      setItems(rows)
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const add = async () => {
    if (!projectId || !title.trim()) return
    try {
      await saveStoryMapItem({
        project_id: projectId,
        item_type: type,
        parent_id: null,
        title: title.trim(),
        col_order: items.filter((i) => i.item_type === 'journey').length,
        row_order: 0,
      })
      toast.success('Story map item created')
      setTitle('')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  const remove = async (id) => {
    try {
      await softDeleteStoryMapItem(id)
      toast.success('Removed')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  if (pidLoading || loading) {
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
      <h1 className="text-2xl font-bold text-white mb-2">Story map</h1>
      <p className="text-gray-400 text-sm mb-6">Journeys, activities, and linked stories (backlog).</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm">
          <option value="journey">Journey</option>
          <option value="activity">Activity</option>
          <option value="story">Story node</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm flex-1 min-w-[200px]"
        />
        <button type="button" onClick={add} className="px-3 py-1 rounded bg-blue-600 text-sm">
          Add
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['journey', 'activity', 'story'].map((col) => (
          <div key={col} className="rounded-xl border border-gray-800 bg-gray-900 p-3 min-h-[200px]">
            <h2 className="text-sm font-semibold text-gray-400 mb-2 capitalize">{col}s</h2>
            <ul className="space-y-2">
              {items
                .filter((i) => i.item_type === col)
                .map((i) => (
                  <li key={i.id} className="flex justify-between gap-2 rounded border border-gray-800 p-2 text-sm">
                    <span>{i.title}</span>
                    <button type="button" className="text-red-400 text-xs" onClick={() => remove(i.id)}>
                      ✕
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
