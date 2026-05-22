import { Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { EntityHoldQueue } from '../../components/ui/EntityHoldQueue'

export default function PracticeStakeholdersAssessmentMatrixOnHold() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/simulator/practice-stakeholders/assessment-matrix"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Practice Assessments On Hold</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Resume assessment matrix drafts</p>
          </div>
        </div>
        <Link
          to="/simulator/practice-stakeholders/assessment-matrix"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" /> New assessment
        </Link>
      </div>
      <EntityHoldQueue
        entityType="practice_stakeholder_assessment_matrix"
        showSearch
        showFilters
        showLimitMeter
      />
    </div>
  )
}
