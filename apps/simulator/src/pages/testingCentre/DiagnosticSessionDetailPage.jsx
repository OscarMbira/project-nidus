import { useParams } from 'react-router-dom'
export default function DiagnosticSessionDetailPage() {
  const { id } = useParams()
  return <div className="p-6 min-h-screen bg-gray-950 text-gray-100">Diagnostic {id}</div>
}
