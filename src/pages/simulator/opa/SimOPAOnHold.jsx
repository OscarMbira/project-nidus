import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listOPAs } from '../../../services/sim/simOPAService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'

export default function SimOPAOnHold() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      if (!id) return
      const { data } = await listOPAs(id, { onHoldOnly: true })
      setRows(data || [])
    })()
  }, [])
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/simulator/opa" className="text-gray-400 mb-4 inline-block">
        Back
      </Link>
      <ul className="divide-y divide-gray-700 border border-gray-700 rounded-lg">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <button type="button" className="text-white" onClick={() => navigate(`/simulator/opa/${r.id}/edit`)}>
              {r.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
