import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getOPAById, updateOPA } from '../../../services/sim/simOPAService'

export default function SimOPAEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data } = await getOPAById(id)
      if (data) setTitle(data.title || '')
    })()
  }, [id])

  const save = async () => {
    const { error } = await updateOPA(id, { title })
    if (error) alert(error.message)
    else navigate(`/simulator/opa/${id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h1 className="text-xl font-bold text-white">Edit OPA</h1>
      <input className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="button" onClick={save} className="px-4 py-2 bg-sky-600 text-white rounded-lg">
        Save
      </button>
    </div>
  )
}
