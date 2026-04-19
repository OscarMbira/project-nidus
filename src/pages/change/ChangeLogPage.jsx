import { ArrowLeft, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ChangeLog from '../../components/change/ChangeLog'

export default function ChangeLogPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Change Request Log
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Immutable audit trail of all Change Request (CR) lifecycle events across projects, programmes and portfolios
            </p>
          </div>
        </div>
      </div>

      <ChangeLog />
    </div>
  )
}
