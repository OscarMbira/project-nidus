import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export default function AutoDefectAlert({ defect, defectDetailBasePath = '/platform/testing/defects' }) {
  if (!defect?.id) return null
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-amber-100">
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-sm">A defect was created for this failed test.</p>
        <p className="text-xs text-amber-200/80 mt-1">
          {defect.defect_ref ? `${defect.defect_ref}: ` : ''}
          {defect.title}
        </p>
        <Link
          to={`${defectDetailBasePath.replace(/\/$/, '')}/${defect.id}`}
          className="inline-block mt-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Open defect →
        </Link>
      </div>
    </div>
  )
}
