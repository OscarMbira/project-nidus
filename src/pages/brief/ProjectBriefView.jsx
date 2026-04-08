/**
 * Project Brief View Page
 * Read-only view of a project brief
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Printer } from 'lucide-react'
import { getBriefById } from '../../services/projectBriefService'
import BriefHeader from '../../components/brief/BriefHeader'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const BRIEF_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'brief_reference', label: 'Reference' },
    { key: 'document_ref', label: 'Document Ref' },
    { key: 'version_number', label: 'Version' },
    { key: 'document_status', label: 'Status' },
    { key: 'created_date', label: 'Created' }
  ]},
  { title: 'Background', fields: [{ key: 'background', label: 'Background' }] },
  { title: 'Objectives', fields: [{ key: 'project_objectives', label: 'Project Objectives' }] },
  { title: 'Scope', fields: [
    { key: 'project_scope', label: 'Project Scope' },
    { key: 'scope_exclusions', label: 'Scope Exclusions' }
  ]},
  { title: 'Business Case', fields: [
    { key: 'outline_business_case_summary', label: 'Outline Business Case Summary' },
    { key: 'business_option_selected', label: 'Business Option Selected' }
  ]}
]
import ProjectBriefForm from '../../components/brief/ProjectBriefForm'
import BriefApprovals from '../../components/brief/BriefApprovals'
import BriefRevisionHistory from '../../components/brief/BriefRevisionHistory'
import BriefDistribution from '../../components/brief/BriefDistribution'
import BriefPrintView from '../../components/brief/BriefPrintView'
import QualityCriteriaChecklist from '../../components/brief/QualityCriteriaChecklist'
import MandateComparisonView from '../../components/brief/MandateComparisonView'

export default function ProjectBriefView() {
  const { briefId } = useParams()
  const navigate = useNavigate()
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBrief()
  }, [briefId])

  const loadBrief = async () => {
    try {
      setLoading(true)
      const data = await getBriefById(briefId)
      setBrief(data)
    } catch (err) {
      console.error('Error loading brief:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading brief...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Brief not found</p>
        </div>
      </div>
    )
  }

  const canEdit = brief.document_status === 'draft' || brief.document_status === 'rejected'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Actions */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex flex-wrap gap-2 items-center">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(BRIEF_EXPORT_SECTIONS, brief, `Brief_${brief.brief_reference || brief.id}`)}
            onExportWord={() => exportRecordToWord(BRIEF_EXPORT_SECTIONS, brief, `Brief_${brief.brief_reference || brief.id}`)}
            onExportExcel={() => exportRecordToExcel(BRIEF_EXPORT_SECTIONS, brief, `Brief_${brief.brief_reference || brief.id}`)}
            onExportCSV={() => exportRecordToCSV(BRIEF_EXPORT_SECTIONS, brief, `Brief_${brief.brief_reference || brief.id}`)}
            onExportXML={() => exportRecordToXML(BRIEF_EXPORT_SECTIONS, brief, `Brief_${brief.brief_reference || brief.id}`)}
            onExportJSON={() => exportRecordToJSON(BRIEF_EXPORT_SECTIONS, brief, `Brief_${brief.brief_reference || brief.id}`)}
            onExportPrint={() => exportRecordToPrint(BRIEF_EXPORT_SECTIONS, brief, `Brief_${brief.brief_reference || brief.id}`)}
          />
          {canEdit && (
            <button
              onClick={() => navigate(`/platform/projects/${brief.project_id}/brief/edit`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Brief Header */}
      <BriefHeader brief={brief} project={brief.project} mandate={brief.mandate} />

      {/* Brief Form (Read-only) */}
      <ProjectBriefForm
        formData={brief}
        onChange={() => {}}
        readOnly={true}
      />

      {/* Quality Criteria */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <QualityCriteriaChecklist briefId={brief.id} />
      </div>

      {/* Mandate Comparison */}
      {brief.mandate_id && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <MandateComparisonView briefId={brief.id} mandateId={brief.mandate_id} />
        </div>
      )}

      {/* Approvals Section */}
      {brief.document_status === 'under_review' || brief.document_status === 'approved' ? (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <BriefApprovals briefId={brief.id} readOnly={true} />
        </div>
      ) : null}

      {/* Revision History */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <BriefRevisionHistory briefId={brief.id} />
      </div>

      {/* Distribution List */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <BriefDistribution briefId={brief.id} readOnly={true} />
      </div>

      {/* Print View */}
      <div className="mt-6 no-print">
        <BriefPrintView brief={brief} project={brief.project} mandate={brief.mandate} />
      </div>
    </div>
  )
}
