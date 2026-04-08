import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { listEEFs } from '../../../services/sim/simEEFService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'

export default function SimEEFOnHold() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      if (!id) return
      const { data } = await listEEFs(id, { onHoldOnly: true })
      setRows(data || [])
    })()
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/simulator/eef" className="inline-flex items-center gap-2 text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> All
      </Link>
      <h1 className="text-xl font-bold text-white mb-4">EEF on hold</h1>
      <ul className="divide-y divide-gray-700 rounded-lg border border-gray-700 bg-gray-800">
        {rows.map((r) => (
          <li key={r.id} className="p-4 flex justify-between">
            <button type="button" className="text-left text-white" onClick={() => navigate(`/simulator/eef/${r.id}/edit`)}>
              {r.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
