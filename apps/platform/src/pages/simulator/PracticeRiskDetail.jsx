/**
 * Practice Risk Detail Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { getPracticeRiskById } from '../../services/sim/practiceRiskService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'
import CustomFieldRenderer from '../../features/local-data-extensions/components/CustomFieldRenderer'
import { buildCustomFieldExportParts } from '../../features/local-data-extensions/utils/exportMerge'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { resolveLdeAccountForCurrentUser } from '../../features/local-data-extensions/utils/bootstrapLdeAccount'

const PRACTICE_RISK_VIEW_SECTIONS = [
  { title: 'Risk', fields: [
    { key: 'risk_title', label: 'Title' },
    { key: 'risk_level', label: 'Level' },
    { key: 'risk_score', label: 'Score' }
  ]}
]

async function buildPracticeRiskExport(riskRow, accountId) {
  const base = riskRow
  const pid = riskRow?.practice_project_id
  if (!simDb || !accountId || !pid || !riskRow?.id) {
    return { sections: PRACTICE_RISK_VIEW_SECTIONS, record: base }
  }
  try {
    const { section, mergedRecord } = await buildCustomFieldExportParts(
      simDb,
      accountId,
      'risk',
      riskRow.id,
      undefined,
      pid
    )
    const sections = section ? [...PRACTICE_RISK_VIEW_SECTIONS, section] : PRACTICE_RISK_VIEW_SECTIONS
    return { sections, record: { ...base, ...mergedRecord } }
  } catch {
    return { sections: PRACTICE_RISK_VIEW_SECTIONS, record: base }
  }
}

export default function PracticeRiskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ldeAccountId, setLdeAccountId] = useState(null)

  useEffect(() => {
    let cancelled = false
    resolveLdeAccountForCurrentUser().then(({ accountId: aid }) => {
      if (!cancelled) setLdeAccountId(aid)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (id) loadRisk()
  }, [id])

  const loadRisk = async () => {
    try {
      setLoading(true)
      const result = await getPracticeRiskById(id)
      if (result.success) setRisk(result.data)
    } catch (error) {
      console.error('Error loading risk:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!risk) return <div className="text-center py-12">Risk not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-risk-register?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{risk.risk_title}</h1>
        <div className="flex gap-2">
          <ExportRecordButtons
            onExportPPT={async () => {
              const { sections, record } = await buildPracticeRiskExport(risk, ldeAccountId)
              exportRecordToPPT(sections, record, `PracticeRisk_${risk.risk_reference || id}`)
            }}
            onExportWord={async () => {
              const { sections, record } = await buildPracticeRiskExport(risk, ldeAccountId)
              exportRecordToWord(sections, record, `PracticeRisk_${risk.risk_reference || id}`)
            }}
            onExportExcel={async () => {
              const { sections, record } = await buildPracticeRiskExport(risk, ldeAccountId)
              exportRecordToExcel(sections, record, `PracticeRisk_${risk.risk_reference || id}`)
            }}
            onExportCSV={async () => {
              const { sections, record } = await buildPracticeRiskExport(risk, ldeAccountId)
              exportRecordToCSV(sections, record, `PracticeRisk_${risk.risk_reference || id}`)
            }}
            onExportXML={async () => {
              const { sections, record } = await buildPracticeRiskExport(risk, ldeAccountId)
              exportRecordToXML(sections, record, `PracticeRisk_${risk.risk_reference || id}`)
            }}
            onExportJSON={async () => {
              const { sections, record } = await buildPracticeRiskExport(risk, ldeAccountId)
              exportRecordToJSON(sections, record, `PracticeRisk_${risk.risk_reference || id}`)
            }}
            onExportPrint={async () => {
              const { sections, record } = await buildPracticeRiskExport(risk, ldeAccountId)
              exportRecordToPrint(sections, record, `PracticeRisk_${risk.risk_reference || id}`)
            }}
          />
          <button onClick={() => navigate(`/simulator/practice-risk-register/${id}/edit?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 border rounded-lg">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-gray-600 dark:text-gray-400">{risk.risk_description || 'No description'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Risk Level</h4>
            <p className="text-gray-900 dark:text-white">{risk.risk_level}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Risk Score</h4>
            <p className="text-gray-900 dark:text-white">{risk.risk_score}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Probability</h4>
            <p className="text-gray-900 dark:text-white">{risk.probability}/5</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Impact</h4>
            <p className="text-gray-900 dark:text-white">{risk.impact}/5</p>
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-2">Response Strategy</h3>
          <p className="text-gray-600 dark:text-gray-400">{risk.response_strategy || 'Not defined'}</p>
        </div>
        <CustomFieldRenderer
          platformDb={simDb}
          userLookupDb={platformDb}
          accountId={ldeAccountId}
          practiceProjectId={risk.practice_project_id}
          entityType="risk"
          entityId={risk.id}
          screenCode="risk_detail"
        />
      </div>
    </div>
  )
}
