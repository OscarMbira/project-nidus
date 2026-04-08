import { Link, useParams } from 'react-router-dom'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'

export default function ExtractedRiskEnrich() {
  const { id } = useParams()
  const basePath = `${useAppRoutePrefix()}/comms`
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enrich risk</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Extraction record <span className="font-mono">{id}</span>. Complete fields in the Risk Register for AI-tagged drafts.
      </p>
      <Link to={`${basePath}/pending-review`} className="text-cyan-600 text-sm">
        ← Pending AI reviews
      </Link>
    </div>
  )
}
