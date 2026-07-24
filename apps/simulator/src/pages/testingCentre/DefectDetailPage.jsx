import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDefectById } from '../../services/defectService'

export default function DefectDetailPage() {
  const { id } = useParams()
  const [d, setD] = useState(null)
  useEffect(() => {
    getDefectById(id).then(setD).catch(() => setD(null))
  }, [id])
  if (!d) return <div className="p-6 text-gray-100">Loading…</div>
  return (
    <div className="p-6 min-h-screen bg-gray-950 text-gray-100 max-w-3xl mx-auto">
      <h1 className="text-xl">{d.defect_ref}</h1>
      <p className="text-sm text-gray-400 mb-4">{d.title}</p>
    </div>
  )
}
