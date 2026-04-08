import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOPA, listOPACategories, listSimulationRunsForPicker } from '../../../services/sim/simOPAService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'

export default function SimOPACreate() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [cats, setCats] = useState([])
  const [runs, setRuns] = useState([])
  const [title, setTitle] = useState('')
  const [category_id, setCategory_id] = useState('')
  const [opa_type, setOpa_type] = useState('template')
  const [related_simulation_run_id, setRun] = useState('')

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      setAccountId(id)
      if (id) {
        const c = await listOPACategories(id)
        setCats(c.data || [])
      }
      const r = await listSimulationRunsForPicker()
      setRuns(r.data || [])
    })()
  }, [])

  const save = async () => {
    if (!accountId || !title.trim()) return
    const { data, error } = await createOPA({
      organisation_id: accountId,
      title: title.trim(),
      description: null,
      category_id: category_id || null,
      opa_type,
      version: null,
      status: 'draft',
      tags: [],
      related_simulation_run_id: related_simulation_run_id || null,
      notes: null,
      is_on_hold: false,
      on_hold_reason: null,
    })
    if (error) alert(error.message)
    else navigate(`/simulator/opa/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">New OPA</h1>
      <input className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" value={category_id} onChange={(e) => setCategory_id(e.target.value)}>
        <option value="">Category</option>
        {cats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" value={related_simulation_run_id} onChange={(e) => setRun(e.target.value)}>
        <option value="">Simulation run</option>
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id.slice(0, 8)}
          </option>
        ))}
      </select>
      <button type="button" onClick={save} className="px-4 py-2 bg-sky-600 text-white rounded-lg">
        Create
      </button>
    </div>
  )
}
