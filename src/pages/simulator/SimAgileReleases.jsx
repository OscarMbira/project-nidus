import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listReleases, saveRelease } from '../../services/simAgileReleaseService'

export default function SimAgileReleases() {
  const { projectId } = useParams()
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')

  const load = async () => setRows(await listReleases(projectId))

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [projectId])

  const create = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await saveRelease({
      practice_project_id: projectId,
      release_name: name.trim(),
      release_status: 'planned',
    })
    toast.success('Created')
    setName('')
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Releases (sim)</h1>
      <form onSubmit={create} className="flex gap-2 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm flex-1" />
        <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-sm">
          Add
        </button>
      </form>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="border border-gray-800 rounded p-3 flex justify-between">
            <span>{r.release_name}</span>
            <Link to={`/simulator/practice-projects/${projectId}/scrum/releases/${r.id}`} className="text-blue-400 text-sm">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
