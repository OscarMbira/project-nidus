import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listKaizenItems, saveKaizenItem } from '../../services/simLeanKaizenService'

export default function SimKaizenBoard() {
  const { projectId } = useParams()
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')

  const load = async () => setItems(await listKaizenItems(projectId))

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [projectId])

  const add = async () => {
    if (!title.trim()) return
    await saveKaizenItem({
      practice_project_id: projectId,
      title: title.trim(),
      waste_type: 'waiting',
      status: 'identified',
      impact: 'medium',
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
      <h1 className="text-xl font-bold mt-4 mb-4">Kaizen (sim)</h1>
      <div className="flex gap-2 mb-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm flex-1" />
        <button type="button" onClick={add} className="px-3 py-1 rounded bg-blue-600 text-sm">
          Add
        </button>
      </div>
      <ul className="text-sm space-y-2">
        {items.map((i) => (
          <li key={i.id} className="border border-gray-800 rounded p-2">
            {i.title} — {i.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
