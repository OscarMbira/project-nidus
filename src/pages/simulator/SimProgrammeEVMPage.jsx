import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
export default function SimProgrammeEVMPage() {
  const { programmeId } = useParams()
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <Link to={`/simulator/practice-programme/${programmeId}`} className="inline-flex items-center gap-2 text-sm text-blue-400">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold mt-4">Practice programme EVM</h1>
      <p className="text-sm text-gray-400 mt-2">Roll-up from practice projects in this programme — mirror of Platform ProgrammeEVMPage using sim tables.</p>
    </div>
  )
}
