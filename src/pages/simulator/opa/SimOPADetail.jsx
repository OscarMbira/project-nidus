import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getOPAById, deleteOPA } from '../../../services/sim/simOPAService'

export default function SimOPADetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await getOPAById(id)
      setRow(data)
    })()
  }, [id])

  if (!row) return <div className="p-8">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/simulator/opa" className="text-gray-400 mb-4 inline-block">
        Back
      </Link>
      <h1 className="text-2xl font-bold text-white mb-4">{row.title}</h1>
      <button type="button" onClick={() => navigate(`/simulator/opa/${id}/edit`)} className="mr-2 px-4 py-2 border rounded-lg">
        Edit
      </button>
      <button
        type="button"
        onClick={async () => {
          if (!window.confirm('Delete?')) return
          const { error } = await deleteOPA(id)
          if (!error) navigate('/simulator/opa')
        }}
        className="px-4 py-2 border border-red-500 text-red-400 rounded-lg"
      >
        Delete
      </button>
    </div>
  )
}
