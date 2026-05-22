/**
 * Assessment Matrix drafts on hold – Platform
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { EntityHoldQueue } from '../../components/ui/EntityHoldQueue'

export default function StakeholdersAssessmentMatrixOnHold() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/platform/stakeholders/assessment-matrix"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Assessments On Hold</h1>
              <p className="text-gray-400 mt-1">Resume saved assessment matrix drafts</p>
            </div>
          </div>
          <Link
            to="/platform/stakeholders/assessment-matrix"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            New assessment
          </Link>
        </div>
        <EntityHoldQueue
          entityType="stakeholder_assessment_matrix"
          showSearch
          showFilters
          showLimitMeter
        />
      </div>
    </div>
  )
}
