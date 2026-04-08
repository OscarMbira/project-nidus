import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { deleteEEF, getEEFById } from '../../../services/sim/simEEFService'

export default function SimEEFDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await getEEFById(id)
      if (error) setErr(error.message)
      setRow(data)
    })()
  }, [id])

  const del = async () => {
    if (!window.confirm('Delete?')) return
    const { error } = await deleteEEF(id)
    if (error) alert(error.message)
    else navigate('/simulator/eef')
  }

  if (err || !row) return <div className="p-8 text-gray-600">{err || 'Loading…'}</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/simulator/eef" className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.title}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(`/simulator/eef/${id}/edit`)} className="px-4 py-2 rounded-lg border border-gray-600">
            <Pencil className="h-4 w-4 inline" /> Edit
          </button>
          <button type="button" onClick={del} className="px-4 py-2 rounded-lg border border-red-500 text-red-400">
            <Trash2 className="h-4 w-4 inline" />
          </button>
        </div>
      </div>
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{row.description || '—'}</p>
    </div>
  )
}
