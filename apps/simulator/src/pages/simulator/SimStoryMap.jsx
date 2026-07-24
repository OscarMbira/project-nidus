import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listStoryMapItems, saveStoryMapItem, softDeleteStoryMapItem } from '../../services/simStoryMapService'

export default function SimStoryMap() {
  const { projectId } = useParams()
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [type, setType] = useState('journey')

  const load = async () => setItems(await listStoryMapItems(projectId))

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [projectId])

  const add = async () => {
    if (!title.trim()) return
    await saveStoryMapItem({
      practice_project_id: projectId,
      item_type: type,
      title: title.trim(),
      col_order: 0,
      row_order: 0,
    })
    toast.success('Added')
    setTitle('')
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Story map (sim)</h1>
      <div className="flex gap-2 mb-6">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm">
          <option value="journey">Journey</option>
          <option value="activity">Activity</option>
          <option value="story">Story</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm flex-1" />
        <button type="button" onClick={add} className="px-3 py-1 rounded bg-blue-600 text-sm">
          Add
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between border border-gray-800 rounded p-2">
            <span>
              [{i.item_type}] {i.title}
            </span>
            <button type="button" className="text-red-400" onClick={() => softDeleteStoryMapItem(i.id).then(load)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
