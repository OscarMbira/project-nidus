import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listKaizenItems, saveKaizenItem } from '../../services/leanKaizenService'

const STATUSES = ['identified', 'in_progress', 'implemented', 'rejected']

export default function KaizenBoard() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [waste, setWaste] = useState('waiting')

  const load = async () => {
    if (!projectId) return
    try {
      setItems(await listKaizenItems(projectId))
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const add = async () => {
    if (!title.trim() || !projectId) return
    try {
      await saveKaizenItem({
        project_id: projectId,
        title: title.trim(),
        waste_type: waste,
        status: 'identified',
        impact: 'medium',
      })
      toast.success('Kaizen item created')
      setTitle('')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  const move = async (row, status) => {
    try {
      await saveKaizenItem({ ...row, status })
      toast.success(`Moved to ${status}`)
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-4">Kaizen board</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Improvement idea"
          className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm flex-1 min-w-[200px]"
        />
        <select value={waste} onChange={(e) => setWaste(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm">
          {['waiting', 'defects', 'motion', 'overprocessing', 'inventory', 'transport', 'overproduction', 'unused_talent'].map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <button type="button" onClick={add} className="px-3 py-1 rounded bg-blue-600 text-sm">
          Add
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STATUSES.map((st) => (
          <div key={st} className="rounded-xl border border-gray-800 bg-gray-900 p-3 min-h-[240px]">
            <h2 className="text-sm font-semibold text-gray-400 mb-2 capitalize">{st.replace('_', ' ')}</h2>
            <ul className="space-y-2">
              {items
                .filter((i) => i.status === st)
                .map((i) => (
                  <li key={i.id} className="rounded border border-gray-800 p-2 text-sm">
                    <div>{i.title}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {STATUSES.filter((s) => s !== st).map((s) => (
                        <button key={s} type="button" className="text-[10px] text-blue-400" onClick={() => move(i, s)}>
                          →{s}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
