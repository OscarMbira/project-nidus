import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function DiagnosticSessionCreatePage() {
  const navigate = useNavigate()
  return (
    <div className="p-6 min-h-screen bg-gray-950 text-gray-100">
      <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-4 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      New diagnostic session (wizard)
    </div>
  )
}
