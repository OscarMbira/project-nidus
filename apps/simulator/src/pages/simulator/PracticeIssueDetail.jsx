/**
 * Practice Issue Detail Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { getPracticeIssueById } from '../../services/sim/practiceIssueService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'
import CustomFieldRenderer from '../../features/local-data-extensions/components/CustomFieldRenderer'
import { buildCustomFieldExportParts } from '../../features/local-data-extensions/utils/exportMerge'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { resolveLdeAccountForCurrentUser } from '../../features/local-data-extensions/utils/bootstrapLdeAccount'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const PRACTICE_ISSUE_VIEW_SECTIONS = [
  { title: 'Issue', fields: [
    { key: 'issue_title', label: 'Title' },
    { key: 'issue_reference', label: 'Reference' },
    { key: 'priority', label: 'Priority' }
  ]}
]

async function buildPracticeIssueExport(issueRow, accountId) {
  const base = issueRow
  const pid = issueRow?.practice_project_id
  if (!simDb || !accountId || !pid || !issueRow?.id) {
    return { sections: PRACTICE_ISSUE_VIEW_SECTIONS, record: base }
  }
  try {
    const { section, mergedRecord } = await buildCustomFieldExportParts(
      simDb,
      accountId,
      'issue',
      issueRow.id,
      undefined,
      pid
    )
    const sections = section ? [...PRACTICE_ISSUE_VIEW_SECTIONS, section] : PRACTICE_ISSUE_VIEW_SECTIONS
    return { sections, record: { ...base, ...mergedRecord } }
  } catch {
    return { sections: PRACTICE_ISSUE_VIEW_SECTIONS, record: base }
  }
}

export default function PracticeIssueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ldeAccountId, setLdeAccountId] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeTab !== 'audit' || !issue) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [issue.created_by, issue.updated_by])
      setAuditUserLabels(labels || {})
    })()
  }, [activeTab, issue])

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
    if (id) loadIssue()
  }, [id])

  const loadIssue = async () => {
    try {
      setLoading(true)
      const result = await getPracticeIssueById(id)
      if (result.success) setIssue(result.data)
    } catch (error) {
      console.error('Error loading issue:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!issue) return <div className="text-center py-12">Issue not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-issue-register?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{issue.issue_title}</h1>
        <div className="flex gap-2">
          <ExportRecordButtons
            onExportPPT={async () => {
              const { sections, record } = await buildPracticeIssueExport(issue, ldeAccountId)
              exportRecordToPPT(sections, record, `PracticeIssue_${issue.issue_reference || id}`)
            }}
            onExportWord={async () => {
              const { sections, record } = await buildPracticeIssueExport(issue, ldeAccountId)
              exportRecordToWord(sections, record, `PracticeIssue_${issue.issue_reference || id}`)
            }}
            onExportExcel={async () => {
              const { sections, record } = await buildPracticeIssueExport(issue, ldeAccountId)
              exportRecordToExcel(sections, record, `PracticeIssue_${issue.issue_reference || id}`)
            }}
            onExportCSV={async () => {
              const { sections, record } = await buildPracticeIssueExport(issue, ldeAccountId)
              exportRecordToCSV(sections, record, `PracticeIssue_${issue.issue_reference || id}`)
            }}
            onExportXML={async () => {
              const { sections, record } = await buildPracticeIssueExport(issue, ldeAccountId)
              exportRecordToXML(sections, record, `PracticeIssue_${issue.issue_reference || id}`)
            }}
            onExportJSON={async () => {
              const { sections, record } = await buildPracticeIssueExport(issue, ldeAccountId)
              exportRecordToJSON(sections, record, `PracticeIssue_${issue.issue_reference || id}`)
            }}
            onExportPrint={async () => {
              const { sections, record } = await buildPracticeIssueExport(issue, ldeAccountId)
              exportRecordToPrint(sections, record, `PracticeIssue_${issue.issue_reference || id}`)
            }}
          />
          <RowActionButton
            variant="edit"
            label="Edit issue"
            onClick={() => navigate(`/simulator/practice-issue-register/${id}/edit?projectId=${projectId}`)}
          />
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who created or changed this issue.">
          <AuditCard title="Identity" description="How this issue is labelled.">
            <AuditField label="Title" value={issue.issue_title} />
            <AuditField label="Reference" value={issue.issue_reference} />
          </AuditCard>
          <AuditCard title="Classification" description="How this issue is categorised.">
            <AuditField label="Type" value={humanizeAuditToken(issue.issue_type)} />
            <AuditField label="Priority" value={humanizeAuditToken(issue.priority)} />
            <AuditField label="Severity" value={humanizeAuditToken(issue.severity)} />
            <AuditField label="Status" value={humanizeAuditToken(issue.status)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this issue was created and last changed.">
            <AuditField label="Created by" value={issue.created_by ? auditUserLabels[issue.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={issue.created_at} />
            <AuditField label="Updated by" value={issue.updated_by ? auditUserLabels[issue.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={issue.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-gray-600 dark:text-gray-400">{issue.issue_description || 'No description'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</h4>
            <p className="text-gray-900 dark:text-white">{issue.priority}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Severity</h4>
            <p className="text-gray-900 dark:text-white">{issue.severity}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
            <p className="text-gray-900 dark:text-white">{issue.status}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</h4>
            <p className="text-gray-900 dark:text-white">{issue.issue_type}</p>
          </div>
        </div>
        <CustomFieldRenderer
          platformDb={simDb}
          userLookupDb={platformDb}
          accountId={ldeAccountId}
          practiceProjectId={issue.practice_project_id}
          entityType="issue"
          entityId={issue.id}
          screenCode="issue_detail"
        />
      </div>
      )}
    </div>
  )
}
