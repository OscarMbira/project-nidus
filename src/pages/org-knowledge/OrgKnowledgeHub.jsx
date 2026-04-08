import { Link } from 'react-router-dom'
import { BookOpen, Globe, Library } from 'lucide-react'

export default function OrgKnowledgeHub() {
  const card =
    'block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[120px]'
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-10 w-10 text-sky-500" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Org Knowledge</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Capture environmental factors and organisational process assets for your organisation.
          </p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/platform/eef" className={card}>
          <Globe className="h-8 w-8 text-sky-500 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Environment Factors (EEF)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Conditions and forces that influence the work (culture, regulation, market, infrastructure).
          </p>
        </Link>
        <Link to="/platform/opa" className={card}>
          <Library className="h-8 w-8 text-sky-500 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Process Assets (OPA)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Templates, policies, procedures, standards, and historical knowledge.
          </p>
        </Link>
      </div>
    </div>
  )
}
